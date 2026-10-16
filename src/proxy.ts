import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed Middleware to Proxy. This runs on the Node.js runtime and
// refreshes the Supabase session on every matched request. Keep it optimistic
// (cookie read + redirect only) - see src/lib/supabase/proxy.ts.
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Run on everything EXCEPT:
   * - /api         (route handlers, incl. secret-guarded cron)
   * - _next/static, _next/image  (build assets)
   * - the PWA manifest + static image/icon files
   */
  matcher: [
    "/((?!api|_next/static|_next/image|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
