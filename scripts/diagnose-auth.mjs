import { existsSync } from "node:fs";

for (const path of [".env.local", ".env"]) {
  if (existsSync(path)) process.loadEnvFile(path);
}

async function main() {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("CLERK_SECRET_KEY is missing.");

  for (const path of ["/instance", "/instance/restrictions", "/instance/protect", "/users/count"]) {
    const response = await fetch(`https://api.clerk.com/v1${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      console.log(JSON.stringify({ endpoint: path, status: response.status }));
      continue;
    }
    const value = await response.json();
    if (path === "/instance") {
      console.log(JSON.stringify({ endpoint: path, environment: value.environment_type, allowedOrigins: value.allowed_origins }));
    } else if (path === "/users/count") {
      console.log(JSON.stringify({ endpoint: path, userCount: value.total_count }));
    } else {
      // Return policy configuration only, never tokens or user records.
      console.log(JSON.stringify({ endpoint: path, settings: value }));
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
