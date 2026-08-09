import { it, mock } from "node:test";
import { expect } from "expect";
import { runStartupJobs } from "../../src/jobs/index.ts";
import type { Job } from "../../src/jobs/job.ts";

it("runs only jobs with a startup trigger", () => {
    const runStartup = mock.fn(async () => true);
    const runManual = mock.fn(async () => true);

    const startupJob: Job = {
        run: runStartup,
        trigger: ["startup"],
    };

    const manualJob: Job<[userId: string]> = {
        run: runManual,
    };

    runStartupJobs({
        refreshIngredientsAsset: startupJob,
        createUserStarterData: manualJob,
    });

    expect(runStartup.mock.calls).toHaveLength(1);
    expect(runManual.mock.calls).toHaveLength(0);
});
