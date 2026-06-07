import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const outputPath = join(rootDir, "public", "system-updates.json");
const limit = 40;

function parseGitLog() {
  try {
    const { stdout, status, error } = spawnSync(
      "git",
      ["log", "--no-merges", "-n", String(limit), "--pretty=format:%s%x1f%aI"],
      { encoding: "utf8", cwd: rootDir },
    );

    if (status !== 0 || error) return [];

    const raw = stdout ?? "";

    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf("\x1f");
        if (separatorIndex === -1) return null;
        const title = line.slice(0, separatorIndex).trim();
        const publishedAt = line.slice(separatorIndex + 1).trim();
        return title ? { title, publishedAt } : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

const updates = parseGitLog();

writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "git",
      updates,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Generated ${updates.length} system updates → public/system-updates.json`);
