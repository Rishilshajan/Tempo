import { DomainManager } from "@/components/domains/domain-manager";
import { Preferences } from "@/components/settings/preferences";
import { NotificationToggle } from "@/components/settings/notification-toggle";
import { getDomains, getAppSettings } from "@/server/queries";

export default async function SettingsPage() {
  const [domains, settings] = await Promise.all([
    getDomains(),
    getAppSettings(),
  ]);

  return (
    <div className="w-full space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        Settings
      </h1>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Preferences settings={settings} />
        <NotificationToggle />
        <DomainManager domains={domains} />
      </div>
    </div>
  );
}
