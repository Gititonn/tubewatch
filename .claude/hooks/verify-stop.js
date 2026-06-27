#!/usr/bin/env node
// Stop hook: enforce "verify before done".
// Runs `tsc --noEmit` ONLY when TypeScript files have uncommitted changes,
// so chat-only turns stay fast. Blocks completion (exit 2) on type errors.
const { execSync } = require("child_process");

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

try {
  const status = sh("git status --porcelain");
  const tsChanged = status
    .split("\n")
    .some((l) => /\.(ts|tsx)$/.test(l.trim()));

  if (!tsChanged) process.exit(0); // nothing to verify — stay efficient

  try {
    sh("npx tsc --noEmit");
    process.exit(0); // types clean
  } catch (e) {
    const out = `${e.stdout || ""}${e.stderr || ""}`.trim();
    console.error(
      "Type check failed (tsc --noEmit). Fix these before finishing:\n\n" + out
    );
    process.exit(2); // block Stop; stderr is fed back to Claude
  }
} catch (e) {
  // Never block on infra errors (e.g. not a git repo). Fail open.
  process.exit(0);
}
