import "server-only";
import webpush from "web-push";
import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { pushSubscriptions, notificationLog } from "@/db/schema";
import { getAppSettings, getTasks, todayISO } from "@/server/queries";
import { buildBriefing } from "@/server/briefing";
import { log } from "@/lib/logger";

let vapidReady = false;

/** Configure web-push once; throws if the VAPID env is missing. */
function ensureVapid() {
  if (vapidReady) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:developer@levich.co";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not set (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
}

/** Current HH:MM in the app timezone - matched against settings.alertTimes. */
function nowHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: process.env.APP_TIMEZONE || undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export type NotifyResult = { sent: number; slot: string | null; reason: string };

/**
 * Decide whether an alert is due this minute and, if so, push today's briefing
 * to every subscribed device. Idempotent: the slot is claimed in
 * notification_log first, so overlapping cron ticks can't double-send.
 * `force` bypasses the schedule + dedup - used by the Settings "send test".
 */
export async function runNotify(opts: { force?: boolean } = {}): Promise<NotifyResult> {
  ensureVapid();

  const today = todayISO();
  const hhmm = nowHHMM();
  const settings = await getAppSettings();
  const alertTimes = settings.alertTimes ?? [];

  if (!opts.force && !alertTimes.includes(hhmm)) {
    return { sent: 0, slot: null, reason: `no alert due at ${hhmm}` };
  }

  const slot = `${today}|${hhmm}`;

  // Claim the slot once (unique constraint = send-once). Skip for test sends.
  if (!opts.force) {
    try {
      await db.insert(notificationLog).values({ slot });
    } catch {
      return { sent: 0, slot, reason: "already sent this slot" };
    }
  }

  // Build the message from the same deterministic briefing the UI shows.
  const all = await getTasks();
  const todays = all.filter((t) => t.date === today);
  const briefing = buildBriefing(todays, {
    productivityWindow: settings.productivityWindow,
  });
  const body = opts.force
    ? "Test notification from Tempo - you're all set."
    : briefing.summary +
      (briefing.warnings[0] ? `\n⚠ ${briefing.warnings[0]}` : "");
  const payload = JSON.stringify({
    title: `Tempo - ${briefing.windowLabel}`,
    body,
    url: "/today",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });

  const subs = await db.select().from(pushSubscriptions);
  const dead: string[] = [];
  let sent = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        dead.push(s.endpoint); // subscription expired - prune it
      } else {
        log.error("web-push send failed", code, err instanceof Error ? err.message : err);
      }
    }
  }

  if (dead.length) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.endpoint, dead));
    log.info("Pruned expired push subscriptions", dead.length);
  }

  log.success("Notify run complete", { sent, slot, pruned: dead.length });
  return { sent, slot, reason: `sent to ${sent} device(s)` };
}
