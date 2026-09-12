import { it, mock } from "node:test";
import { expect } from "expect";
import { runScheduledJobs, runStartupJobs } from "../../src/jobs/index.ts";
import type { Job } from "../../src/jobs/job.ts";
import type { Logger } from "../../src/utils/logger.ts";
import { silentLogger } from "../helpers/setup.ts";

it("runs only jobs with a startup trigger", () => {
    const runStartup = mock.fn(async () => true);
    const runManual = mock.fn(async () => true);
    const runCleanup = mock.fn(async () => true);

    const startupJob: Job = {
        run: runStartup,
        trigger: ["startup"],
    };

    const manualJob: Job<[userId: string]> = {
        run: runManual,
    };

    const cleanupJob: Job = {
        run: runCleanup,
    };

    runStartupJobs(
        {
            refreshIngredientsAsset: startupJob,
            createUserStarterData: manualJob,
            purgeDeletedUsers: cleanupJob,
        },
        silentLogger,
    );

    expect(runStartup.mock.calls).toHaveLength(1);
    expect(runManual.mock.calls).toHaveLength(0);
    expect(runCleanup.mock.calls).toHaveLength(0);
});

it("logs errors escaping a startup job's own handling", async () => {
    const error = new Error("job exploded");
    const logger = {
        error: mock.fn((_message: string, _error: unknown) => {}),
    };

    runStartupJobs(
        {
            refreshIngredientsAsset: {
                run: async () => {
                    throw error;
                },
                trigger: ["startup"],
            } as Job,
            createUserStarterData: { run: async () => true },
            purgeDeletedUsers: { run: async () => true },
        },
        logger as unknown as Logger,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(logger.error.mock.calls).toHaveLength(1);
    expect(logger.error.mock.calls[0]!.arguments[1]).toBe(error);
});

it("schedules only interval-triggered jobs with an interval", () => {
    mock.timers.enable({ apis: ["setInterval"] });
    try {
        const runScheduled = mock.fn(async () => true);
        const runManual = mock.fn(async () => true);

        const scheduledJob: Job = {
            run: runScheduled,
            trigger: ["startup", "interval"],
            interval: 1000,
        };

        const manualJob: Job<[userId: string]> = {
            run: runManual,
        };

        runScheduledJobs(
            {
                refreshIngredientsAsset: { run: async () => true },
                createUserStarterData: manualJob,
                purgeDeletedUsers: scheduledJob,
            },
            silentLogger,
        );

        expect(runScheduled.mock.calls).toHaveLength(0);
        expect(runManual.mock.calls).toHaveLength(0);

        mock.timers.tick(1000);

        expect(runScheduled.mock.calls).toHaveLength(1);
        expect(runManual.mock.calls).toHaveLength(0);
    } finally {
        mock.timers.reset();
    }
});
