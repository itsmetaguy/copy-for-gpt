import fs from "fs";
import path from "path";
import { isIgnored } from "./ignore.js";

export function formatForGPT(files, cwd, rules) {
  let output = "";

  for (const file of files) {
    if (isIgnored(file, cwd, rules)) continue;

    output += `${path.relative(cwd, file)}:\n`;
    output += fs.readFileSync(file, "utf8") + "\n\n";
  }

  return output;
}
