import fs from "fs";
import path from "path";
import { isIgnored } from "./ignore.js";

export function generateTree(dir, cwd, rules, prefix = "") {
  let output = "";

  const items = fs.readdirSync(dir);

  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const ignored = isIgnored(fullPath, cwd, rules);

    const isLast = index === items.length - 1;
    const connector = isLast ? "└── " : "├── ";

    output += `${prefix}${connector}${item}${ignored ? " (ignored)" : ""}\n`;

    if (!ignored && fs.statSync(fullPath).isDirectory()) {
      output += generateTree(
        fullPath,
        cwd,
        rules,
        prefix + (isLast ? "    " : "│   ")
      );
    }
  });

  return output;
}
