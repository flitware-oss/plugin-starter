import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const outDir = path.join(projectRoot, ".test-dist");
const withCoverage = process.argv.includes("--coverage");

function removeDir(directory) {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const entryPoints = [
    ...listFiles(path.join(projectRoot, "app")).filter((file) => !file.endsWith(".tsx")),
    ...listFiles(path.join(projectRoot, "dev")),
    ...listFiles(path.join(projectRoot, "tests")),
  ];

  removeDir(outDir);

  await esbuild.build({
    entryPoints,
    outdir: outDir,
    outbase: projectRoot,
    format: "esm",
    platform: "node",
    target: ["node20"],
    sourcemap: false,
    bundle: false,
    logLevel: "silent",
  });

  const testFiles = listFiles(path.join(outDir, "tests")).filter((file) => file.endsWith(".test.js"));
  const nodeArgs = [];

  if (withCoverage) {
    nodeArgs.push("--experimental-test-coverage");
  }

  nodeArgs.push("--test", ...testFiles);

  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  removeDir(outDir);

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
