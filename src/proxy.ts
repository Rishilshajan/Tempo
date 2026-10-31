import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isClerkConfigured } from "@/lib/auth/config";

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Public pages remain usable before credentials are supplied. The dashboard
  // also checks configuration and auth at its own resource boundary.
  if (!isClerkConfigured()) return NextResponse.next();
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
