import { exec } from "child_process";
import fs from "fs";
import path from "path";

const target = path.resolve(process.cwd(), "openapi.yaml");
const dir = path.dirname(target);
const base = path.basename(target);
const debounceMs = 200;

let timer: NodeJS.Timeout | null = null;
let running = false;

function runGenerate(): void {
    if (running) return;
    running = true;
    console.log("[watch-spec] running: npm run generate:spec");
    const child = exec("npm run generate:spec", { cwd: process.cwd() });

    if (child.stdout) child.stdout.pipe(process.stdout);
    if (child.stderr) child.stderr.pipe(process.stderr);

    child.on("exit", (code, signal) => {
        running = false;
        console.log(`[watch-spec] finished (code=${code}, signal=${signal})`);
    });
}

function scheduleRun(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(runGenerate, debounceMs);
}

if (fs.existsSync(target)) {
    scheduleRun();
} else {
    console.warn(
        `[watch-spec] warning: ${target} not found yet — will watch for creation.`,
    );
}

try {
    fs.watch(dir, (evt, filename) => {
        if (!filename) return;
        if (filename === base) scheduleRun();
    });
    console.log(`[watch-spec] watching ${target}`);
} catch (err) {
    console.error("[watch-spec] fs.watch failed:", err);
    process.exit(1);
}
