import { Suspense } from "react";

import { Sidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/app-header";
import { MobileNav } from "@/components/app/mobile-nav";
import { getDomains, getTaskCounts, todayLabel } from "@/server/queries";
import { getInAppNotifications } from "@/server/notifications-feed";
import { requireUser } from "@/server/auth";

// These routes read live, per-request data from Supabase - never prerender them.
export const dynamic = "force-dynamic";

async function DynamicSidebar() {
  const [user, domains, counts] = await Promise.all([
    requireUser(),
    getDomains(),
    getTaskCounts(),
  ]);
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined);
  return (
    <Sidebar
      domains={domains}
      counts={counts}
      userName={name}
      userEmail={user.email ?? undefined}
    />
  );
}

async function DynamicHeader() {
  const notifications = await getInAppNotifications();
  return <AppHeader today={todayLabel()} notifications={notifications} />;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <aside
            aria-hidden="true"
            className="fixed left-0 top-0 z-50 hidden h-full w-64 animate-pulse border-r border-sidebar-border bg-sidebar lg:block"
          />
        }
      >
        <DynamicSidebar />
      </Suspense>
      <div className="lg:pl-64">
        <Suspense
          fallback={
            <header
              aria-hidden="true"
              className="fixed left-0 right-0 top-0 z-40 h-16 animate-pulse border-b border-border bg-card/80 lg:left-64"
            />
          }
        >
          <DynamicHeader />
        </Suspense>
        <main className="px-4 pb-28 pt-20 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
