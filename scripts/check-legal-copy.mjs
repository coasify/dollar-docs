#!/usr/bin/env node
/**
 * Enforces the legal-language rules for the docs content. Fails (exit 1) if a forbidden marketing/legal
 * CLAIM appears. Run on its own with `npm run check:legal`.
 *
 * Unlike the app, the docs are allowed to explain DLRS (they are technical docs), so DLRS itself is not
 * banned here. What is banned is positive claims: "fully backed", "exactly 1:1", "1:1 claim" / "claim on
 * reserves", "perfect price", "guaranteed", "certified", "legal tender". Bare "1:1", bare "backed" (used
 * technically, e.g. "priced by a fresh oracle"), and negated disclaimers ("not a guarantee") are fine.
 *
 * The legal Terms page is exempt: it must disclaim these things, which is protective, not a claim.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT = fileURLToPath(new URL("../content", import.meta.url));

const EXCLUDE = new Set(["resources/terms.md"]);

const RULES = [
  { name: "legal-tender positioning", re: /legal[\s-]?tender/i },
  { name: "'certified' claim", re: /certif/i },
  { name: "'guaranteed' / 'guarantees' claim (negated 'not a guarantee' is fine)", re: /\bguarantee[ds]\b/i },
  { name: "'fully backed' claim", re: /fully[\s-]?backed/i },
  { name: "'exactly 1:1' claim", re: /exactly[\s-]*1\s*:\s*1/i },
  { name: "'perfect price' claim", re: /perfect[\s-]?price/i },
  { name: "'claim' (entitlement wording: '1:1 claim', 'claim on reserves')", re: /\bclaim/i },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.mdx?$/.test(entry)) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(CONTENT)) {
  const rel = relative(CONTENT, file);
  if (EXCLUDE.has(rel)) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const rule of RULES) {
        if (rule.re.test(line)) violations.push({ rel, line: i + 1, rule: rule.name, text: line.trim() });
      }
    });
}

if (violations.length) {
  console.error(`\nLegal-language check FAILED (${violations.length}). Forbidden claims in the docs:\n`);
  for (const v of violations) {
    console.error(`  content/${v.rel}:${v.line}  [${v.rule}]`);
    console.error(`    ${v.text.slice(0, 160)}`);
  }
  console.error("\nDescribe the mechanism instead of making a claim. The Terms page is exempt.\n");
  process.exit(1);
}

console.log("Legal-language check passed: no forbidden claims in the docs.");
