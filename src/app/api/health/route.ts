import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, domains, tasks } from "@/db/schema";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ok" | "error" = "ok";
  let schema: "ok" | "error" | "not_checked" = "not_checked";

  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    database = "error";
    log.error(
      "Health check database probe failed",
      error instanceof Error ? error.message : error,
    );
  }

  if (database === "ok") {
    try {
      await Promise.all([
        db
          .select({ id: domains.id, sortOrder: domains.sortOrder })
          .from(domains)
          .limit(0),
        db.select({ id: tasks.id }).from(tasks).limit(0),
        db.select({ id: appSettings.id }).from(appSettings).limit(0),
      ]);
      schema = "ok";
    } catch (error) {
      schema = "error";
      log.error(
        "Health check schema probe failed",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const healthy = database === "ok" && schema === "ok";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "error",
      checks: { database, schema },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
