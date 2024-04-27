import { DeleteService, Meal, ReadService, SaveService } from "../../database";

export type PlannerMeal = Pick<
    Meal,
    "id" | "plannerId" | "year" | "month" | "dayOfMonth" | "meal" | "description" | "recipeId" | "createdBy" | "source"
> & { plannerId: string; year: number; month: number; dayOfMonth: number };

export interface PlannerMealService {
    /**
     * Deletes meals by meal ids
     * @security Insecure: route authentication check required (user delete permission on meals)
     */
    Delete: DeleteService<Meal, "id">;

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
