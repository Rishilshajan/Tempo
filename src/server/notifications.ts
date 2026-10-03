"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { log } from "@/lib/logger";
import { runNotify } from "@/server/notify";
import type { ActionResult } from "@/server/actions";

/** Shape the browser's PushSubscription.toJSON() produces. */
export type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Store (or refresh) a device's push subscription. Upsert by endpoint. */
export async function savePushSubscription(
  sub: WebPushSubscription,
  userAgent?: string,
): Promise<ActionResult<null>> {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "Invalid subscription" };
  }
  try {
    await db
      .insert(pushSubscriptions)
      .values({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent: userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      });
    log.success("Push subscription saved");
    return { ok: true, data: null };
  } catch (e) {
    log.error("savePushSubscription failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not enable notifications" };
  }
}

/** Remove a subscription when the user turns notifications off. */
export async function deletePushSubscription(
  endpoint: string,
): Promise<ActionResult<null>> {
  try {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    log.success("Push subscription removed");
    return { ok: true, data: null };
  } catch (e) {
    log.error("deletePushSubscription failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not disable notifications" };
  }
}

/** Fire an immediate test push to all subscribed devices (bypasses schedule). */
export async function sendTestNotification(): Promise<ActionResult<number>> {
  try {
    const { sent } = await runNotify({ force: true });
    return { ok: true, data: sent };
  } catch (e) {
    log.error("sendTestNotification failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "Could not send test notification" };
  }
}
