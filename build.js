import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "html-minifier-terser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "dist");
const isProd = process.env.NODE_ENV !== "development";
const config = JSON.parse(fs.readFileSync(path.join(__dirname, "plugin.config.json"), "utf8"));
const LEGAL_COMMENT_MARKERS = [
  "Bundled license information",
  "@license",
  "Apache License",
  "@cloudscape-design",
];
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

function ensureBundledLegalComments(directory) {
  const bundleFiles = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
    .map((file) => path.join(directory, file));

  const hasLegalComments = bundleFiles.some((file) => {
    const contents = fs.readFileSync(file, "utf8");
    return LEGAL_COMMENT_MARKERS.some((marker) => contents.includes(marker));
  });

  if (!hasLegalComments) {
    throw new Error("Build aborted: bundled legal comments were not found in the generated assets.");
  }
}

async function buildOnce() {
  console.log("🔨 Compilando plugin dummy de tareas...");

  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  ensureDir(distPath);

  const result = await esbuild.build({
    entryPoints: [path.join(__dirname, "index.tsx")],
    bundle: true,
    minify: true,
    legalComments: "eof",
    write: false,
    jsx: "automatic",
    format: "iife",
    target: ["es2020"],
    outdir: distPath,
    sourcemap: !isProd,
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
      ".woff2": "dataurl"
    }
  });

  const jsOutput = result.outputFiles.find((file) => file.path.endsWith(".js"));
  const cssOutputs = result.outputFiles.filter((file) => file.path.endsWith(".css"));

  if (!jsOutput) {
    throw new Error("No JavaScript bundle was generated for the plugin.");
  }

  const bundleContents = [
    jsOutput.text,
    ...cssOutputs.map((file) => file.text),
  ];
  const hasLegalComments = bundleContents.some((contents) =>
    LEGAL_COMMENT_MARKERS.some((marker) => contents.includes(marker)),
  );

  if (!hasLegalComments) {
    throw new Error("Build aborted: bundled legal comments were not found in the generated assets.");
  }

  const inlineCss = cssOutputs.map((file) => file.text).join("\n");
  const html = `<!DOCTYPE html>
<html lang="${config.lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${config.description}" />
    <title>${config.title}</title>
    <style>
${inlineCss}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
${jsOutput.text}
    </script>
  </body>
</html>`;

  const minifiedHtml = await minify(html, {
    collapseWhitespace: true,
    removeComments: false,
    minifyCSS: false,
    minifyJS: false,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
  });

  fs.writeFileSync(path.join(distPath, "index.html"), minifiedHtml);
  console.log("✅ HTML regenerado en dist/index.html");
}

buildOnce().catch((error) => {
  console.error("❌ Error de compilación:", error.message);
  process.exitCode = 1;
});
