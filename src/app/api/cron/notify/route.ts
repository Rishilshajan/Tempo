import { NextResponse } from "next/server";

import { runNotify } from "@/server/notify";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // web-push needs the Node runtime

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
    log.warn("Notify endpoint: unauthorized request");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runNotify();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    log.error("Notify endpoint failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "notify failed" }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
