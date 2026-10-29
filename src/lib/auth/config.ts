/** Only server components and the proxy may read the secret-key configuration. */
export function isClerkConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!publishableKey || !secretKey) return false;

  const issuer = process.env.CLERK_FRONTEND_API_URL?.trim();
  if (!issuer) return true;

  // A publishable key encodes its public Clerk domain. Keep the form and
  // Convex on the same instance rather than creating accounts in another app.
  if (!/^pk_(test|live)_/.test(publishableKey)) return false;
  try {
    const domain = Buffer.from(
      publishableKey.replace(/^pk_(test|live)_/, ""),
      "base64",
    ).toString("utf8").replace(/\$$/, "");
    return domain.toLowerCase() === new URL(issuer).host.toLowerCase();
  } catch {
    return false;
  }
}
