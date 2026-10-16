import { getOptionalUser } from "@/server/auth";
import { Splash } from "@/components/app/splash";

// Reads the session cookie to decide where to land - always dynamic.
export const dynamic = "force-dynamic";

export default async function ColdStartSplash() {
  const user = await getOptionalUser();
  return <Splash target={user ? "/today" : "/login"} />;
}
