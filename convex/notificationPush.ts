"use node";

import { v } from "convex/values";
import webpush from "web-push";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const send = internalAction({
  args: {
    ownerId: v.string(), title: v.string(), body: v.string(), key: v.string(),
    taskId: v.optional(v.id("tasks")),
    digestSettings: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    attempt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { ownerId, title, body, key, taskId, digestSettings, endpoint: target, attempt = 0 } = args;
    const expiresAt = args.expiresAt ?? Date.now() + 3_600_000;
    if (expiresAt <= Date.now()) return null;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) return null;
    const devices = await ctx.runQuery(internal.notifications.deliveryDevices, {
      ownerId, taskId, ...(digestSettings === undefined ? {} : { digestSettings }),
    });
    const payload = JSON.stringify({ title, body, tag: key, taskId });
    await Promise.all(devices.filter(device => !target || device.endpoint === target).map(async ({ endpoint, auth, p256dh }) => {
      try {
        await webpush.sendNotification({ endpoint, keys: { auth, p256dh } }, payload, {
          vapidDetails: { subject, publicKey, privateKey },
          TTL: Math.max(0, Math.min(3600, Math.floor((expiresAt - Date.now()) / 1000))),
          timeout: 10_000,
        });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await ctx.runMutation(internal.notifications.expirePush, { ownerId, endpoint, auth });
        } else {
          const delay = 30_000 * 2 ** attempt;
          const retry = attempt < 2 && Date.now() + delay < expiresAt &&
            (status === undefined || status === 429 || status >= 500);
          console.error("Push delivery failed", { status, attempt, retry });
          if (retry) await ctx.scheduler.runAfter(delay, internal.notificationPush.send, {
            ...args, endpoint, expiresAt, attempt: attempt + 1,
          });
        }
      }
    }));
    return null;
  },
});
