import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const target = path.resolve(process.cwd(), "specs");
const debounceMs = 200;

let timer: NodeJS.Timeout | null = null;
let running = false;
let pending = false;

function runGenerate(): void {
    if (running) {
        pending = true;
        return;
    }
    running = true;
    console.log("[watch-spec] running: npm run generate:specs");
    const child = exec("npm run generate:specs", { cwd: process.cwd() });

    if (child.stdout) child.stdout.pipe(process.stdout);
    if (child.stderr) child.stderr.pipe(process.stderr);

    child.on("exit", (code, signal) => {
        running = false;
        console.log(`[watch-spec] finished (code=${code}, signal=${signal})`);
        if (pending) {
            pending = false;
            scheduleRun();
        }
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
    fs.watch(target, { recursive: true }, () => scheduleRun());
    console.log(`[watch-spec] watching ${target}`);
} catch (err) {
    console.error("[watch-spec] fs.watch failed:", err);
    process.exit(1);
}
