/**
 * All-in-one color polish script:
 * 1. Replace hardcoded hex/rgba colors with UI.* references
 * 2. Fix JSX attribute syntax (color=UI.x → color={UI.x})
 * 3. Add missing UI/SF/C imports
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = "/home/ubuntu/peakpulse-mobile";

// ── Step 1: Hex color → UI.* mapping ──────────────────────────
const HEX_MAP = {
  // Backgrounds
  '"#0A0E14"': "UI.bg",
  "'#0A0E14'": "UI.bg",
  '"#141A22"': "UI.surface",
  "'#141A22'": "UI.surface",
  '"#1A2030"': "UI.surface2",
  "'#1A2030'": "UI.surface2",
  // Text
  '"#F1F5F9"': "UI.fg",
  "'#F1F5F9'": "UI.fg",
  '"#E2E8F0"': "UI.text",
  "'#E2E8F0'": "UI.text",
  '"#94A3B8"': "UI.muted",
  "'#94A3B8'": "UI.muted",
  // Gold spectrum
  '"#F59E0B"': "UI.gold",
  "'#F59E0B'": "UI.gold",
  '"#FBBF24"': "UI.gold2",
  "'#FBBF24'": "UI.gold2",
  '"#FDE68A"': "UI.gold3",
  "'#FDE68A'": "UI.gold3",
  '"#D97706"': "UI.secondary",
  "'#D97706'": "UI.secondary",
  '"#B45309"': "UI.secondaryLight",
  "'#B45309'": "UI.secondaryLight",
  '"#92400E"': "UI.secondaryDim",
  "'#92400E'": "UI.secondaryDim",
  // Orange
  '"#EA580C"': "UI.orange",
  "'#EA580C'": "UI.orange",
  '"#F97316"': "UI.orange2",
  "'#F97316'": "UI.orange2",
  // Semantic
  '"#EF4444"': "UI.red",
  "'#EF4444'": "UI.red",
  '"#DC2626"': "UI.red2",
  "'#DC2626'": "UI.red2",
  '"#22C55E"': "UI.green",
  "'#22C55E'": "UI.green",
  '"#10B981"': "UI.emerald",
  "'#10B981'": "UI.emerald",
  '"#14B8A6"': "UI.teal",
  "'#14B8A6'": "UI.teal",
  '"#60A5FA"': "UI.blue",
  "'#60A5FA'": "UI.blue",
  '"#A78BFA"': "UI.purple",
  "'#A78BFA'": "UI.purple",
  '"#22D3EE"': "UI.ice",
  "'#22D3EE'": "UI.ice",
  '"#F472B6"': "UI.rose",
  "'#F472B6'": "UI.rose",
  // Borders
  '"#1E293B"': "UI.inactive",
  "'#1E293B'": "UI.inactive",
  // Macros
  '"#FB923C"': "UI.macroFat",
  "'#FB923C'": "UI.macroFat",
};

// RGBA → UI.* mapping
const RGBA_MAP = {
  '"rgba(245,158,11,0.04)"': "UI.goldAlpha4",
  '"rgba(245,158,11,0.05)"': "UI.goldAlpha5",
  '"rgba(245,158,11,0.06)"': "UI.goldAlpha6",
  '"rgba(245,158,11,0.08)"': "UI.dim",
  '"rgba(245,158,11,0.10)"': "UI.goldAlpha10",
  '"rgba(245,158,11,0.1)"':  "UI.goldAlpha10",
  '"rgba(245,158,11,0.12)"': "UI.goldAlpha12",
  '"rgba(245,158,11,0.15)"': "UI.borderGold",
  '"rgba(245,158,11,0.18)"': "UI.borderGold3",
  '"rgba(245,158,11,0.20)"': "UI.goldAlpha20",
  '"rgba(245,158,11,0.2)"':  "UI.goldAlpha20",
  '"rgba(245,158,11,0.25)"': "UI.borderGold2",
  '"rgba(245,158,11,0.30)"': "UI.goldAlpha30",
  '"rgba(245,158,11,0.3)"':  "UI.goldAlpha30",
  '"rgba(245,158,11,0.35)"': "UI.borderGold4",
  '"rgba(245,158,11,0.40)"': "UI.goldAlpha40",
  '"rgba(245,158,11,0.4)"':  "UI.goldAlpha40",
  '"rgba(245,158,11,0.50)"': "UI.goldAlpha50",
  '"rgba(245,158,11,0.5)"':  "UI.goldAlpha50",
  '"rgba(245,158,11,0.70)"': "UI.searchActive",
  '"rgba(245,158,11,0.7)"':  "UI.searchActive",
  '"rgba(245,158,11,0.85)"': "UI.goldAlpha85",
  '"rgba(30,41,59,0.25)"':   "UI.slateAlpha25",
  '"rgba(30,41,59,0.4)"':    "UI.slateAlpha40",
  '"rgba(30,41,59,0.40)"':   "UI.slateAlpha40",
  '"rgba(30,41,59,0.5)"':    "UI.slateAlpha50",
  '"rgba(30,41,59,0.50)"':   "UI.slateAlpha50",
  '"rgba(30,41,59,0.6)"':    "UI.border",
  '"rgba(30,41,59,0.8)"':    "UI.border2",
  '"rgba(30,41,59,0.9)"':    "UI.borderPrimary",
  '"rgba(100,116,139,0.2)"': "UI.chartGrid",
  '"rgba(245,178,50,0.45)"': "UI.bodyStroke",
  // Single-quote variants
  "'rgba(245,158,11,0.04)'": "UI.goldAlpha4",
  "'rgba(245,158,11,0.05)'": "UI.goldAlpha5",
  "'rgba(245,158,11,0.06)'": "UI.goldAlpha6",
  "'rgba(245,158,11,0.08)'": "UI.dim",
  "'rgba(245,158,11,0.10)'": "UI.goldAlpha10",
  "'rgba(245,158,11,0.1)'":  "UI.goldAlpha10",
  "'rgba(245,158,11,0.12)'": "UI.goldAlpha12",
  "'rgba(245,158,11,0.15)'": "UI.borderGold",
  "'rgba(245,158,11,0.18)'": "UI.borderGold3",
  "'rgba(245,158,11,0.20)'": "UI.goldAlpha20",
  "'rgba(245,158,11,0.2)'":  "UI.goldAlpha20",
  "'rgba(245,158,11,0.25)'": "UI.borderGold2",
  "'rgba(245,158,11,0.30)'": "UI.goldAlpha30",
  "'rgba(245,158,11,0.3)'":  "UI.goldAlpha30",
  "'rgba(245,158,11,0.35)'": "UI.borderGold4",
  "'rgba(245,158,11,0.40)'": "UI.goldAlpha40",
  "'rgba(245,158,11,0.4)'":  "UI.goldAlpha40",
  "'rgba(245,158,11,0.50)'": "UI.goldAlpha50",
  "'rgba(245,158,11,0.5)'":  "UI.goldAlpha50",
  "'rgba(245,158,11,0.70)'": "UI.searchActive",
  "'rgba(245,158,11,0.7)'":  "UI.searchActive",
  "'rgba(245,158,11,0.85)'": "UI.goldAlpha85",
  "'rgba(30,41,59,0.25)'":   "UI.slateAlpha25",
  "'rgba(30,41,59,0.4)'":    "UI.slateAlpha40",
  "'rgba(30,41,59,0.40)'":   "UI.slateAlpha40",
  "'rgba(30,41,59,0.5)'":    "UI.slateAlpha50",
  "'rgba(30,41,59,0.50)'":   "UI.slateAlpha50",
  "'rgba(30,41,59,0.6)'":    "UI.border",
  "'rgba(30,41,59,0.8)'":    "UI.border2",
  "'rgba(30,41,59,0.9)'":    "UI.borderPrimary",
  "'rgba(100,116,139,0.2)'": "UI.chartGrid",
  "'rgba(245,178,50,0.45)'": "UI.bodyStroke",
};

// ── Gather files ──────────────────────────────────────────────
const SKIP = ["node_modules", ".expo", "dist", "scripts", "__tests__", "assets"];
function gatherTsx(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...gatherTsx(full));
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) results.push(full);
  }
  return results;
}

const files = gatherTsx(ROOT).filter(f => !f.includes("ui-colors.ts") && !f.includes("theme.config"));
console.log(`Processing ${files.length} files...`);

let totalReplacements = 0;
let filesChanged = 0;
let jsxFixed = 0;
let importsFixed = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;

  // ── Step 1: Replace hex colors ──
  for (const [from, to] of Object.entries(HEX_MAP)) {
    // Don't replace inside comments or template literals in HTML strings
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const before = content;
    content = content.replace(regex, to);
    const count = (before.length - content.length) / (from.length - to.length);
    if (count > 0) totalReplacements += Math.abs(count);
  }

  // ── Step 2: Replace rgba colors ──
  for (const [from, to] of Object.entries(RGBA_MAP)) {
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const before = content;
    content = content.replace(regex, to);
    const count = (before.length - content.length) / (from.length - to.length);
    if (count > 0) totalReplacements += Math.abs(count);
  }

  // ── Step 3: Fix JSX attribute syntax ──
  // Pattern: prop=UI.xxx → prop={UI.xxx}
  // But NOT inside style objects (those are already correct)
  const jsxPattern = /(\w+)=(UI\.\w+)/g;
  let match;
  while ((match = jsxPattern.exec(content)) !== null) {
    // Check if this is inside a JSX tag (preceded by < somewhere)
    const before = content.substring(Math.max(0, match.index - 200), match.index);
    // If it's inside a JSX tag attribute, wrap in braces
    if (before.includes("<") && !before.includes(">")) {
      // This is a JSX attribute
    }
  }
  // Simpler approach: replace all `=UI.xxx` that are NOT already `={UI.xxx}`
  content = content.replace(/(?<!=\{)(=)(UI\.\w+)(?!\})/g, (_, eq, ref) => {
    jsxFixed++;
    return `={${ref}}`;
  });

  if (content !== original) {
    // ── Step 4: Ensure import exists ──
    const usesUI = /\bUI\.\w/.test(content);
    const usesSF = /\bSF\.\w/.test(content);
    const usesC = /\bC\.\w/.test(content) && !filePath.endsWith(".css");

    const needed = new Set();
    if (usesUI) needed.add("UI");
    if (usesSF) needed.add("SF");
    if (usesC) needed.add("C");

    if (needed.size > 0) {
      const importMatch = content.match(/import\s+\{([^}]*)\}\s+from\s+["']@\/constants\/ui-colors["'];?\n?/);
      if (importMatch) {
        const currentNames = importMatch[1].split(",").map(s => s.trim()).filter(Boolean);
        const currentSet = new Set(currentNames);
        let changed = false;
        for (const n of needed) {
          if (!currentSet.has(n)) { currentSet.add(n); changed = true; }
        }
        if (changed) {
          const sorted = [...currentSet].sort((a, b) => {
            const o = { UI: 0, SF: 1, C: 2 };
            return (o[a] ?? 9) - (o[b] ?? 9);
          });
          content = content.replace(importMatch[0], `import { ${sorted.join(", ")} } from "@/constants/ui-colors";\n`);
          importsFixed++;
        }
      } else {
        // No import at all — add after last import
        const sorted = [...needed].sort((a, b) => {
          const o = { UI: 0, SF: 1, C: 2 };
          return (o[a] ?? 9) - (o[b] ?? 9);
        });
        const lines = content.split("\n");
        let insertIdx = 0;
        for (let i = 0; i < lines.length; i++) {
          if (/^\s*import\s/.test(lines[i])) {
            // Find the end of this import (may be multi-line)
            let j = i;
            while (j < lines.length && !lines[j].includes(";") && !lines[j].includes("from")) j++;
            insertIdx = j + 1;
          }
        }
        lines.splice(insertIdx, 0, `import { ${sorted.join(", ")} } from "@/constants/ui-colors";`);
        content = lines.join("\n");
        importsFixed++;
      }
    }

    fs.writeFileSync(filePath, content, "utf-8");
    filesChanged++;
  }
}

console.log(`\nDone:`);
console.log(`  ${totalReplacements} color replacements across ${filesChanged} files`);
console.log(`  ${jsxFixed} JSX syntax fixes`);
console.log(`  ${importsFixed} import fixes`);
