import type { Job } from "./job.ts";

export type AppJobs = {
    refreshIngredientsAsset: Job;
};

/**
 * Fire all startup-triggered jobs without blocking. Each job is expected to
 * handle its own errors, so a failure is logged by the job rather than
 * crashing or delaying server start.
 */
export const runStartupJobs = (jobs: Record<string, Job>) => {
    for (const job of Object.values(jobs)) {
        if (job.trigger?.includes("startup")) {
            void job.run();
        }
    }
};
