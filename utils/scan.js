import fs from "fs";
import path from "path";

export function scan(target) {
  let results = [];

  if (!fs.existsSync(target)) return results;

  const stat = fs.statSync(target);

  if (stat.isFile()) {
    results.push(target);
    return results;
  }

  if (stat.isDirectory()) {
    for (const file of fs.readdirSync(target)) {
      results = results.concat(
        scan(path.join(target, file))
      );
    }
  }

  return results;
}
