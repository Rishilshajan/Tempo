import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TodayWorkspace } from "@/components/today/today-workspace";
import { DemoWorkspace } from "@/components/today/demo-workspace";
import { isClerkConfigured } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Today · Tempo" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  if (!isClerkConfigured()) redirect("/login");
  const { userId } = await auth();
  if (!userId) redirect("/login");

  // The browser supplies its local date after mounting; do not assume a server timezone.
  const todayLabel = "Today";

  const parameters = await searchParams;
  if (parameters.demo === "1") return <DemoWorkspace />;
  return (
    <TodayWorkspace
      todayLabel={todayLabel}
      initialView={parameters.view === "all" ? "all" : "today"}
    />
  );
}
