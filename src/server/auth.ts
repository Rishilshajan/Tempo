import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Minimal verified identity, read from the signed JWT claims. */
export type SessionUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
};

/**
 * Data Access Layer for identity. The single source of the verified userId
 * that scopes every per-user query and mutation.
 *
 * Uses `getClaims()`: it verifies the access-token JWT **locally** against the
 * project's asymmetric signing keys (no network round-trip), so the identity is
 * trustworthy on the server. Token refresh is handled upstream in proxy.ts.
 * Wrapped in React `cache` so one render pass verifies at most once.
 */
export const getOptionalUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    user_metadata:
      (claims.user_metadata as Record<string, unknown> | undefined) ?? {},
  };
});

/**
 * Require a signed-in user or bounce to /login. Call this at the top of every
 * protected query, Server Action and Route Handler - treat Server Actions as
 * public endpoints that must authorize themselves.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
});

/** Convenience: just the verified user id for scoping Drizzle queries. */
export async function requireUserId(): Promise<string> {
  return (await requireUser()).id;
}
