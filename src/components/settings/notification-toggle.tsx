"use client";

import { Card } from "@/components/ui/card";

export function NotificationToggle() {
  return (
    <Card className="p-5 shadow-sm ring-border">
      <h2 className="text-base font-bold text-foreground">Notifications paused</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Push notifications are temporarily unavailable while we troubleshoot
        the service worker. Your saved alert times are unchanged.
      </p>
    </Card>
  );
}
