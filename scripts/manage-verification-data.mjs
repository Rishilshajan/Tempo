// Explicitly authorized, tracked fixtures for giddy-corgi-8. No credentials are written here.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";

const manifestPath = new URL(
  "../.tempo-verification.local.json",
  import.meta.url,
);
const command = process.argv[2];
if (!["seed", "verify", "cleanup"].includes(command))
  throw new Error("Use seed, verify, or cleanup.");
let manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : null;
const save = () =>
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
function run(name, args) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/convex/bin/main.js",
      "run",
      name,
      JSON.stringify({ ...args, ownerId: manifest.ownerId }),
      "--deployment",
      "giddy-corgi-8",
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || result.stdout || "Convex command failed.");
  return JSON.parse(result.stdout);
}
if (command === "seed") {
  if (!manifest) {
    const ownerId = process.argv[3];
    const issuer = "https://noble-ferret-167.clerk.accounts.dev";
    if (!ownerId?.startsWith(`${issuer}|user_`))
      throw new Error("Pass the verified account token identifier.");
    const compiled = await build({
      entryPoints: ["src/lib/validation/recurrence.ts"],
      bundle: true,
      platform: "node",
      format: "esm",
      write: false,
    });
    const { zonedTimestamp } = await import(
      `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
    );
    const today = "2026-10-30",
      tomorrow = "2026-10-31",
      timezone = "Asia/Calcutta";
    const at = (date, time) => zonedTimestamp(date, time, timezone);
    const base = (date, title, extra = {}) => ({
      title: `[Demo] ${title}`,
      description:
        "Temporary verification task for October 30–31. Safe to remove after testing.",
      priority: "medium",
      timezone,
      schedule: { type: "flexible", dueDate: date },
      subtasks: [],
      requestId: randomUUID(),
      ...extra,
    });
    const fixed = (date, start, end) => ({
      type: "fixed",
      startAt: at(date, start),
      endAt: at(date, end),
    });
    const args = {
      today,
      tomorrow,
      timezone,
      domains: [
        {
          name: "[Demo] Product",
          purpose:
            "Temporary classification for the October 30–31 verification batch.",
          color: "teal",
          icon: "layers",
          requestId: randomUUID(),
        },
        {
          name: "[Demo] Personal",
          purpose:
            "Temporary classification for the October 30–31 verification batch.",
          color: "purple",
          icon: "heart",
          requestId: randomUUID(),
        },
      ],
      tasks: [
        base(today, "Design authentication architecture", {
          priority: "high",
          domainIndex: 0,
          schedule: fixed(today, "20:30", "21:30"),
          estimatedMinutes: 60,
          subtasks: [
            { title: "Review token lifecycle", dueDate: today },
            { title: "Document edge cases", dueDate: today },
          ],
        }),
        base(today, "Review homepage wireframes", {
          domainIndex: 0,
          schedule: fixed(today, "20:45", "21:45"),
          estimatedMinutes: 60,
        }),
        base(today, "Product standup", {
          domainIndex: 0,
          schedule: fixed(today, "09:00", "09:30"),
          estimatedMinutes: 30,
          completed: true,
        }),
        base(today, "Submit the benchmark report", {
          domainIndex: 0,
          priority: "urgent",
          estimatedMinutes: 45,
        }),
        base(today, "Plan the weekend", {
          domainIndex: 1,
          priority: "low",
          estimatedMinutes: 15,
        }),
        base(today, "Review meeting notes", {
          domainIndex: 0,
          priority: "low",
          estimatedMinutes: 20,
        }),
        base(today, "Read research notes", { priority: "low" }),
        base(today, "Check the release checklist", {
          domainIndex: 0,
          estimatedMinutes: 15,
          completed: true,
        }),
        base(tomorrow, "Plan the next sprint", {
          domainIndex: 0,
          priority: "high",
          schedule: fixed(tomorrow, "09:30", "10:30"),
          estimatedMinutes: 60,
        }),
        base(tomorrow, "Client design review", {
          domainIndex: 0,
          schedule: fixed(tomorrow, "10:00", "10:45"),
          estimatedMinutes: 45,
        }),
        base(tomorrow, "Prepare the project proposal", {
          domainIndex: 0,
          priority: "urgent",
          estimatedMinutes: 45,
          subtasks: [
            { title: "Draft the scope", dueDate: tomorrow },
            { title: "Review the estimate", dueDate: tomorrow },
          ],
        }),
        base(tomorrow, "Organize personal documents", {
          domainIndex: 1,
          priority: "low",
          estimatedMinutes: 20,
        }),
        base(tomorrow, "Read the planning brief", { priority: "low" }),
      ],
    };
    manifest = {
      deployment: "giddy-corgi-8",
      ownerId,
      args,
      status: "prepared",
      createdAt: new Date().toISOString(),
    };
    save();
  }
  if (manifest.status === "cleaned")
    throw new Error(
      "This tracked batch was already cleaned; do not silently create another one.",
    );
  manifest.references = run("verificationData:seed", manifest.args);
  manifest.status = "seeded";
  save();
  console.log(
    JSON.stringify({
      status: manifest.status,
      today: manifest.args.today,
      tomorrow: manifest.args.tomorrow,
      taskCount: manifest.references.tasks.length,
      domainCount: manifest.references.domains.length,
      manifest: ".tempo-verification.local.json",
    }),
  );
} else {
  if (!manifest) throw new Error("No tracked verification batch exists.");
  const references = run("verificationData:lookup", {
    taskRequests: manifest.args.tasks.map((task) => task.requestId),
    domainRequests: manifest.args.domains.map((domain) => domain.requestId),
  });
  if (command === "verify")
    console.log(
      JSON.stringify({
        status: manifest.status,
        tasksPresent: references.tasks.length,
        domainsPresent: references.domains.length,
        expectedTasks: manifest.args.tasks.length,
      }),
    );
  else {
    let result;
    const totals = {
      deletedTasks:
        manifest.status === "cleanup_in_progress"
          ? (manifest.cleanup?.deletedTasks ?? 0)
          : 0,
      deletedDomains:
        manifest.status === "cleanup_in_progress"
          ? (manifest.cleanup?.deletedDomains ?? 0)
          : 0,
    };
    for (let batch = 0; batch < 100; batch++) {
      result = run("verificationData:cleanup", references);
      totals.deletedTasks += result.deletedTasks;
      totals.deletedDomains += result.deletedDomains;
      manifest.status = "cleanup_in_progress";
      manifest.cleanup = { ...result, ...totals };
      save();
      if (!result.pendingTasks) break;
      if (batch === 99)
        throw new Error(
          "Cleanup is safely checkpointed. Run cleanup again to finish the remaining child records.",
        );
    }
    result = { ...result, ...totals };
    manifest.status = "cleaned";
    manifest.cleanup = result;
    manifest.cleanedAt = new Date().toISOString();
    save();
    console.log(JSON.stringify(result));
  }
}
