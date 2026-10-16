import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

/**
 * Email link handler for sign-up confirmation and password recovery.
 * Supports both the PKCE `?code=` flow and the `?token_hash=&type=` OTP flow,
 * then redirects to the post-auth destination (recovery -> /reset-password).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/today";

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    log.warn("confirm: exchangeCodeForSession failed", error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const dest = type === "recovery" ? "/reset-password" : next;
      return NextResponse.redirect(new URL(dest, origin));
    }
    log.warn("confirm: verifyOtp failed", error.message);
  }

  return NextResponse.redirect(new URL("/login?error=link_expired", origin));
}
