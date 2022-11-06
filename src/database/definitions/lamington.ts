import { Category } from "./category";
import { Ingredient } from "./ingredient";

export type Table<T> = { [key in keyof T]: string };

interface Lamington {
    category: Category;
    ingredient: Ingredient;
}

export enum lamington {
    user = "user",
    meal = "meal",
    mealRating = "meal_rating",
    mealCategory = "meal_category",
    mealRoster = "meal_roster",
    mealIngredient = "meal_ingredient",
    mealStep = "meal_step",
    mealSection = "meal_section",
    category = "category",
    ingredient = "ingredient",
    list = "list",
    listItem = "list_item",
    listMember = "list_member",
}

// TODO: update definitions
export enum mealRoster {
    mealId = "meal_roster.mealId",
    assigneeId = "meal_roster.assigneeId",
    assignmentDate = "meal_roster.assignmentDate",
    assignerId = "meal_roster.assignerId",
    cooked = "meal_roster.cooked",
}
