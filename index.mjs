#!/usr/bin/env node

/**
 * `create-opencauldron` is deprecated.
 *
 * The setup wizard now lives inside the OpenCauldron repo itself, so it can
 * never drift out of sync with `.env.example`, the provider catalog, or the
 * scripts it points at. This stub exists only to redirect anyone with a
 * stale link / blog post / bookmark.
 */

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

const lines = [
  "",
  `${MAGENTA}${BOLD}create-opencauldron is deprecated.${RESET}`,
  "",
  `The setup wizard moved into the main repo. Run:`,
  "",
  `  ${CYAN}git clone https://github.com/opencauldron/opencauldron.git my-studio${RESET}`,
  `  ${CYAN}cd my-studio${RESET}`,
  `  ${CYAN}pnpm install${RESET}`,
  `  ${CYAN}pnpm setup${RESET}`,
  "",
  `${DIM}Or, to just self-host as-is (no fork), use the Docker quickstart:${RESET}`,
  `${DIM}https://github.com/opencauldron/opencauldron#self-host-in-60-seconds${RESET}`,
  "",
];

console.log(lines.join("\n"));
process.exit(0);
