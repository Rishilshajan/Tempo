import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = { title: "Create an account · Tempo" };

export default function SignupPage() {
  return <AuthPanel mode="sign-up" />;
}
