import assert from "node:assert/strict";
import { build } from "esbuild";
const result = await build({
  entryPoints: ["convex/domains.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { reorder, remove, clearClassification } = await import(
  "data:text/javascript;base64," +
    Buffer.from(result.outputFiles[0].text).toString("base64")
);
const records = new Map([
  ["a", { _id: "a", ownerId: "owner" }],
  ["b", { _id: "b", ownerId: "owner" }],
  ["other", { _id: "other", ownerId: "foreign" }],
]);
const patches = [],
  scheduled = [];
let batch = [];
const ctx = {
  auth: { getUserIdentity: async () => ({ tokenIdentifier: "owner" }) },
  db: {
    get: async (id) => records.get(id),
    patch: async (id, patch) => patches.push([id, patch]),
    delete: async (id) => records.delete(id),
    query: () => ({ withIndex: () => ({ take: async () => batch }) }),
  },
  scheduler: { runAfter: async (...args) => scheduled.push(args) },
};
await reorder._handler(ctx, { ids: ["b", "a"] });
assert.deepEqual(patches, [
  ["b", { position: 0 }],
  ["a", { position: 1 }],
]);
patches.length = 0;
await assert.rejects(() => reorder._handler(ctx, { ids: ["a", "other"] }));
await assert.rejects(() => reorder._handler(ctx, { ids: ["a", "a"] }));
await assert.rejects(() =>
  reorder._handler(
    { ...ctx, auth: { getUserIdentity: async () => null } },
    { ids: ["a"] },
  ),
);
assert.equal(patches.length, 0);
await remove._handler(ctx, { id: "a" });
assert.equal(records.has("a"), false);
assert.equal(scheduled.length, 1);
batch = Array.from({ length: 100 }, (_, i) => ({ _id: "task" + i }));
await clearClassification._handler(ctx, { id: "a", ownerId: "owner" });
assert.equal(patches.length, 100);
assert.ok(
  patches.every(
    ([, patch]) =>
      Object.keys(patch).length === 1 &&
      "domainId" in patch &&
      patch.domainId === undefined,
  ),
);
assert.equal(scheduled.length, 2);
batch = [];
await clearClassification._handler(ctx, { id: "a", ownerId: "owner" });
assert.equal(scheduled.length, 2);
console.log(
  "Domain settings checks passed: ordering, ownership, duplicate IDs, task preservation, bounded deletion cleanup.",
);
