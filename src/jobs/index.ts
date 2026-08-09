import type { Job } from "./job.ts";

export type AppJobs = {
    refreshIngredientsAsset: Job;
    createUserStarterData: Job<[userId: string]>;
};

const isStartupJob = (job: AppJobs[keyof AppJobs]): job is Job =>
    "trigger" in job && (job.trigger?.includes("startup") ?? false);

/**
 * Fire all startup-triggered jobs without blocking. Each job is expected to
 * handle its own errors, so a failure is logged by the job rather than
 * crashing or delaying server start.
 */
export const runStartupJobs = (jobs: AppJobs) => {
    for (const job of Object.values(jobs)) {
        if (isStartupJob(job)) {
            void job.run();
        }
    }
};
