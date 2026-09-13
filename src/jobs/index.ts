import type { Job } from "./job.ts";

export type AppJobs = {
    refreshIngredientsAsset: Job;
    createUserStarterData: Job<[userId: string]>;
    purgeDeletedUsers: Job;
    purgeDeletedAttachments: Job;
};

const isStartupJob = (job: AppJobs[keyof AppJobs]): job is Job =>
    "trigger" in job && (job.trigger?.includes("startup") ?? false);

const isScheduledJob = (job: AppJobs[keyof AppJobs]): job is Job =>
    "trigger" in job &&
    (job.trigger?.includes("interval") ?? false) &&
    typeof job.interval === "number";

/**
 * Fire all startup-triggered jobs without blocking.
 */
export const runStartupJobs = (jobs: AppJobs) => {
    for (const job of Object.values(jobs)) {
        if (isStartupJob(job)) {
            void job.run();
        }
    }
};

/**
 * Schedule all interval-triggered jobs. Each job runs on a repeating timer
 * which is unref'd so it never keeps the process alive or blocks shutdown.
 */
export const runScheduledJobs = (jobs: AppJobs) => {
    for (const job of Object.values(jobs)) {
        if (isScheduledJob(job)) {
            setInterval(() => void job.run(), job.interval).unref();
        }
    }
};
