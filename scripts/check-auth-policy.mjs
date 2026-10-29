import { existsSync } from "node:fs";

for (const path of [".env.local", ".env"]) {
  if (existsSync(path)) process.loadEnvFile(path);
}

async function main() {
  const issuer = process.env.CLERK_FRONTEND_API_URL;
  if (!issuer) throw new Error("CLERK_FRONTEND_API_URL is missing.");

  // Clerk exposes this read-only client configuration publicly. No credentials
  // or session tokens are transmitted, and no instance settings are changed.
  const response = await fetch(new URL("/v1/environment", issuer), {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Unable to read Clerk’s public settings (HTTP ${response.status}).`);
  const environment = await response.json();
  const settings = environment.user_settings;
  if (!settings?.attributes || !settings.password_settings) {
    throw new Error("Clerk returned an unexpected environment response.");
  }

  const { attributes, password_settings: password } = settings;
  const checks = {
    nameRequired: Boolean(attributes.first_name?.enabled && attributes.first_name?.required),
    emailRequired: Boolean(attributes.email_address?.enabled && attributes.email_address?.required),
    passwordRequired: Boolean(attributes.password?.enabled && attributes.password?.required),
    minimumEightCharacters: password.min_length >= 8,
    uppercaseRequired: password.require_uppercase === true,
    lowercaseRequired: password.require_lowercase === true,
    numberRequired: password.require_numbers === true,
    specialCharacterRequired: password.require_special_char === true,
  };
  console.log(JSON.stringify(checks, null, 2));
  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error("Some required signup settings are not yet enforced in the selected Clerk application.");
  }
  console.log("Clerk enforces all required signup fields and password rules.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
