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

## 2. Redeploy so the env takes effect

```bash
vercel --prod
```

## 3. Database migrations

The app uses your existing Supabase database, so all tables already exist.
Only when pointing at a fresh database:

```bash
npm run db:migrate
```

## 4. Schedule the background jobs (Supabase → SQL editor)

Rollforward already runs as a pure-SQL `pg_cron` job (`tempo-rollforward`) — leave it.

Notifications must call the HTTP endpoint (web push needs the Node runtime), so
enable `pg_net` once and schedule `tempo-notify` with your **real** `CRON_SECRET`:

```sql
create extension if not exists pg_net;

select cron.schedule('tempo-notify', '* * * * *', $$
  select net.http_post(
    url     := 'https://tempo.vercel.app/api/cron/notify',
    headers := '{"x-cron-secret":"PASTE_YOUR_CRON_SECRET"}'::jsonb
  );
$$);
```

Runs every minute; only sends when the current minute matches a user alert time.
A unique slot in `notification_log` prevents double-sends.

To inspect or remove jobs later:

```sql
select jobid, jobname, schedule, active from cron.job;
select cron.unschedule('tempo-notify');
```

## 5. Verify

```bash
SECRET="PASTE_YOUR_CRON_SECRET"
curl -s -o /dev/null -w "today: %{http_code}\n"            https://tempo.vercel.app/today
curl -s -o /dev/null -w "manifest: %{http_code}\n"         https://tempo.vercel.app/manifest.webmanifest
curl -s -o /dev/null -w "notify(no secret): %{http_code}\n" -X POST https://tempo.vercel.app/api/cron/notify
curl -s -X POST https://tempo.vercel.app/api/cron/notify -H "x-cron-secret: $SECRET"
```

Expect `200`, `200`, `401`, then `{"ok":true,...}`.

## 6. Install the PWA + enable push

1. Open `https://tempo.vercel.app` on your phone.
2. **iPhone:** Share → *Add to Home Screen*, then launch from the Home Screen
   (iOS only allows web push for an installed PWA, iOS 16.4+).
   **Android:** Chrome → *Install app*.
3. In the app: **Settings → Notifications → Enable**, grant permission,
   tap **Send test**.
4. Add at least one **alert time** in Settings (e.g. `09:00`) — otherwise the
   minute-ly cron correctly sends nothing.
