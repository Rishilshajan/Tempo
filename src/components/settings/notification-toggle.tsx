"use client";

import { useEffect, useState } from "react";
import { BellRing, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  savePushSubscription,
  deletePushSubscription,
  sendTestNotification,
} from "@/server/notifications";
import { log } from "@/lib/logger";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** VAPID keys are base64url; the Push API wants a Uint8Array. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationToggle() {
  const [detect, setDetect] = useState({ supported: false, iosHint: false });
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client feature detection on mount
    setDetect({ supported, iosHint: ios && !standalone });
    if (supported) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setEnabled(!!sub))
        .catch(() => {});
    }
  }, []);

  const enable = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Push is not configured on the server");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission was denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await savePushSubscription(
        JSON.parse(JSON.stringify(sub)),
        navigator.userAgent,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEnabled(true);
      toast.success("Notifications enabled");
    } catch (e) {
      log.error("enable notifications failed", e instanceof Error ? e.message : e);
      toast.error("Could not enable notifications");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await deletePushSubscription(sub.endpoint);
      }
      setEnabled(false);
      toast.success("Notifications disabled");
    } catch (e) {
      log.error("disable notifications failed", e instanceof Error ? e.message : e);
      toast.error("Could not disable notifications");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    const res = await sendTestNotification();
    if (!res.ok) toast.error(res.error);
    else
      toast.success(
        res.data > 0
          ? `Test sent to ${res.data} device${res.data > 1 ? "s" : ""}`
          : "No subscribed devices yet",
      );
  };

  return (
    <Card className="p-5 shadow-sm ring-border">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
          <BellRing className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Notifications</h2>
          <p className="text-xs text-muted-foreground">
            Get your briefing pushed to this device at your alert times.
          </p>
        </div>
      </div>

      {!detect.supported ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Push notifications aren&apos;t supported in this browser.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {enabled ? (
              <>
                <Button variant="outline" onClick={disable} disabled={busy}>
                  Disable notifications
                </Button>
                <Button variant="secondary" onClick={test} disabled={busy}>
                  <Send className="size-4" /> Send test
                </Button>
              </>
            ) : (
              <Button onClick={enable} disabled={busy}>
                <BellRing className="size-4" /> Enable notifications
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`size-2 rounded-full ${enabled ? "bg-ontrack" : "bg-muted-foreground/40"}`}
            />
            {enabled ? "Enabled on this device" : "Not enabled on this device"}
          </div>

          {detect.iosHint && (
            <p className="flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
              <Smartphone className="mt-0.5 size-4 shrink-0 text-primary" />
              On iPhone/iPad, add Tempo to your Home Screen first (Share → Add to
              Home Screen), then enable notifications from the installed app.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
