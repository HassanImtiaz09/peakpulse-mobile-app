/**
 * Fix duplicate SF imports: `import { UI, SF, UI as SF }` → `import { UI, SF }`
 * Also fix hooks/use-ui.ts missing UI import.
 */
import fs from "fs";
import path from "path";

const ROOT = "/home/ubuntu/peakpulse-mobile";

// ── Step 1: Fix duplicate SF imports ──
// Pattern: import { ..., UI as SF } from "@/constants/ui-colors"
// The script added "UI as SF" when it should have recognized SF was already there

const SKIP = ["node_modules", ".expo", "dist", "scripts"];
function gatherFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...gatherFiles(full));
    else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) results.push(full);
  }
  return results;
}

const files = gatherFiles(ROOT);
let fixed = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;

  // Fix pattern: import { UI, SF, UI as SF } → import { UI, SF }
  // Also handles: import { UI, SF, C, UI as SF } → import { UI, SF, C }
  // And: import { SF, UI as SF } → import { SF, UI }
  // General: remove "UI as SF" and ensure both UI and SF are present
  
  const importRegex = /import\s+\{([^}]*)\}\s+from\s+["']@\/constants\/ui-colors["'];?\n?/g;
  content = content.replace(importRegex, (match, names) => {
    const parts = names.split(",").map(s => s.trim()).filter(Boolean);
    
    // Check if there's a "UI as SF" or similar alias
    const hasAlias = parts.some(p => /\bas\b/.test(p));
    if (!hasAlias) return match; // No alias, skip
    
    // Remove alias entries and collect base names
    const cleanParts = new Set();
    for (const p of parts) {
      if (/\bas\b/.test(p)) {
        // e.g., "UI as SF" — add both UI and SF
        const [source, , alias] = p.split(/\s+/);
        cleanParts.add(source);
        cleanParts.add(alias);
      } else {
        cleanParts.add(p);
      }
    }
    
    // Sort: UI, SF, C, then others
    const order = { UI: 0, SF: 1, C: 2 };
    const sorted = [...cleanParts].sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));
    
    return `import { ${sorted.join(", ")} } from "@/constants/ui-colors";\n`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    fixed++;
    console.log(`Fixed: ${path.relative(ROOT, filePath)}`);
  }
}

console.log(`\nFixed ${fixed} files with duplicate SF imports`);

// ── Step 2: Fix hooks/use-ui.ts ──
const useUiPath = path.join(ROOT, "hooks/use-ui.ts");
if (fs.existsSync(useUiPath)) {
  let content = fs.readFileSync(useUiPath, "utf-8");
  // Check if it has UI references but no import
  if (/\bUI\.\w/.test(content) && !content.includes('from "@/constants/ui-colors"') && !content.includes("from '@/constants/ui-colors'")) {
    // Add import at top
    const lines = content.split("\n");
    let insertIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) {
        let j = i;
        while (j < lines.length && !lines[j].includes(";") && !lines[j].includes("from")) j++;
        insertIdx = j + 1;
      }
    }
    lines.splice(insertIdx, 0, 'import { UI } from "@/constants/ui-colors";');
    fs.writeFileSync(useUiPath, lines.join("\n"), "utf-8");
    console.log("Fixed: hooks/use-ui.ts (added UI import)");
  }
}
