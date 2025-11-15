export const lamington = {
    attachment: "attachment",
    book: "book",
    bookRecipe: "book_recipe",
    content: "content",
    contentAttachment: "content_attachment",
    contentMember: "content_member",
    contentNote: "content_note",
    contentTag: "content_tag",
    ingredient: "ingredient",
    list: "list",
    listItem: "list_item",
    planner: "planner",
    plannerMeal: "planner_meal",
    recipe: "recipe",
    recipeIngredient: "recipe_ingredient",
    recipeRating: "recipe_rating",
    recipeSection: "recipe_section",
    recipeStep: "recipe_step",
    tag: "tag",
    user: "user",
} as const;

export type lamington = typeof lamington;
