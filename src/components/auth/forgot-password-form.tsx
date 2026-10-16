"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/server/auth-actions";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email.");
      return;
    }
    startTransition(async () => {
      await requestPasswordReset(parsed.data);
      setSent(true);
      toast.success("If that email is registered, a reset link is on its way.");
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-secondary/60 p-5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MailCheck className="size-5" />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Check <span className="font-medium text-foreground">{email}</span> for a
          link to reset your password. It may take a minute to arrive.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="h-11 rounded-xl pl-10 text-[15px]"
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
        Send reset link
      </Button>
    </form>
  );
}
