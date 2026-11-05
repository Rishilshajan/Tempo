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
  },
  returns: v.null(),
  handler: async (ctx, { ownerId, title, body, key, taskId, digestSettings }) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) return null;
    const devices = await ctx.runQuery(internal.notifications.deliveryDevices, {
      ownerId, ...(digestSettings === undefined ? {} : { digestSettings }),
    });
    const payload = JSON.stringify({ title, body, tag: key, taskId });
    await Promise.all(devices.map(async ({ endpoint, auth, p256dh }) => {
      try {
        await webpush.sendNotification({ endpoint, keys: { auth, p256dh } }, payload, {
          vapidDetails: { subject, publicKey, privateKey }, TTL: 3600, timeout: 10_000,
        });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await ctx.runMutation(internal.notifications.expirePush, { ownerId, endpoint, auth });
        } else {
          console.error("Push delivery failed", { status });
        }
      }
    }));
    return null;
  },
});
