import assert from "node:assert/strict";
import { validateDeploymentTarget as validate } from "./deployment-target.mjs";
assert.doesNotThrow(() => validate("production", "https://colorless-oyster-445.convex.cloud"));
assert.doesNotThrow(() => validate("preview", "https://example-preview-123.convex.cloud"));
for (const url of [undefined, "invalid", "https://giddy-corgi-8.convex.cloud", "https://other-123.convex.cloud", "https://colorless-oyster-445.convex.cloud/unexpected"]) {
  assert.throws(() => validate("production", url));
}
assert.throws(() => validate("preview", "https://colorless-oyster-445.convex.cloud"));
assert.throws(() => validate("preview", "https://giddy-corgi-8.convex.cloud"));
assert.throws(() => validate("development", "https://colorless-oyster-445.convex.cloud"));
console.log("PASS: resolved production target, isolated previews, wrong deployment and missing URL guards.");
