import assert from "node:assert/strict";
import { build } from "esbuild";
const result = await build({
  entryPoints: ["src/lib/overlay-history.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { OverlayHistory } = await import(
  "data:text/javascript;base64," +
    Buffer.from(result.outputFiles[0].text).toString("base64")
);
function setup() {
  let i = 0;
  const entries = [
      {
        state: { __NA: true, tree: "preserved" },
        url: "https://tempo.test/dashboard",
      },
    ],
    events = [];
  const browser = {
    location: { href: entries[0].url },
    addEventListener: (name, fn) => events.push(fn),
    history: {
      get state() {
        return entries[i].state;
      },
      pushState(state, _, url) {
        entries.splice(++i);
        entries.push({ state, url });
        browser.location.href = url;
      },
      back() {
        queueMicrotask(() => {
          if (i === 0) return;
          i--;
          browser.location.href = entries[i].url;
          events.forEach((fn) => fn());
        });
      },
    },
  };
  return {
    browser,
    controller: new OverlayHistory(browser),
    entries,
    index: () => i,
  };
}
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
{
  const t = setup();
  let closed = 0;
  const release = t.controller.register("task", () => {
    closed++;
    return true;
  });
  assert.equal(t.index(), 1);
  assert.equal(t.browser.history.state.tree, "preserved");
  t.browser.history.back();
  await flush();
  assert.equal(closed, 1);
  assert.equal(t.index(), 0);
  release();
  await flush();
  assert.equal(t.index(), 0);
  t.controller.register("task", () => {
    closed++;
    return true;
  });
  assert.equal(t.index(), 1);
  t.browser.history.back();
  await flush();
  assert.equal(closed, 2);
}
{
  const t = setup();
  const calls = [];
  const parent = t.controller.register("details", () => {
    calls.push("details");
    return true;
  });
  t.controller.register("edit", () => {
    calls.push("edit");
    return true;
  });
  t.browser.history.back();
  await flush();
  assert.deepEqual(calls, ["edit"]);
  assert.equal(t.index(), 1);
  t.browser.history.back();
  await flush();
  assert.deepEqual(calls, ["edit", "details"]);
  parent();
}
{
  const t = setup();
  const release = t.controller.register("strict", () => true);
  release();
  t.controller.register("strict", () => true);
  await flush();
  assert.equal(t.index(), 1);
  assert.equal(t.entries.length, 2);
}
{
  const t = setup();
  const release = t.controller.register("more", () => true);
  release();
  let closed = 0;
  t.controller.register("domain", () => {
    closed++;
    return true;
  });
  await flush();
  t.browser.history.back();
  await flush();
  assert.equal(closed, 1);
  assert.equal(t.index(), 0);
}
{
  const t = setup();
  let blocked = true;
  t.controller.register("saving", () => !blocked);
  t.browser.history.back();
  await flush();
  assert.equal(t.index(), 1);
  blocked = false;
  t.browser.history.back();
  await flush();
  assert.equal(t.index(), 0);
}
{
  const t = setup();
  const release = t.controller.register("drawer", () => true);
  t.browser.history.pushState(
    { __NA: true },
    "",
    "https://tempo.test/settings",
  );
  release();
  await flush();
  assert.equal(t.browser.location.href, "https://tempo.test/settings");
  assert.equal(t.index(), 2);
}
console.log(
  "Overlay Back checks passed: nesting, repeated opens, explicit close, Strict Mode, sheet transitions, save guards, and route navigation.",
);
