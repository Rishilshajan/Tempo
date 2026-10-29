import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TodaySurface } from "@/components/today/today-surface";
import { isClerkConfigured } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Today · Tempo" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isClerkConfigured()) redirect("/login");
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date());

  // UI-only foundation requested for this step. Replace these explicit empty
  // counts with authoritative user totals when task/domain persistence is built.
  return <TodaySurface todayLabel={todayLabel} taskCount={0} domainCount={0} />;
}
