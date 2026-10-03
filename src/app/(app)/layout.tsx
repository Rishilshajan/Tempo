import { Sidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/app-header";
import { MobileNav } from "@/components/app/mobile-nav";
import { getDomains, getTaskCounts, todayLabel } from "@/server/queries";
import { getInAppNotifications } from "@/server/notifications-feed";

// These routes read live, per-request data from Supabase - never prerender them.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [domains, counts, notifications] = await Promise.all([
    getDomains(),
    getTaskCounts(),
    getInAppNotifications(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar domains={domains} counts={counts} />
      <div className="lg:pl-64">
        <AppHeader today={todayLabel()} notifications={notifications} />
        <main className="px-4 pb-28 pt-20 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
