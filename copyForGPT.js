#!/usr/bin/env node

import clipboard from "clipboardy";
import { scan } from "./utils/scan.js";
import { formatForGPT } from "./utils/formatter.js";
import { generateTree } from "./utils/tree.js";
import { loadGptIgnore, isIgnored } from "./utils/ignore.js";

// ---------------- ARGUMENTS ----------------
const args = process.argv.slice(2);

let targets = [];
let allowedExts = null;
let showTree = false;
let showFiles = false;

for (const arg of args) {
  if (arg === "--tree") {
    showTree = true;
  } else if (arg === "--files") {
    showFiles = true;
  } else if (arg.startsWith("--ext=")) {
    allowedExts = arg
      .split("=")[1]
      .split(",")
      .map(e => "." + e);
  } else {
    targets.push(arg);
  }
}

// DEFAULT = both
if (!showTree && !showFiles) {
  showTree = true;
  showFiles = true;
}

// Default target = current folder
if (targets.length === 0) {
  targets = ["./"];
}

// ---------------- CONTEXT ----------------
const cwd = process.cwd();

// ---------------- FILE SCAN ----------------
const allFiles = [...new Set(targets.flatMap(scan))];
const ignoreRules = loadGptIgnore(cwd);

// ---------------- FILE FILTERING ----------------
let files = allFiles;

// Extension filter
if (allowedExts) {
  files = files.filter(file =>
    allowedExts.some(ext => file.endsWith(ext))
  );
}

// Ignore rules
files = files.filter(file => !isIgnored(file, cwd, ignoreRules));

// ---------------- IGNORED COUNT ----------------
const ignoredCount = allFiles.filter(file =>
  isIgnored(file, cwd, ignoreRules)
).length;

// ---------------- OUTPUT ----------------
let output = "";

// ℹ️ Explanation ONLY if tree is shown
if (showTree && ignoredCount > 0) {
  output +=
    "Some files are intentionally excluded using .gptignore and marked as (ignored) in the PROJECT_TREE.\n\n";
}

// 📁 PROJECT TREE
if (showTree) {
  output += "PROJECT_TREE\n";
  output += generateTree(cwd, cwd, ignoreRules);
  output += "\n\n";
}

// 📄 FILE CONTENTS
if (showFiles && files.length > 0) {
  output += "FILES\n";
  output += formatForGPT(files, cwd, ignoreRules);
}

// ---------------- CLIPBOARD ----------------
clipboard.writeSync(output);

// ---------------- LOG ----------------
console.log(
  `✅ ${files.length} fichiers copiés pour GPT (${allFiles.length} fichiers détectés)`
);
