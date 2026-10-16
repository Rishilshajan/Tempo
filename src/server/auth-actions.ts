"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type SignupInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validation/auth";
import { log } from "@/lib/logger";
import type { ActionResult } from "@/server/actions";

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

/** Base URL for email links - prefers an explicit site URL, else the request. */
async function getSiteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/** Turn Supabase's raw auth errors into copy that's safe + helpful to show. */
function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first - check your inbox.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with that email already exists. Try logging in.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  return message || "Something went wrong. Please try again.";
}

/* -------------------------------- login -------------------------------- */

/**
 * Sign in with email + password. On success the session cookies are written
 * and the client redirects immediately. On failure we return a friendly
 * message for the caller to surface as a toast.
 */
export async function login(input: LoginInput): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    log.warn("login failed", error.message);
    return { ok: false, error: mapAuthError(error.message) };
  }

  log.success("login succeeded");
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

/* -------------------------------- signup ------------------------------- */

export type SignupResult = { needsConfirmation: boolean };

/**
 * Create an account. If the project requires email confirmation there is no
 * session yet (`needsConfirmation: true`) and the user must click the link;
 * otherwise a session is set and the client can go straight to the dashboard.
 */
export async function signup(
  input: SignupInput,
): Promise<ActionResult<SignupResult>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getSiteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      // Stored on auth.users.user_metadata; surfaced across the app.
      data: { full_name: parsed.data.name, name: parsed.data.name },
    },
  });

  if (error) {
    log.warn("signup failed", error.message);
    return { ok: false, error: mapAuthError(error.message) };
  }

  // Supabase returns a user with no identities when the email already exists
  // (anti-enumeration). Treat that as "already registered".
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      ok: false,
      error: "An account with that email already exists. Try logging in.",
    };
  }

  const needsConfirmation = !data.session;
  log.success("signup succeeded", { needsConfirmation });
  if (!needsConfirmation) revalidatePath("/", "layout");
  return { ok: true, data: { needsConfirmation } };
}

/* -------------------------------- logout ------------------------------- */

export async function logout(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  log.event("logout");
  revalidatePath("/", "layout");
  redirect("/login");
}

/* ---------------------------- password reset --------------------------- */

/**
 * Email a reset link. Always reports success - we never disclose whether an
 * address is registered.
 */
export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<ActionResult<null>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/confirm?next=/reset-password` },
  );

  if (error) {
    // Log server-side but still return ok to avoid leaking account existence.
    log.warn("requestPasswordReset error (suppressed)", error.message);
  }
  return { ok: true, data: null };
}

/** Set a new password while a recovery session is active. */
export async function updatePassword(
  input: ResetPasswordInput,
): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: firstError(parsed.error.issues) };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    log.warn("updatePassword failed", error.message);
    return { ok: false, error: mapAuthError(error.message) };
  }

  log.success("password updated");
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}
