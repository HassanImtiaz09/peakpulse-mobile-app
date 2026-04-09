/**
 * Migrate all files from static `import { UI/SF/C } from "@/constants/ui-colors"`
 * to the reactive `useUI()` hook from `@/hooks/use-ui`.
 *
 * For each file:
 * 1. Replace the import line with `import { useUI } from "@/hooks/use-ui";`
 * 2. Find the component function and inject `const SF = useUI();` (or C/UI as appropriate)
 *    at the top of the function body.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(".");

// Find all .tsx files importing from ui-colors (excluding the definition file itself)
const files = execSync(
  `grep -rln 'from.*ui-colors' --include="*.tsx" ${ROOT}/app ${ROOT}/components`,
  { encoding: "utf-8" }
)
  .trim()
  .split("\n")
  .filter(Boolean);

console.log(`Found ${files.length} files to migrate.\n`);

let migrated = 0;
let skipped = 0;
const errors = [];

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, "utf-8");
    const relPath = path.relative(ROOT, filePath);

    // Determine which variable names are used (SF, C, UI)
    const importMatch = content.match(
      /import\s*\{([^}]+)\}\s*from\s*["']@\/constants\/ui-colors["'];?/
    );
    if (!importMatch) {
      console.log(`  SKIP (no matching import): ${relPath}`);
      skipped++;
      continue;
    }

    const importedNames = importMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Parse "UI as SF" style imports
    const aliases = [];
    for (const name of importedNames) {
      const asMatch = name.match(/(\w+)\s+as\s+(\w+)/);
      if (asMatch) {
        aliases.push({ original: asMatch[1], alias: asMatch[2] });
      } else {
        aliases.push({ original: name, alias: name });
      }
    }

    // Determine the primary variable name used in the file
    // Most files use SF, some use C, some use UI
    const varNames = [...new Set(aliases.map((a) => a.alias))];

    // Replace the import line
    const oldImport = importMatch[0];
    const newImport = `import { useUI } from "@/hooks/use-ui";`;
    content = content.replace(oldImport, newImport);

    // For each variable name, inject `const <name> = useUI();` at the top of the component
    // Find the first `export default function` or `export function` or `function` component
    const funcPatterns = [
      /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/,
      /export\s+function\s+\w+\s*\([^)]*\)\s*\{/,
      /function\s+\w+Screen\s*\([^)]*\)\s*\{/,
      /function\s+\w+\s*\([^)]*\)\s*\{/,
    ];

    let injected = false;
    for (const pattern of funcPatterns) {
      const funcMatch = content.match(pattern);
      if (funcMatch) {
        const insertPos = content.indexOf(funcMatch[0]) + funcMatch[0].length;

        // Build the hook calls
        const hookCalls = varNames
          .map((name) => `\n  const ${name} = useUI();`)
          .join("");

        // Check if useUI() is already present (idempotency)
        if (content.includes("const SF = useUI()") || content.includes("const C = useUI()") || content.includes("const UI = useUI()")) {
          console.log(`  SKIP (already migrated): ${relPath}`);
          skipped++;
          injected = true;
          break;
        }

        content =
          content.slice(0, insertPos) + hookCalls + content.slice(insertPos);
        injected = true;
        break;
      }
    }

    if (!injected) {
      // Fallback: if no function component found, try to find any React component
      // Some files might use arrow functions
      const arrowMatch = content.match(
        /(?:export\s+default\s+)?(?:const|let)\s+\w+\s*=\s*(?:\([^)]*\)|[^=])\s*=>\s*\{/
      );
      if (arrowMatch) {
        const insertPos =
          content.indexOf(arrowMatch[0]) + arrowMatch[0].length;
        const hookCalls = varNames
          .map((name) => `\n  const ${name} = useUI();`)
          .join("");
        content =
          content.slice(0, insertPos) + hookCalls + content.slice(insertPos);
        injected = true;
      }
    }

    if (!injected) {
      console.log(`  WARN (no component function found): ${relPath}`);
      errors.push(relPath);
      // Still write the import change
    }

    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`  OK: ${relPath} (vars: ${varNames.join(", ")})`);
    migrated++;
  } catch (err) {
    console.error(`  ERROR: ${filePath}: ${err.message}`);
    errors.push(filePath);
  }
}

console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors.length}`);
if (errors.length > 0) {
  console.log("Files with errors/warnings:");
  errors.forEach((f) => console.log(`  - ${f}`));
}
