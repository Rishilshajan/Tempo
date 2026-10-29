import { ConvexClientProvider } from "@/components/providers/convex-client-provider";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return process.env.NEXT_PUBLIC_CONVEX_URL ? (
    <ConvexClientProvider>{children}</ConvexClientProvider>
  ) : children;
}
