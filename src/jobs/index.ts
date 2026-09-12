import type { Logger } from "../utils/logger.ts";
import type { Job } from "./job.ts";

export type AppJobs = {
    refreshIngredientsAsset: Job;
    createUserStarterData: Job<[userId: string]>;
    purgeDeletedUsers: Job;
};

const isStartupJob = (job: AppJobs[keyof AppJobs]): job is Job =>
    "trigger" in job && (job.trigger?.includes("startup") ?? false);

const isScheduledJob = (job: AppJobs[keyof AppJobs]): job is Job =>
    "trigger" in job &&
    (job.trigger?.includes("interval") ?? false) &&
    typeof job.interval === "number";

/**
 * Fire all startup-triggered jobs without blocking. Each job is expected to
 * handle its own errors; any error that still escapes is logged rather than
 * crashing or delaying server start.
 */
export const runStartupJobs = (jobs: AppJobs, logger: Logger) => {
    for (const job of Object.values(jobs)) {
        if (isStartupJob(job)) {
            void job
                .run()
                .catch((error) =>
                    logger.error("Unhandled startup job error", error),
                );
        }
    }
};

/**
 * Schedule all interval-triggered jobs. Each job runs on a repeating timer
 * which is unref'd so it never keeps the process alive or blocks shutdown.
 */
export const runScheduledJobs = (jobs: AppJobs, logger: Logger) => {
    for (const job of Object.values(jobs)) {
        if (isScheduledJob(job)) {
            setInterval(
                () =>
                    void job
                        .run()
                        .catch((error) =>
                            logger.error(
                                "Unhandled scheduled job error",
                                error,
                            ),
                        ),
                job.interval,
            ).unref();
        }
    }
};
