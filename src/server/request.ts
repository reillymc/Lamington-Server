import { Meal as BaseMeal, MealCategories } from "./parameters";

// Create Meal Request
export interface CreateMeal extends Partial<Omit<BaseMeal, "ratingAverage" | "createdBy">> {

}
