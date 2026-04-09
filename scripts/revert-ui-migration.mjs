/**
 * Revert the useUI() migration back to static imports.
 * 
 * For each file:
 * 1. Replace `import { useUI } from "@/hooks/use-ui"` with the appropriate static import
 * 2. Remove `const SF = useUI();` / `const C = useUI();` / `const UI = useUI();` lines
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(".");

const files = execSync(
  `grep -rln 'from.*use-ui' --include="*.tsx" ${ROOT}/app ${ROOT}/components`,
  { encoding: "utf-8" }
).trim().split("\n").filter(Boolean);

console.log(`Found ${files.length} files to revert.\n`);

let reverted = 0;

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, "utf-8");
    const relPath = path.relative(ROOT, filePath);

    // Determine which variable names are used (SF, C, UI) from the useUI() calls
    const usesC = content.includes("const C = useUI()");
    const usesSF = content.includes("const SF = useUI()");
    const usesUI = content.includes("const UI = useUI()");

    // Build the appropriate static import
    const names = [];
    if (usesSF && usesUI) names.push("UI", "SF");
    else if (usesSF) names.push("UI as SF");
    else if (usesC) names.push("C");
    else if (usesUI) names.push("UI");
    else names.push("UI");

    const staticImport = `import { ${names.join(", ")} } from "@/constants/ui-colors";`;

    // Replace the import
    content = content.replace(
      /import\s*\{\s*useUI\s*\}\s*from\s*["']@\/hooks\/use-ui["'];?/,
      staticImport
    );

    // Remove the useUI() hook calls
    content = content.replace(/\n\s*const SF = useUI\(\);/g, "");
    content = content.replace(/\n\s*const C = useUI\(\);/g, "");
    content = content.replace(/\n\s*const UI = useUI\(\);/g, "");
    // Also handle "const UI = SF;" alias lines we may have added
    content = content.replace(/\n\s*const UI = SF;/g, "");

    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`  OK: ${relPath}`);
    reverted++;
  } catch (err) {
    console.error(`  ERROR: ${filePath}: ${err.message}`);
  }
}

console.log(`\nDone. Reverted: ${reverted}`);
