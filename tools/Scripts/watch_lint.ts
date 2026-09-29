import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dirs = ["src", "tests", "tools"];
const files = ["biome.json", "package.json", "openapi.yaml"];
const debounceMs = 300;

let timer: NodeJS.Timeout | null = null;
let running = false;
let pending = false;

function runLint(): void {
    if (running) {
        pending = true;
        return;
    }
    running = true;
    console.log("[watch-lint] running: npm run lint:ci");
    const child = exec("npm run lint:ci", { cwd: process.cwd() });

    if (child.stdout) child.stdout.pipe(process.stdout);
    if (child.stderr) child.stderr.pipe(process.stderr);

    child.on("exit", (code, signal) => {
        running = false;
        console.log(`[watch-lint] finished (code=${code}, signal=${signal})`);
        if (pending) {
            pending = false;
            scheduleRun();
        }
    });
}

function scheduleRun(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(runLint, debounceMs);
}

let watchers = 0;

for (const dir of dirs) {
    const target = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(target)) continue;
    try {
        fs.watch(target, { recursive: true }, () => scheduleRun());
        watchers++;
    } catch (err) {
        console.error(`[watch-lint] fs.watch failed for ${dir}:`, err);
    }
}

for (const file of files) {
    const target = path.resolve(process.cwd(), file);
    if (!fs.existsSync(target)) continue;
    try {
        fs.watch(target, () => scheduleRun());
        watchers++;
    } catch (err) {
        console.error(`[watch-lint] fs.watch failed for ${file}:`, err);
    }
}

if (watchers === 0) {
    console.error("[watch-lint] no paths to watch; exiting");
    process.exit(1);
}

console.log(`[watch-lint] watching ${watchers} path(s)`);
scheduleRun();
