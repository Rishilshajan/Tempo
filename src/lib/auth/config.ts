/** Server-only readiness check. Clerk validates credentials; Convex validates its JWT issuer. */
export function isClerkConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!publishableKey || !secretKey) return false;

  const publishableMode = /^pk_(test|live)_\S+$/.exec(publishableKey)?.[1];
  const secretMode = /^sk_(test|live)_\S+$/.exec(secretKey)?.[1];
  // Do not compare a proxy URL or JWT issuer to a decoded key hostname.
  // Production keys can encode app-origin proxy URLs, including a path.
  return !!publishableMode && publishableMode === secretMode;
}
