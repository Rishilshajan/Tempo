/**
 * TEMPO-003 — Authenticated dashboard route; renders the live workspace.
 * Code map: src/components/code-map.md; dashboard contract: src/components/today/README.md.
 */
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TodayWorkspace } from "@/components/today/today-workspace";

import { isClerkConfigured } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Today · Tempo" };
export const dynamic = "force-dynamic";

/**
 * TEMPO-003-F01 — DashboardPage
 * Purpose: Checks Clerk authentication and selects the existing workspace.
 * Used by: Next.js /dashboard route.
 * Trigger: Dashboard request, including view/domain search parameters.
 */
export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  if (!isClerkConfigured()) redirect("/login");
  const { userId } = await auth();
  if (!userId) redirect("/login");

  // The browser supplies its local date after mounting; do not assume a server timezone.
  const todayLabel = "Today";

  const parameters = await searchParams;

  return (
    <TodayWorkspace
      todayLabel={todayLabel}
      initialView={parameters.view === "all" ? "all" : "today"}
      initialDomainId={
        typeof parameters.domain === "string"
          ? (parameters.domain as Id<"domains">)
          : undefined
      }
    />
  );
}

