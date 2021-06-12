enum lamington_db {
    users = "users",
    meals = "meals",
    meal_ratings = "meal_ratings",
    meal_categories = "meal_categories",
    categories = "categories",
    meal_roster = "meal_roster"
}

enum users {
    id = "users.id",
    email = "users.email",
    firstName = "users.firstName",
    lastName = "users.lastName",
    password = "users.password",
    created = "users.created",
    status = "users.status",
}

enum meals {
    id = "meals.id",
    name = "meals.name",
    recipe = "meals.recipe",
    ingredients = "meals.ingredients",
    method = "meals.method",
    notes = "meals.notes",
    photo = "meals.photo",
    createdBy = "meals.createdBy",
    timesCooked = "meals.timesCooked",
}

enum meal_ratings {
    mealId = "meal_ratings.mealId",
    raterId = "meal_ratings.raterId",
    rating = "meal_ratings.rating"
}

enum meal_categories {
    mealId = "meal_categories.mealId",
    categoryId = "meal_categories.categoryId"
}

enum meal_roster {
    mealId = "meal_roster.mealId",
    assigneeId = "meal_roster.assigneeId",
    assignmentDate = "meal_roster.assignmentDate",
    assignerId = "meal_roster.assignerId",
    cooked = "meal_roster.cooked"
}

enum categories {
    id = "categories.id",
    name = "categories.name"
}

export { lamington_db, users, meals, meal_ratings, meal_categories, meal_roster, categories }