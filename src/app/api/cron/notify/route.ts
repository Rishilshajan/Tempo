import { NextResponse } from "next/server";
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

function paused(req: Request) {
  if (!authorized(req)) {
    log.warn("Notify endpoint: unauthorized request");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    paused: true,
    reason: "Push notifications are temporarily disabled.",
  });
}

export const POST = paused;
export const GET = paused;
