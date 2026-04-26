import chokidar from "chokidar";
import { exec, spawn } from "child_process";
import path from "path";

let isFirstBuild = true;

function buildAndMaybeServe() {
  console.log("🔨 Ejecutando host local...");

  exec("node dev-build.js", (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Error al compilar:\n", stderr || err.message);
      return;
    }

    console.log("✅ Compilación completa\n", stdout);

    if (isFirstBuild) {
      isFirstBuild = false;
      console.log("🚀 Iniciando servidor en http://localhost:5500");

      const server = spawn("npx", ["live-server", ".dev", "--port=5500", "--quiet"], {
        stdio: "inherit",
        shell: true,
      });

      server.on("close", (code) => {
        console.log(`🛑 Servidor finalizado con código ${code}`);
        process.exit(code ?? 0);
      });
    }
  });
}

const watcher = chokidar.watch(".", {
  ignored: [/dist/, /\.dev/, /node_modules/, /\.plugin-deps/, /\.git/],
  ignoreInitial: true,
});

console.log("👀 Observando archivos del proyecto...");

watcher.on("change", (filePath) => {
  const fileName = path.basename(filePath);
  console.log(`📝 Cambio detectado en: ${fileName}`);
  buildAndMaybeServe();
});

watcher.on("add", (filePath) => {
  const fileName = path.basename(filePath);
  console.log(`➕ Archivo detectado: ${fileName}`);
  buildAndMaybeServe();
});

watcher.on("unlink", (filePath) => {
  const fileName = path.basename(filePath);
  console.log(`➖ Archivo eliminado: ${fileName}`);
  buildAndMaybeServe();
});

buildAndMaybeServe();
