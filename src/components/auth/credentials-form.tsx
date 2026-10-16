"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, signup } from "@/server/auth-actions";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import { PasswordRequirements } from "@/components/auth/password-requirements";

type Mode = "login" | "signup";

const fieldWrap = "relative";
const leftIcon =
  "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground";
const inputBase = "h-11 rounded-xl pl-10 text-[15px]";

export function CredentialsForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = mode === "signup";
  const cta = isSignup ? "Create account" : "Log in";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Client-side validation first - instant feedback, same rules as the server.
    if (isSignup) {
      const parsed = signupSchema.safeParse({ name, email, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Please check your details.");
        return;
      }
      startTransition(async () => {
        const result = await signup(parsed.data);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (result.data.needsConfirmation) {
          toast.success("Check your email to confirm your account.");
          router.replace("/login");
          return;
        }
        toast.success(`Welcome to Tempo, ${parsed.data.name.split(" ")[0]}.`);
        router.replace("/today");
        router.refresh();
      });
      return;
    }

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    startTransition(async () => {
      const result = await login(parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Welcome back.");
      router.replace("/today");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {isSignup && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <div className={fieldWrap}>
            <User className={`${leftIcon} size-4`} />
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              className={inputBase}
              required
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <div className={fieldWrap}>
          <Mail className={`${leftIcon} size-4`} />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className={inputBase}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {!isSignup && (
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <div className={fieldWrap}>
          <Lock className={`${leftIcon} size-4`} />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            className={`${inputBase} pr-10`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {isSignup && password.length > 0 && (
          <PasswordRequirements value={password} className="mt-1" />
        )}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 h-11 w-full rounded-xl text-[15px] font-semibold"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {cta}
      </Button>
    </form>
  );
}
