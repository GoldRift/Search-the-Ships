import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const script = readFileSync(join(root, "search-the-ships.user.js"), "utf8");
const match = script.match(/^\/\/\s*@version\s+(\S+)/m);
if (!match) {
  console.error("Could not find @version in search-the-ships.user.js");
  process.exit(1);
}
const version = match[1];

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
if (pkg.version !== version) {
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`package.json version synced to ${version}`);
} else {
  console.log(`package.json already at ${version}`);
}
