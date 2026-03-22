#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import * as p from "@clack/prompts";
import pc from "picocolors";

const REPO = "https://github.com/opencauldron/opencauldron.git";
const DEFAULT_DIR = "opencauldron";

// ---------------------------------------------------------------------------
// Provider catalog
// ---------------------------------------------------------------------------

const PROVIDERS = [
  {
    group: "Image Models",
    items: [
      { value: "GEMINI_API_KEY", label: "Google Gemini", hint: "Imagen 4, Flash, Flash Lite" },
      { value: "XAI_API_KEY", label: "xAI Grok", hint: "Grok Imagine, Grok Pro" },
      { value: "BFL_API_KEY", label: "Black Forest Labs", hint: "Flux Pro 1.1, Flux Dev" },
      { value: "IDEOGRAM_API_KEY", label: "Ideogram", hint: "Ideogram 3" },
      { value: "RECRAFT_API_KEY", label: "Recraft", hint: "Recraft V3, Recraft 20B" },
    ],
  },
  {
    group: "Video Models",
    items: [
      { value: "GEMINI_API_KEY", label: "Google Veo 3", hint: "uses Gemini key", disabled: true },
      { value: "RUNWAY_API_KEY", label: "Runway", hint: "Gen-4 Turbo" },
      { value: "FAL_KEY", label: "Kling", hint: "Kling 2.1 via fal.ai" },
      { value: "MINIMAX_API_KEY", label: "MiniMax", hint: "Hailuo 2.3" },
      { value: "LUMA_API_KEY", label: "Luma AI", hint: "Ray 2" },
    ],
  },
  {
    group: "Tools",
    items: [
      { value: "MISTRAL_API_KEY", label: "Mistral", hint: "prompt enhancement" },
    ],
  },
];

// Flatten for unique env var keys
const ALL_PROVIDER_ITEMS = PROVIDERS.flatMap((g) => g.items).filter((i) => !i.disabled);
const UNIQUE_KEYS = [...new Set(ALL_PROVIDER_ITEMS.map((i) => i.value))];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "ignore", ...opts });
}

function detectPM() {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("bun")) return "bun";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {
    return "npm";
  }
}

