import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Public routes the proxy never gates: the branded splash, the auth pages,
 * and the email token-exchange handler. Everything else is protected.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Optimistic auth gate + token refresh, run from the root `proxy.ts`.
 *
 * Per the Next.js 16 docs this stays optimistic: it only reads the session
 * cookie and redirects - no database work (it runs on every prefetch). Real
 * authorization lives in the DAL (`requireUser`) next to the data. The call to
 * `getUser()` here also rotates an expiring access token and rewrites the
 * cookies onto the response.
 *
 * IMPORTANT: do not run code between `createServerClient` and `getUser()`, and
 * always return `supabaseResponse` (with its refreshed cookies) unchanged.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Fast path: verify the JWT locally from the cookie (no network round-trip).
  // Only if that fails (token missing/expired) do we call getUser(), which
  // validates against Supabase AND refreshes the session, writing new cookies.
  const { data: claimsData } = await supabase.auth.getClaims();
  let authed = !!claimsData?.claims;
  if (!authed) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authed = !!user;
  }

  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  // Unauthenticated visitor on a protected route -> login.
  if (!authed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already signed in but sitting on an entry auth page -> dashboard.
  if (authed && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
