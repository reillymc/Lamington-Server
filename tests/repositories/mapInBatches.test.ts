import { describe, it, mock } from "node:test";
import { expect } from "expect";
import { v4 as uuid } from "uuid";
import { mapInBatches } from "../../src/repositories/common/mapInBatches.ts";

describe("mapInBatches", () => {
    it("should not map anything for an empty list", async () => {
        const mapOne = mock.fn(async (_item: string) => true);

        await expect(mapInBatches(mapOne, [])).resolves.toEqual([]);

        expect(mapOne.mock.calls).toHaveLength(0);
    });

    it("should map every item preserving order", async () => {
        const items = [uuid(), uuid(), uuid()];
        const mapOne = mock.fn(async (item: string) => item.toUpperCase());

        await expect(mapInBatches(mapOne, items)).resolves.toEqual(
            items.map((item) => item.toUpperCase()),
        );

        expect(mapOne.mock.calls).toHaveLength(3);
    });

    it("should preserve input order when items complete out of order", async () => {
        const items = [30, 20, 10];

        const result = await mapInBatches(async (delay: number) => {
            await new Promise((resolve) => setTimeout(resolve, delay));
            return delay;
        }, items);

        expect(result).toEqual(items);
    });

    it("should propagate rejections", async () => {
        await expect(
            mapInBatches(async () => {
                throw new Error("failed");
            }, [uuid()]),
        ).rejects.toThrow("failed");
    });

    it("should bound the number of concurrent maps", async () => {
        const items = Array.from({ length: 6 }, () => uuid());

        let inFlight = 0;
        let maxInFlight = 0;

        await mapInBatches(
            async () => {
                inFlight += 1;
                maxInFlight = Math.max(maxInFlight, inFlight);
                await new Promise((resolve) => setImmediate(resolve));
                inFlight -= 1;
                return true;
            },
            items,
            2,
        );

        expect(maxInFlight).toEqual(2);
    });
});
