import { it } from "node:test";
import { expect } from "expect";
import { runStartupJobs } from "../../src/jobs/index.ts";
import type { Job } from "../../src/jobs/job.ts";

it("runs only jobs with a startup trigger", async () => {
    const ran: string[] = [];
    let resolveStartup!: () => void;
    const startupDone = new Promise<void>((resolve) => {
        resolveStartup = resolve;
    });

    const startupJob: Job = {
        run: async () => {
            ran.push("startup");
            resolveStartup();
            return true;
        },
        trigger: ["startup"],
    };

    const manualJob: Job = {
        run: async () => {
            ran.push("manual");
            return true;
        },
    };

    runStartupJobs({ startupJob, manualJob });

    await startupDone;

    expect(ran).toEqual(["startup"]);
});
