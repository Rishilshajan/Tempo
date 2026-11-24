import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Frontend source only: dependencies, generated Convex files and build output
// are not application UI modules and are not part of this size contract.
async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(file));
    else if (/\.(?:ts|tsx|css)$/.test(file)) files.push(file);
  }
  return files;
}

const files = await sourceFiles("src");
const oversized = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  const lines = source.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n").length;
  if (lines >= 500) oversized.push(`${file}: ${lines} lines`);
}
assert.deepEqual(oversized, [], `UI source files must remain below 500 lines:\n${oversized.join("\n")}`);

// These existing sections must remain query-free. Their owners provide data
// and actions, so desktop/mobile composition cannot accidentally double fetch.
for (const file of [
  "day-command-center.tsx", "day-heading.tsx", "day-focus.tsx",
  "day-task-panel.tsx", "day-task-row.tsx", "day-timeline.tsx",
]) {
  const source = await readFile(path.join("src/components/today", file), "utf8");
  assert.doesNotMatch(source, /\b(?:useQuery|usePaginatedQuery|useMutation)\s*\(/, `${file} must receive data/actions from its owner`);
}
for (const file of [
  "my-tasks-board.tsx", "board-cards.tsx", "my-tasks-calendar.tsx",
  "task-metadata-pills.tsx",
]) {
  const source = await readFile(path.join("src/components/tasks", file), "utf8");
  assert.match(source, /TEMPO-004/, `${file} must identify its My Tasks ownership`);
  assert.doesNotMatch(source, /\b(?:useQuery|usePaginatedQuery|useMutation)\s*\(/, `${file} must receive data/actions from its owner`);
}
console.log(`PASS: ${files.length} frontend source files are below 500 lines; Today and My Tasks sections share their data/action owners.`);
