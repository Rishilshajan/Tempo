"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/server/auth-actions";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { PasswordRequirements } from "@/components/auth/password-requirements";

const inputBase = "h-11 rounded-xl pl-10 text-[15px]";
const leftIcon =
  "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    const parsed = resetPasswordSchema.safeParse({ password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your password.");
      return;
    }

    startTransition(async () => {
      const result = await updatePassword(parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Password updated.");
      router.replace("/today");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Lock className={leftIcon} />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
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
        {password.length > 0 && (
          <PasswordRequirements value={password} className="mt-1" />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <div className="relative">
          <Lock className={leftIcon} />
          <Input
            id="confirm"
            name="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={pending}
            className={inputBase}
            required
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl text-[15px] font-semibold"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Update password
      </Button>
    </form>
  );
}
