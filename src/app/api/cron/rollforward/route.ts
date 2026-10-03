import { NextResponse } from "next/server";

import { rollforwardTasks } from "@/server/rollforward";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = req.headers.get("x-cron-secret") ?? bearer;
  return provided === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    log.warn("Rollforward endpoint: unauthorized request");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const moved = await rollforwardTasks();
    return NextResponse.json({ ok: true, moved });
  } catch (e) {
    log.error("Rollforward endpoint failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "rollforward failed" }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
