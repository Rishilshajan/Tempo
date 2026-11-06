"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";

const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function PushDelivery() {
  const serverReady = useQuery(api.notifications.pushReady, {});
  const devices = useQuery(api.notifications.pushDevices, {});
  const register = useMutation(api.notifications.registerPush);
  const unregister = useMutation(api.notifications.unregisterPush);
  const sendTest = useMutation(api.notifications.sendTestPush);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState("Checking this device…");
  const [busy, setBusy] = useState(false);
  const [testState, setTestState] = useState<"sending" | "cooldown" | null>(null);
  const enabled = Boolean(subscription && devices?.some((device) => device.endpoint === subscription.endpoint));

  useEffect(() => {
    async function prepare() {
      if (serverReady === undefined) return;
      if (!vapidKey || !serverReady) {
        setMessage("Push delivery hasn’t been configured for this deployment.");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setMessage("Push is unavailable here. On iPhone and iPad, open Tempo from your Home Screen.");
        return;
      }
      try {
        const worker = await navigator.serviceWorker.register("/tempo-push-sw.js", { scope: "/tempo-push/" });
        setSubscription(await worker.pushManager.getSubscription());
        if (worker.active) {
          setRegistration(worker);
        } else {
          const installing = worker.installing ?? worker.waiting;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "activated") setRegistration(worker);
            if (installing.state === "redundant") setMessage("This device couldn’t start the push service.");
          });
        }
        setMessage("");
      } catch {
        setMessage("This device couldn’t start the push service.");
      }
    }
    void prepare();
  }, [serverReady]);

  async function toggle() {
    if (!registration || !vapidKey) return;
    setBusy(true);
    try {
      if (enabled && subscription) {
        await unregister({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
        setSubscription(null);
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(permission === "denied" ? "Notifications are blocked. Allow them in your browser or device settings." : "Notification permission is required.");
        return;
      }
      const current = subscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      setSubscription(current);
      const { keys } = current.toJSON();
      if (!keys?.p256dh || !keys.auth) throw new Error("Missing subscription keys");
      await register({
        endpoint: current.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        platform: /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "mobile" : "desktop",
      });
      setMessage("");
    } catch {
      toast.error("Could not update push delivery. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function testNotification(endpoint: string) {
    const requestId = crypto.randomUUID();
    setTestState("sending");
    let timeout: number | undefined;
    let onMessage: ((event: MessageEvent) => void) | undefined;
    try {
      const shown = new Promise<boolean>((resolve) => {
        onMessage = ({ data }) => {
          if (data?.type === "tempo-test-push-shown" && data.tag === `test:${requestId}`)
            resolve(true);
        };
        navigator.serviceWorker.addEventListener("message", onMessage);
        timeout = window.setTimeout(() => resolve(false), 20_000);
      });
      const wait = await sendTest({ endpoint, requestId });
      if (wait === 0) {
        if (await shown) toast.success("Test notification displayed.");
        else toast.error("This browser didn’t confirm the test notification.");
      }
      setTestState("cooldown");
      await new Promise(resolve => window.setTimeout(resolve, wait || 5000));
    } catch {
      toast.error("Could not send a test notification. Try again.");
    } finally {
      if (onMessage) navigator.serviceWorker.removeEventListener("message", onMessage);
      window.clearTimeout(timeout);
      setTestState(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="font-medium">Device notifications</p>
        <p className="text-xs text-muted-foreground">{message || (enabled ? "Enabled on this device" : "Allow Tempo to send reminders on this device.")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
      {enabled && subscription && serverReady && (
        <Button size="sm" variant="outline" disabled={busy || testState !== null}
          onClick={() => void testNotification(subscription.endpoint)}>
          {testState === "sending" ? "Waiting for notification…" :
            testState === "cooldown" ? "Please wait…" : "Send test notification"}
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={!serverReady || !registration || devices === undefined || busy} onClick={() => void toggle()}>
        {enabled ? "Disable on this device" : "Enable notifications"}
      </Button>
      </div>
    </div>
  );
}
