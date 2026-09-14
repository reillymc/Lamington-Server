const DEFAULT_CONCURRENCY = 25;

/**
 *   Maps each item through an async operation in bounded batches, preserving
 *   the order of the input. Batching keeps large operations from exhausting
 *   file descriptors or overwhelming storage with unbounded concurrency.
 */
export const mapInBatches = async <TItem, TResult>(
    mapOne: (item: TItem) => Promise<TResult>,
    items: ReadonlyArray<TItem>,
    concurrency = DEFAULT_CONCURRENCY,
): Promise<ReadonlyArray<TResult>> => {
    const results: Array<TResult> = [];
    const batchSize = Math.max(1, concurrency);

    for (let index = 0; index < items.length; index += batchSize) {
        const batch = items.slice(index, index + batchSize);
        results.push(...(await Promise.all(batch.map(mapOne))));
    }

    return results;
};
