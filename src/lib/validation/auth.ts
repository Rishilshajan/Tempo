import { z } from "zod";

/** Email must be a well-formed address. */
export const emailSchema = z.email("Enter a valid email address");

/**
 * Password policy (enforced on sign-up and password reset):
 *   >= 8 chars, with at least one uppercase, lowercase, digit and special.
 * Each rule carries its own message so the UI can show exactly what's missing.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number")
  .regex(/[^A-Za-z0-9]/, "Include at least one special character");

/** A person's display name (shown across the app). */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your name")
  .max(60, "Name is too long");

/** Sign-up: name + email + strong-password validation. */
export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/**
 * Login: validate the email shape, but only require a non-empty password.
 * We never reveal policy details on login - Supabase decides if it's correct.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/** Request a reset link. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** Set a new password (recovery session active). */
export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
