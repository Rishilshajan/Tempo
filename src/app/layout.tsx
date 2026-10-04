import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/app/app-toaster";
import { ServiceWorkerCleanup } from "@/components/app/service-worker-cleanup";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tempo - Your day, orchestrated",
  description:
    "Tempo is an agentic personal task manager that keeps your day in rhythm.",
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
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AppToaster />
        <ServiceWorkerCleanup />
      </body>
    </html>
  );
}
