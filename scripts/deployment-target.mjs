export function validateDeploymentTarget(environment, endpoint) {
  const production = "https://colorless-oyster-445.convex.cloud/";
  let url;
  try { url = new URL(endpoint); } catch {
    throw new Error("Convex did not supply a valid deployment URL.");
  }
  if (environment === "production") {
    if (url.href !== production) {
      throw new Error("Wrong Convex target: select a deploy key for Production / colorless-oyster-445 in Vercel.");
    }
  } else if (environment === "preview") {
    if (url.protocol !== "https:" || !url.hostname.endsWith(".convex.cloud") ||
        url.href === production || url.hostname === "giddy-corgi-8.convex.cloud") {
      throw new Error("Preview builds must use an isolated Convex preview deployment.");
    }
  } else {
    throw new Error("Deployment target validation is only for Vercel builds.");
  }
}
