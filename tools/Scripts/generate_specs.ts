import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(scriptDirectory, "../..");
const require = createRequire(import.meta.url);
const optional = process.argv.includes("--if-available");

let cliPath: string;
try {
    const openApiTypescriptDirectory = dirname(
        require.resolve("openapi-typescript/package.json"),
    );
    cliPath = resolve(openApiTypescriptDirectory, "bin/cli.js");
} catch (error) {
    if (optional) {
        console.log("openapi-typescript is not installed; skipping specs");
        process.exit(0);
    }
    throw error;
}

const targets = [
    {
        input: "specs/lamington/openapi.yaml",
        output: "src/routes/spec/schema.d.ts",
    },
    {
        input: "specs/extractor/openapi.yaml",
        output: "src/services/extractor/spec/schema.d.ts",
    },
] as const;

for (const target of targets) {
    const inputPath = resolve(rootDirectory, target.input);
    const outputPath = resolve(rootDirectory, target.output);

    mkdirSync(dirname(outputPath), { recursive: true });
    rmSync(outputPath, { force: true });

    execFileSync(
        process.execPath,
        [
            cliPath,
            inputPath,
            "--output",
            outputPath,
            "--immutable",
            "--array-length",
        ],
        {
            cwd: rootDirectory,
            stdio: "inherit",
        },
    );

    console.log(`${target.input} -> ${target.output}`);
}
