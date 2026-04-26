import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devDistPath = path.join(__dirname, ".dev");
const assetsPath = path.join(devDistPath, "assets");
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
const nodePaths = [
  path.join(__dirname, ".plugin-deps", "node_modules"),
  path.join(__dirname, "node_modules"),
];
const appNodeModulesPath = path.join(__dirname, "node_modules");
const reactAliases = {
  react: path.join(appNodeModulesPath, "react"),
  "react/jsx-runtime": path.join(appNodeModulesPath, "react", "jsx-runtime.js"),
  "react/jsx-dev-runtime": path.join(appNodeModulesPath, "react", "jsx-dev-runtime.js"),
  "react-dom": path.join(appNodeModulesPath, "react-dom"),
  "react-dom/client": path.join(appNodeModulesPath, "react-dom", "client.js"),
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

function cleanDevDist() {
  if (fs.existsSync(devDistPath)) {
    fs.rmSync(devDistPath, { recursive: true, force: true });
  }

  ensureDir(assetsPath);
}

function buildPluginFrameHtml() {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Plugin Preview</title>
    <script>
      const parentConfig = window.parent && window.parent !== window ? window.parent.__PLUGIN_DEV_CONFIG__ : null;
      window.__PLUGIN_CONFIG__ = parentConfig || {
        theme: "light",
        language: "es",
        fluxProxy: { targetOrigin: window.location.origin },
        plugin: { installedPluginId: "dev-installed-plugin", pluginId: "dev-tasks-plugin", version: "0.1.0" }
      };
    </script>
    <link rel="stylesheet" href="./assets/plugin.css" />
  </head>
  <body>
    <div id="root"></div>
    <script src="./assets/plugin.js"></script>
  </body>
</html>`;
}

function buildHostHtml(pluginVersion) {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Flitware Plugin Dev Host</title>
    <style>
      :root {
        color-scheme: light;
        --host-bg: #f3f4f6;
        --host-surface: #ffffff;
        --host-surface-alt: #f9fafb;
        --host-border: #d5dbdb;
        --host-text: #111111;
        --host-muted: #5f6b7a;
        --host-accent: #000000;
      }

      :root[data-theme="dark"] {
        color-scheme: dark;
        --host-bg: #0b0b0c;
        --host-surface: #141416;
        --host-surface-alt: #1b1c20;
        --host-border: #2a2c30;
        --host-text: #f5f5f5;
        --host-muted: #a3a3ad;
        --host-accent: #ffffff;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, sans-serif;
        background: var(--host-bg);
        color: var(--host-text);
      }

      .dev-shell {
        min-height: 100vh;
        display: grid;
        grid-template-rows: auto 1fr;
      }

      .dev-toolbar {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: var(--host-surface);
        border-bottom: 1px solid var(--host-border);
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .dev-title {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .dev-title h1 {
        margin: 0;
        font-size: 20px;
      }

      .dev-title p {
        margin: 0;
        color: var(--host-muted);
        font-size: 13px;
      }

      .dev-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .dev-control {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 12px;
        color: var(--host-muted);
      }

      .dev-control select,
      .dev-control button,
      .dev-badge {
        min-height: 36px;
        border-radius: 10px;
        border: 1px solid var(--host-border);
        background: var(--host-surface-alt);
        color: var(--host-text);
        padding: 0 12px;
        font: inherit;
      }

      .dev-control button {
        cursor: pointer;
      }

      .dev-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: var(--host-accent);
      }

      .dev-preview {
        padding: 20px;
      }

      .dev-frame {
        width: 100%;
        height: calc(100vh - 108px);
        border: 1px solid var(--host-border);
        border-radius: 18px;
        background: var(--host-surface);
      }

      @media (max-width: 900px) {
        .dev-toolbar {
          align-items: flex-start;
          flex-direction: column;
        }

        .dev-controls {
          width: 100%;
          justify-content: flex-start;
        }

        .dev-frame {
          height: calc(100vh - 180px);
        }
      }
    </style>
    <script>
      window.__PLUGIN_DEV_BOOTSTRAP__ = {
        runtime: {
          theme: "light",
          language: "es",
          pluginVersion: ${JSON.stringify(pluginVersion)}
        }
      };
    </script>
  </head>
  <body>
    <div class="dev-shell">
      <div class="dev-toolbar">
        <div class="dev-title">
          <h1>Flitware Plugin Dev Host</h1>
          <p id="host-status">Inicializando host local...</p>
        </div>
        <div class="dev-controls">
          <label class="dev-control">
            Theme
            <select id="theme-select">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label class="dev-control">
            Language
            <select id="language-select">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <span class="dev-control">
            Plugin version
            <span class="dev-badge" id="plugin-version"></span>
          </span>
          <span class="dev-control">
            Actions
            <span style="display:flex;gap:12px;">
              <button id="reload-plugin" type="button">Reload plugin</button>
              <button id="reset-mocks" type="button">Reset mocks</button>
            </span>
          </span>
        </div>
      </div>
      <div class="dev-preview">
        <iframe
          id="plugin-preview"
          class="dev-frame"
          src="./plugin-frame.html"
          title="Plugin preview"
        ></iframe>
      </div>
    </div>
    <script src="./assets/host.js"></script>
  </body>
</html>`;
}

async function buildDevArtifacts() {
  cleanDevDist();

  console.log("🔨 Compilando host local de desarrollo...");

  await esbuild.build({
    entryPoints: [path.join(__dirname, "index.tsx")],
    bundle: true,
    format: "iife",
    jsx: "automatic",
    target: ["es2020"],
    outfile: path.join(assetsPath, "plugin.js"),
    sourcemap: true,
    minify: false,
    treeShaking: true,
    nodePaths,
    alias: reactAliases,
    loader: {
      ".css": "css",
      ".svg": "dataurl",
      ".png": "dataurl",
      ".jpg": "dataurl",
      ".jpeg": "dataurl",
      ".gif": "dataurl",
      ".webp": "dataurl",
      ".woff": "dataurl",
      ".woff2": "dataurl",
    },
  });

  await esbuild.build({
    entryPoints: [path.join(__dirname, "dev", "host.ts")],
    bundle: true,
    format: "iife",
    target: ["es2020"],
    outfile: path.join(assetsPath, "host.js"),
    sourcemap: true,
    minify: false,
    treeShaking: true,
    nodePaths,
    alias: reactAliases,
  });

  const cssOutputPath = path.join(assetsPath, "plugin.css");

  if (!fs.existsSync(cssOutputPath)) {
    writeFile(cssOutputPath, "");
  }

  writeFile(path.join(devDistPath, "plugin-frame.html"), buildPluginFrameHtml());
  writeFile(path.join(devDistPath, "index.html"), buildHostHtml(packageJson.version ?? "0.1.0"));

  console.log("✅ Host local disponible en .dev/index.html");
}

buildDevArtifacts().catch((error) => {
  console.error("❌ Error compilando el host local:", error);
  process.exitCode = 1;
});
