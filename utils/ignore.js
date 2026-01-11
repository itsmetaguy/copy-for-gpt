import fs from "fs";
import path from "path";

// Always ignored (safety)
const ALWAYS_IGNORE = [
  "node_modules",
  ".git",
  ".vscode-test",
  ".gptignore"
];

export function loadGptIgnore(cwd) {
  const file = path.join(cwd, ".gptignore");
  if (!fs.existsSync(file)) return [];

  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));
}

export function isIgnored(filePath, cwd, rules) {
  const base = path.basename(filePath);
  const relative = path.relative(cwd, filePath);

  // Always ignored
  if (ALWAYS_IGNORE.includes(base)) return true;
  if (ALWAYS_IGNORE.some(dir => relative.startsWith(dir))) return true;

  return rules.some(rule => {
    // *.ext
    if (rule.startsWith("*.")) {
      return base.endsWith(rule.slice(1));
    }

    // exact file or folder
    return (
      relative === rule ||
      relative.startsWith(rule + path.sep)
    );
  });
}
