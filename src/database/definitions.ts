enum lamington_db {
    meals = "meals",
    meal_ratings = "meal_ratings",
    meal_categories = "meal_categories"
}

enum meals {
    id = "id",
    name = "name",
    recipe = "recipe",
    ingredients = "ingredients",
    method = "method",
    notes = "notes",
    photo = "photo",
    createdBy = "createdBy",
    timesCooked = "timesCooked",
}

enum meal_ratings {
    mealId = "mealId",
    raterId = "raterId",
    rating = "rating"
}

enum meal_categories {
    mealId = "mealId",
    categoryId = "categoryId"
}

export { lamington_db, meals, meal_ratings, meal_categories }