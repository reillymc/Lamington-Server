import type { components } from "../routes/spec/index.ts";
import type { PopulateAttachmentUri } from "../utils/attachmentUri.ts";
import { type CreateService, NotFoundError } from "./service.ts";

export interface MealService {
    get: (
        userId: string,
        mealId: string,
    ) => Promise<components["schemas"]["Meal"]>;
}

export const createMealService: CreateService<
    MealService,
    "mealRepository" | "plannerRepository",
    never,
    { populateAttachmentUri: PopulateAttachmentUri }
> = (database, { mealRepository }, { populateAttachmentUri }) => ({
    get: async (userId, mealId) => {
        const { meals } = await mealRepository.read(database, {
            userId,
            meals: [{ mealId }],
        });
        const [meal] = meals;

        if (!meal) {
            throw new NotFoundError("meal", mealId);
        }

        return populateAttachmentUri(meal, "heroImage");
    },
});
