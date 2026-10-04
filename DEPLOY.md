# Deploying Tempo to Vercel

Target URL assumed below: **`https://tempo.vercel.app`**. If that name was taken,
Vercel gives you `tempo-xyz.vercel.app` — substitute it everywhere.

> The URL comes from the **project name**. Rename the project to `tempo` in
> Vercel → Settings → General, or pick the name during `vercel link`.

## 1. Set production environment variables

Generate a strong cron secret (do **not** reuse the dev one):

```bash
openssl rand -hex 32        # copy this value
```

Push DB / timezone / VAPID keys from your local `.env`, then set the secret:

```bash
cd /path/to/Tasks

grep -E '^(DATABASE_URL|APP_TIMEZONE|NEXT_PUBLIC_VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY|VAPID_SUBJECT)=' .env \
| while IFS='=' read -r k v; do v="${v%\"}"; v="${v#\"}"; printf '%s' "$v" | vercel env add "$k" production; done

vercel env add CRON_SECRET production    # paste the openssl value
```

Required in production:

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | Supabase **Session pooler** connection string |
| `APP_TIMEZONE` | **`Asia/Kolkata`** — critical; Vercel runs in UTC, so "today" and rollforward drift a day without it |
| `CRON_SECRET` | strong random value; guards `/api/cron/*` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | web-push public key (exposed to client) |
| `VAPID_PRIVATE_KEY` | web-push private key (server only) |
| `VAPID_SUBJECT` | `mailto:you@domain` |
| `ANTHROPIC_API_KEY` | only needed for the Phase-4 AI layer |

## 2. Apply database migrations

Apply pending migrations to the existing Supabase database before deploying
code changes that depend on them:

```bash
npm run db:migrate
```

## 3. Redeploy so the env and schema changes take effect

```bash
vercel --prod
```

## 4. Schedule the background jobs (Supabase → SQL editor)

Rollforward already runs as a pure-SQL `pg_cron` job (`tempo-rollforward`) — leave it.

Push notifications are temporarily paused; do not schedule `tempo-notify` until
the service worker is re-enabled. The endpoint currently returns a paused
response without querying the database. To stop the existing minute-by-minute
Vercel invocations as well, run this in the Supabase SQL editor:

```sql
select cron.unschedule('tempo-notify');
```

When push notifications are re-enabled, notifications must call the HTTP
endpoint (web push needs the Node runtime), so enable `pg_net` once and schedule
`tempo-notify` with your **real** `CRON_SECRET`:

```sql
create extension if not exists pg_net;

select cron.schedule('tempo-notify', '* * * * *', $$
  select net.http_post(
    url     := 'https://tempo.vercel.app/api/cron/notify',
    headers := '{"x-cron-secret":"PASTE_YOUR_CRON_SECRET"}'::jsonb
  );
$$);
```

When active, this runs every minute; only sends when the current minute matches
a user alert time. A unique slot in `notification_log` prevents double-sends.

To inspect or remove jobs later:

```sql
select jobid, jobname, schedule, active from cron.job;
select cron.unschedule('tempo-notify');
```

## 5. Verify

```bash
SECRET="PASTE_YOUR_CRON_SECRET"
curl -i https://tempo.vercel.app/api/health
curl -s -o /dev/null -w "today: %{http_code}\n"            https://tempo.vercel.app/today
curl -s -o /dev/null -w "manifest: %{http_code}\n"         https://tempo.vercel.app/manifest.webmanifest
curl -s -o /dev/null -w "notify(no secret): %{http_code}\n" -X POST https://tempo.vercel.app/api/cron/notify
curl -s -X POST https://tempo.vercel.app/api/cron/notify -H "x-cron-secret: $SECRET"
```

The health endpoint returns `200` and `{"status":"ok",...}` when the database
and required schema are available, otherwise `503` with the failed check names.
The remaining checks expect `200`, `200`, `401`, then the paused notification
response.

## 6. Install the PWA + enable push

1. Open `https://tempo.vercel.app` on your phone.
2. **iPhone:** Share → *Add to Home Screen*, then launch from the Home Screen
   (iOS only allows web push for an installed PWA, iOS 16.4+).
   **Android:** Chrome → *Install app*.
3. Push notifications are currently paused in the app. When re-enabled, use
   **Settings → Notifications → Enable**, grant permission, and tap **Send test**.
4. Add at least one **alert time** in Settings (e.g. `09:00`) — otherwise the
   minute-by-minute cron correctly sends nothing.
