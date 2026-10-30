import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TodayWorkspace } from "@/components/today/today-workspace";
import { isClerkConfigured } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Today · Tempo" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  if (!isClerkConfigured()) redirect("/login");
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  const parameters = await searchParams;
  return (
    <TodayWorkspace
      todayLabel={todayLabel}
      initialView={parameters.view === "all" ? "all" : "today"}
    />
  );
}
