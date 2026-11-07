import assert from "node:assert/strict";
import { build } from "esbuild";

const bundled = await build({
  entryPoints: ["src/lib/validation/domain.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { createDomainSchema } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);

const valid = {
  name: "  Client Ventures  ",
  purpose: "  Advisory and delivery.  ",
  color: "green",
  icon: "briefcase",
  requestId: "ea2ff0cf-5af8-43ef-ab9b-eb5314855a58",
};
const parsed = createDomainSchema.parse(valid);
assert.equal(parsed.name, "Client Ventures");
assert.equal(parsed.purpose, "Advisory and delivery.");
assert.ok(
  createDomainSchema.safeParse({ ...valid, purpose: undefined }).success,
);
assert.ok(
  createDomainSchema.safeParse({
    ...valid,
    name: "a".repeat(80),
    purpose: "a".repeat(500),
  }).success,
);
for (const change of [
  { name: "   " },
  { name: "a".repeat(81) },
  { purpose: "a".repeat(501) },
  { color: "not-a-color" },
  { icon: "not-an-icon" },
  { requestId: "not-a-uuid" },
])
  assert.equal(
    createDomainSchema.safeParse({ ...valid, ...change }).success,
    false,
  );
console.log(
  "PASS: shared domain validation, trimming, limits, optional purpose, appearance enums, and submission UUID.",
);
