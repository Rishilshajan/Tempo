import type { Metadata, Viewport } from "next";
import { inter } from "@/lib/fonts";
import "./globals.css";
import { AppToaster } from "@/components/app/app-toaster";
import { ServiceWorkerCleanup } from "@/components/app/service-worker-cleanup";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Tempo — Your work, in rhythm.",
  description:
    "Every task, every commitment, every domain. One place to keep it all moving.",
  applicationName: "Tempo",
  appleWebApp: {
    capable: true,
    title: "Tempo",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#4C9A78",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {isClerkConfigured() ? (
          <ClerkProvider
            signInUrl="/login"
            signUpUrl="/signup"
            signInForceRedirectUrl="/dashboard"
            signUpForceRedirectUrl="/dashboard"
            afterSignOutUrl="/"
            localization={{
              formFieldLabel__firstName: "Name",
              signIn: { start: { title: "Welcome back to Tempo", subtitle: "Sign in to your personal command center and manage your work." } },
              signUp: { start: { title: "Create your Tempo account", subtitle: "One place for your tasks, commitments, and domains." } },
            }}
          >
            {children}
          </ClerkProvider>
        ) : children}
        <AppToaster />
        <ServiceWorkerCleanup />
      </body>
    </html>
  );
}
