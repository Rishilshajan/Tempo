import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TodayWorkspace } from "@/components/today/today-workspace";
import { isClerkConfigured } from "@/lib/auth/config";
export const metadata: Metadata = { title: "Settings · Tempo" };
export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  if (!isClerkConfigured()) redirect("/login");
  const { userId } = await auth();
  if (!userId) redirect("/login");
  return <TodayWorkspace todayLabel="Today" initialView="settings" />;
}
