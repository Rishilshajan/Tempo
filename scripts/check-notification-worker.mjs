import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const origin = "https://tempo.example";
const handlers = new Map();
const displayed = [];
const opened = [];
let windows = [];
runInNewContext(readFileSync("public/tempo-push-sw.js", "utf8"), {
  URL,
  self: {
    addEventListener: (name, handler) => handlers.set(name, handler),
    location: { origin },
    registration: {
      showNotification: async (title, options) =>
        displayed.push(structuredClone({ title, ...options })),
    },
    clients: {
      matchAll: async () => windows,
      openWindow: async (url) => opened.push(url),
    },
  },
});

async function dispatch(name, payload) {
  let pending;
  handlers.get(name)({ ...payload, waitUntil: (promise) => (pending = promise) });
  await pending;
}

const taskId = "test&unexpected=1";
await dispatch("push", {
  data: { json: () => ({ title: "Upcoming task", body: "Starts soon", taskId }) },
});
await dispatch("push", { data: { json: () => { throw new SyntaxError(); } } });
await dispatch("push", { data: { json: () => ({ title: 42 }) } });
await dispatch("push", {});
assert.equal(displayed.length, 1);
assert.equal(displayed[0].title, "Upcoming task");
assert.equal(displayed[0].body, "Starts soon");
assert.equal(displayed[0].data.taskId, taskId);

let closed = 0;
const click = (data) =>
  dispatch("notificationclick", {
    notification: { data, close: () => closed++ },
  });
await click(displayed[0].data);
const target = new URL(opened[0]);
assert.equal(target.origin, origin);
assert.equal(target.pathname, "/dashboard");
assert.equal(target.searchParams.get("notificationTask"), taskId);
assert.equal(target.searchParams.size, 1);

let navigated;
let focused = 0;
windows = [{
  url: `${origin}/dashboard?view=all`,
  navigate: async (url) => {
    navigated = url;
    return { focus: async () => focused++ };
  },
}];
await click({});
assert.equal(navigated, `${origin}/dashboard`);
assert.equal(focused, 1);
assert.equal(opened.length, 1);
assert.equal(closed, 2);
console.log("PASS: push payload handling and notification click routing.");
