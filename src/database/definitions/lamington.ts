export const lamington = {
    book: "book",
    bookMember: "book_member",
    bookRecipe: "book_recipe",
    ingredient: "ingredient",
    list: "list",
    listItem: "list_item",
    listMember: "list_member",
    planner: "planner",
    plannerMember: "planner_member",
    plannerMeal: "planner_meal",
    recipe: "recipe",
    recipeIngredient: "recipe_ingredient",
    recipeRating: "recipe_rating",
    recipeNote: "recipe_note",
    recipeSection: "recipe_section",
    recipeStep: "recipe_step",
    recipeTag: "recipe_tag",
    tag: "tag",
    user: "user",
} as const;

export type lamington = (typeof lamington)[keyof typeof lamington];
