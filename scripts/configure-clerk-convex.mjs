import { existsSync } from "node:fs";

// Load secrets only in this server-side setup process. Never print credentials.
for (const path of [".env.local", ".env"]) {
  if (existsSync(path)) process.loadEnvFile(path);
}

async function main() {
  const secret = process.env.CLERK_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const issuer = process.env.CLERK_FRONTEND_API_URL;
  if (!secret || !publishable || !issuer) {
    throw new Error("Configure the Clerk keys and CLERK_FRONTEND_API_URL before running setup.");
  }

  const encodedDomain = publishable.replace(/^pk_(test|live)_/, "");
  const keyDomain = Buffer.from(encodedDomain, "base64").toString("utf8").replace(/\$$/, "");
  if (keyDomain !== new URL(issuer).host) {
    throw new Error("The Clerk publishable key belongs to a different issuer. Check the application keys.");
  }

  async function clerkRequest(path, options = {}) {
    const response = await fetch(`https://api.clerk.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Clerk setup request failed with HTTP ${response.status}.`);
    return response.json();
  }

  const backendKeys = await clerkRequest("/jwks");
  const issuerResponse = await fetch(`${issuer.replace(/\/$/, "")}/.well-known/jwks.json`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!issuerResponse.ok) throw new Error("Could not verify the Clerk issuer’s public signing keys.");
  const issuerKeys = await issuerResponse.json();
  if (!backendKeys.keys?.some((key) => issuerKeys.keys?.some((candidate) => candidate.kid === key.kid))) {
    throw new Error("The Clerk secret key and issuer belong to different applications.");
  }

  const response = await clerkRequest("/jwt_templates?limit=100");
  const templates = Array.isArray(response) ? response : response.data;
  if (!Array.isArray(templates)) throw new Error("Clerk returned an unexpected template response.");
  const existing = templates.find((template) => template.name === "convex");

  if (existing) {
    const audience = existing.claims?.aud;
    if (audience !== "convex" && !(Array.isArray(audience) && audience.includes("convex"))) {
      throw new Error("The existing convex JWT template has a different audience. Review it before changing it.");
    }
    if (existing.custom_signing_key) {
      throw new Error("The existing convex template uses a custom signing key. Review its verification settings.");
    }
    console.log("Clerk keys verified. Existing convex token template has the correct audience.");
    return;
  }

  if (!process.argv.includes("--apply")) {
    console.log("Clerk keys verified. No convex JWT template found. Enable the native Convex integration or run this script with --apply to create the supported template fallback.");
    return;
  }

  // ConvexProviderWithClerk supports this template if the native integration
  // is not enabled. Only the audience is added; Clerk supplies subject/issuer.
  await clerkRequest("/jwt_templates", {
    method: "POST",
    body: JSON.stringify({ name: "convex", claims: { aud: "convex" } }),
  });
  console.log("Clerk keys verified. Created the convex token template with audience convex.");
}

main().catch((error) => {
  // Do not log SDK objects, request headers, tokens, or full response bodies.
  console.error(error.message);
  process.exitCode = 1;
});
