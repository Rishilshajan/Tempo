import { readFileSync } from "node:fs";
import ts from "typescript";

const files = ts.sys.readDirectory(".", [".ts", ".tsx", ".mts", ".cts"], [
  "**/node_modules", "**/.next", "**/_generated", "next-env.d.ts",
]);
let violations = 0;
for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
      console.error(`${file}:${line + 1}:${character + 1} Use a specific type or unknown instead of any.`);
      violations++;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (violations) process.exitCode = 1;
else console.log("PASS: no explicit any in project TypeScript.");
