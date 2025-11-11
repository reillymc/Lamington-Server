import type { Content } from "../../database/definitions/content.ts";
import type { DeleteService, Meal, ReadService, SaveService } from "../../database/index.ts";

export type PlannerMeal = Pick<
    Meal,
    "mealId" | "plannerId" | "year" | "month" | "dayOfMonth" | "meal" | "description" | "recipeId" | "source"
> & { plannerId: string; year: number; month: number; dayOfMonth: number; createdBy: Content["createdBy"] };

export interface PlannerMealService {
    /**
     * Deletes meals by meal ids
     * @security Insecure: route authentication check required (user delete permission on meals)
     */
    Delete: DeleteService<Meal, "mealId">;

    /**
     * Get planner meals by id or ids
     * @security Insecure: no authentication checks required
     * @returns an array of meals matching given ids
     */
    Read: ReadService<PlannerMeal, "plannerId" | "year" | "month">;

    /**
     * Creates or Saves a new list from params
     * @security Insecure: route authentication check required (user save permission on meals)
     * @returns the newly created meals
     */
    Save: SaveService<PlannerMeal>;
}