function cancelled() {
  p.cancel("Setup cancelled.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const skipWizard = process.argv.includes("--skip");

  console.log();
  p.intro(`${pc.magenta(pc.bold("✦ OpenCauldron"))}  ${pc.dim("AI media generation studio")}`);

  // ── Step 1: Studio name & directory ─────────────────────────────────

  const argDir = process.argv.find((a) => !a.startsWith("-") && a !== process.argv[0] && a !== process.argv[1]);

  const studioName = skipWizard
    ? argDir || DEFAULT_DIR
    : await p.text({
        message: "What's your studio name?",
        placeholder: DEFAULT_DIR,
        defaultValue: argDir || DEFAULT_DIR,
        validate: (v) => {
          if (!v.trim()) return "Studio name is required";
          if (/[<>:"|?*]/.test(v)) return "Invalid characters in name";
        },
      });

  if (p.isCancel(studioName)) cancelled();

  const dir = String(studioName).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const displayName = String(studioName);
  const target = resolve(dir);

  if (existsSync(target)) {
    try {
      const entries = readdirSync(target);
      if (entries.length > 0) {
        p.cancel(`Directory "${dir}" is not empty.`);
        process.exit(1);
      }
    } catch { /* fine */ }
  }

  // ── Step 2: Database ────────────────────────────────────────────────

  let dbChoice = "docker";
  let neonUrl = "";

  if (!skipWizard) {
    dbChoice = await p.select({
      message: "Database",
      options: [
        { value: "docker", label: "Local Postgres", hint: "docker compose up db -d" },
        { value: "neon", label: "Neon", hint: "serverless Postgres" },
      ],
    });
    if (p.isCancel(dbChoice)) cancelled();

    if (dbChoice === "neon") {
      neonUrl = await p.text({
        message: "Neon connection string",
        placeholder: "postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require",
        validate: (v) => {
          if (!v.includes("neon.tech")) return "Doesn't look like a Neon URL";
        },
      });
      if (p.isCancel(neonUrl)) cancelled();
    }
  }

  // ── Step 3: Storage ─────────────────────────────────────────────────

  let storageChoice = "local";

  if (!skipWizard) {
    storageChoice = await p.select({
      message: "Storage",
      options: [
        { value: "local", label: "Local filesystem", hint: "saves to ./uploads/" },
        { value: "r2", label: "Cloudflare R2", hint: "production storage" },
      ],
    });
    if (p.isCancel(storageChoice)) cancelled();
  }

  let r2Config = {};
  if (storageChoice === "r2") {
    const r2 = await p.group({
      accountId: () => p.text({ message: "R2 Account ID" }),
      accessKeyId: () => p.text({ message: "R2 Access Key ID" }),
      secretAccessKey: () => p.text({ message: "R2 Secret Access Key" }),
      bucketName: () => p.text({ message: "R2 Bucket Name", placeholder: "cauldron", defaultValue: "cauldron" }),
    });
    if (p.isCancel(r2)) cancelled();
    r2Config = r2;
  }

  // ── Step 4: AI Model providers ──────────────────────────────────────

  let selectedKeys = [];
  const apiKeys = {};

  if (!skipWizard) {
    // Build grouped multiselect options
    const allOptions = [];
    for (const group of PROVIDERS) {
      for (const item of group.items) {
        if (item.disabled) continue;
        allOptions.push({
          value: item.value,
          label: `${item.label}  ${pc.dim(item.hint)}`,
        });
      }
    }

    // Show header for each group
    p.note(
      PROVIDERS.map((g) =>
        `${pc.bold(g.group)}\n${g.items.map((i) =>
          `  ${i.disabled ? pc.dim("↳") : "•"} ${i.label} ${pc.dim(`— ${i.hint}`)}`
        ).join("\n")}`
      ).join("\n\n"),
      "Available models"
    );

    selectedKeys = await p.multiselect({
      message: "Which providers do you want to enable?",
      options: [...new Set(ALL_PROVIDER_ITEMS.map((i) => i.value))].map((key) => {
        const items = ALL_PROVIDER_ITEMS.filter((i) => i.value === key);
        const label = items.map((i) => i.label).join(", ");
        const hint = items.map((i) => i.hint).join(", ");
        return { value: key, label, hint: pc.dim(hint) };
      }),
      required: false,
    });

    if (p.isCancel(selectedKeys)) cancelled();

    // Prompt for each selected API key
    for (const key of selectedKeys) {
      const items = ALL_PROVIDER_ITEMS.filter((i) => i.value === key);
      const label = items.map((i) => i.label).join(" / ");

      const value = await p.password({
        message: `${label} API key`,
        validate: (v) => {
          if (!v.trim()) return "API key is required (or go back and deselect this provider)";
        },
      });

      if (p.isCancel(value)) cancelled();
      apiKeys[key] = value;
    }
  }

  // ── Clone & configure ──────────────────────────────────────────────

  const s = p.spinner();

  s.start("Cloning repository");
  run(`git clone --depth 1 ${REPO} "${target}"`);
  run(`rm -rf "${join(target, ".git")}"`);
  s.stop("Cloned repository");

  // Build .env.local
  s.start("Generating configuration");

  const envPath = join(target, ".env.example");
  let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  // Database URL
  const dbUrl = dbChoice === "neon"
    ? neonUrl
    : "postgresql://cauldron:cauldron@localhost:5432/cauldron";
  env = env.replace(
    'DATABASE_URL="postgresql://cauldron:cauldron@localhost:5432/cauldron"',
    `DATABASE_URL="${dbUrl}"`
  );

  // NEXTAUTH_SECRET
  const secret = randomBytes(32).toString("base64");
  env = env.replace('NEXTAUTH_SECRET=""', `NEXTAUTH_SECRET="${secret}"`);

  // Storage
  if (storageChoice === "r2") {
    env = env.replace('STORAGE_PROVIDER="local"', 'STORAGE_PROVIDER="r2"');
    env = env.replace('# R2_ACCOUNT_ID=""', `R2_ACCOUNT_ID="${r2Config.accountId}"`);
    env = env.replace('# R2_ACCESS_KEY_ID=""', `R2_ACCESS_KEY_ID="${r2Config.accessKeyId}"`);
    env = env.replace('# R2_SECRET_ACCESS_KEY=""', `R2_SECRET_ACCESS_KEY="${r2Config.secretAccessKey}"`);
    env = env.replace('# R2_BUCKET_NAME="cauldron"', `R2_BUCKET_NAME="${r2Config.bucketName}"`);
  }

  // Studio name as org branding
  if (displayName && displayName !== DEFAULT_DIR) {
    env = env.replace(
      '# NEXT_PUBLIC_ORG_NAME=""',
      `NEXT_PUBLIC_ORG_NAME="${displayName}"`
    );
  }

  // API keys
  for (const [key, value] of Object.entries(apiKeys)) {
    env = env.replace(
      new RegExp(`# ${key}=""`),
      `${key}="${value}"`
    );
  }

  writeFileSync(join(target, ".env.local"), env);
  s.stop("Generated configuration");

  // Install deps
  const pm = detectPM();
  s.start(`Brewing your studio with ${pc.cyan(pm)}`);
  run(`${pm} install`, { cwd: target });
  s.stop("Dependencies installed");

  // Init git
  s.start("Initializing git");
  run("git init", { cwd: target });
  run("git add -A", { cwd: target });
  run('git commit -m "Initial commit from create-opencauldron"', { cwd: target });
  s.stop("Git initialized");

  // ── Summary ─────────────────────────────────────────────────────────

  const summary = [
    `${pc.bold("Studio")}     ${displayName}`,
    `${pc.bold("Database")}   ${dbChoice === "neon" ? "Neon" : "Local Postgres (Docker)"}`,
    `${pc.bold("Storage")}    ${storageChoice === "local" ? "Local filesystem" : "Cloudflare R2"}`,
    `${pc.bold("Models")}     ${selectedKeys.length > 0 ? selectedKeys.length + " provider" + (selectedKeys.length > 1 ? "s" : "") : pc.dim("none yet — add keys to .env.local")}`,
  ].join("\n");

  p.note(summary, "Configuration");

  // Next steps
  const steps = [
    `cd ${pc.cyan(dir)}`,
    ...(dbChoice === "docker" ? [`docker compose up db -d  ${pc.dim("# start Postgres")}`] : []),
    `${pm} run db:push          ${pc.dim("# create tables")}`,
    ...(selectedKeys.length === 0 ? [`${pc.dim("# Add API keys to .env.local")}`] : []),
    `${pm} run dev              ${pc.dim("# start dev server")}`,
  ].join("\n");

  p.note(steps, "Next steps");

  p.outro(`${pc.magenta(pc.bold("✦"))} ${pc.bold("Your studio is ready.")} ${pc.dim("Conjure stunning media with a wave of your wand.")}`);
}

main().catch((err) => {
  p.cancel(err.message);
  process.exit(1);
});
