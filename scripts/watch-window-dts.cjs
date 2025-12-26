const { spawn } = require("child_process");
const path = require("path");

const chokidar = require("chokidar");

const projectRoot = process.cwd();
const preloadPath = path.join(projectRoot, "src", "main", "preload.ts");

let running = false;
let pending = false;

function runGen() {
  if (running) {
    pending = true;
    return;
  }

  running = true;

  const child = spawn(
    process.execPath,
    [path.join(projectRoot, "scripts", "generate-window-dts.cjs")],
    {
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    }
  );

  child.on("exit", () => {
    running = false;
    if (pending) {
      pending = false;
      runGen();
    }
  });
}

console.log('Watching "src/main/preload.ts" ..');
runGen();

const w = chokidar.watch(preloadPath, { ignoreInitial: true });

w.on("change", () => runGen());
w.on("error", (err) => console.error("Watcher error:", err));

function shutdown() {
  try {
    w.close();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
