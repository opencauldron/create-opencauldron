#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import readline from "node:readline";

const REPO = "https://github.com/opencauldron/opencauldron.git";
const DEFAULT_DIR = "opencauldron";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((r) => rl.question(question, (a) => { rl.close(); r(a.trim()); }));
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}

function detectPM() {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("bun")) return "bun";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  // Check if bun is available
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {
    return "npm";
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log();
  console.log("  \x1b[35m\x1b[1mOpenCauldron\x1b[0m — AI media generation studio");
  console.log();

  // 1. Project directory
  const argDir = process.argv[2];
  const dir = argDir && argDir !== "." ? argDir : await ask(`  Project directory: (${DEFAULT_DIR}) `) || DEFAULT_DIR;
  const target = resolve(dir);

  if (existsSync(target)) {
    const files = readFileSync("/dev/null", "utf8"); // dummy
    // Check if directory is non-empty
    try {
      const entries = execSync(`ls -A "${target}"`, { encoding: "utf8" }).trim();
      if (entries) {
        console.log(`\n  \x1b[31mError:\x1b[0m Directory "${dir}" is not empty.\n`);
        process.exit(1);
      }
    } catch { /* empty dir is fine */ }
  }

  // 2. Clone
  console.log(`\n  Cloning into \x1b[36m${dir}\x1b[0m...`);
  run(`git clone --depth 1 ${REPO} "${target}"`);

  // Remove .git so they start fresh
  run(`rm -rf "${join(target, ".git")}"`);

  // 3. Create .env.local from template
  const envExample = join(target, ".env.example");
  const envLocal = join(target, ".env.local");

  if (existsSync(envExample)) {
    let env = readFileSync(envExample, "utf8");

    // Generate a NEXTAUTH_SECRET automatically
    const secret = randomBytes(32).toString("base64");
    env = env.replace(
      'NEXTAUTH_SECRET=""',
      `NEXTAUTH_SECRET="${secret}"`
    );

    writeFileSync(envLocal, env);
    console.log("  Created \x1b[36m.env.local\x1b[0m with generated NEXTAUTH_SECRET");
  }

  // 4. Install dependencies
  const pm = detectPM();
  console.log(`\n  Installing dependencies with \x1b[36m${pm}\x1b[0m...`);
  run(`${pm} install`, { cwd: target });

  // 5. Init fresh git repo
  run("git init", { cwd: target, stdio: "ignore" });
  run("git add -A", { cwd: target, stdio: "ignore" });
  run('git commit -m "Initial commit from create-opencauldron"', { cwd: target, stdio: "ignore" });

  // 6. Done
  console.log();
  console.log("  \x1b[32m\x1b[1mDone!\x1b[0m Your Cauldron is ready.\n");
  console.log("  Next steps:\n");
  console.log(`    \x1b[36mcd ${dir}\x1b[0m`);
  console.log(`    \x1b[90m# Edit .env.local with your Google OAuth + API keys\x1b[0m`);
  console.log(`    \x1b[36mdocker compose up db -d\x1b[0m     \x1b[90m# start Postgres\x1b[0m`);
  console.log(`    \x1b[36m${pm} run db:push\x1b[0m             \x1b[90m# create tables\x1b[0m`);
  console.log(`    \x1b[36m${pm} run dev\x1b[0m                 \x1b[90m# start dev server\x1b[0m`);
  console.log();
  console.log("  Docs: \x1b[4mhttps://github.com/opencauldron/opencauldron\x1b[0m\n");
}

main().catch((err) => {
  console.error(`\n  \x1b[31mError:\x1b[0m ${err.message}\n`);
  process.exit(1);
});
