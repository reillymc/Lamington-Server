export enum lamington {
    users = "users",
    meals = "meals",
    mealRatings = "meal_ratings",
    mealCategories = "meal_categories",
    mealRoster = "meal_roster",
    mealIngredients = "meal_ingredients",
    mealSteps = "meal_steps",
    categories = "categories",
    ingredients = "ingredients",
}

export enum users {
    id = "users.id",
    email = "users.email",
    firstName = "users.firstName",
    lastName = "users.lastName",
    password = "users.password",
    created = "users.created",
    status = "users.status",
}

export enum meals {
    id = "meals.id",
    name = "meals.name",
    source = "meals.source",
    ingredients = "meals.ingredients",
    method = "meals.method",
    notes = "meals.notes",
    photo = "meals.photo",
    servings = "meals.servings",
    prepTime = "meals.prepTime",
    cookTime = "meals.cookTime",
    createdBy = "meals.createdBy",
    timesCooked = "meals.timesCooked",
}

export enum mealRatings {
    mealId = "meal_ratings.mealId",
    raterId = "meal_ratings.raterId",
    rating = "meal_ratings.rating",
}

/**
 * Contains the advanced ingredient list recipe, where each ingredient is it's own entity.
 */
export enum mealIngredients {
    id = "meal_ingredients.id",
    mealId = "meal_ingredients.mealId",
    ingredientId = "meal_ingredients.ingredientId",
    unit = "meal_ingredients.unit",
    quantity = "meal_ingredients.quantity",
    section = "meal_ingredients.section",
    notes = "meal_ingredients.notes",
}

/**
 * Contains the advanced method for a recipe, where each step in the method is it's own entity.
 */
export enum mealSteps {
    id = "meal_steps.id",
    mealId = "meal_steps.mealId",
    number = "meal_steps.number",
    step = "meal_steps.step",
    section = "meal_steps.section",
    notes = "meal_steps.notes",
}

export enum mealCategories {
    mealId = "meal_categories.mealId",
    categoryId = "meal_categories.categoryId",
}

export enum mealRoster {
    mealId = "meal_roster.mealId",
    assigneeId = "meal_roster.assigneeId",
    assignmentDate = "meal_roster.assignmentDate",
    assignerId = "meal_roster.assignerId",
    cooked = "meal_roster.cooked",
}

export enum ingredients {
    id = "ingredients.id",
    name = "ingredients.name",
    notes = "ingredients.notes",
}

export enum categories {
    id = "categories.id",
    type = "categories.type",
    name = "categories.name",
    notes = "categories.notes",
}

