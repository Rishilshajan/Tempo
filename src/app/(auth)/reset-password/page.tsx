import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Set new password · Tempo" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password for your account.
        </p>
      </header>

      <ResetPasswordForm />
    </div>
  );
}
