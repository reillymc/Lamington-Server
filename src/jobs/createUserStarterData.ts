import type { AppRepositories } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import { createJob } from "./job.ts";

interface CreateUserStarterDataJobConfig {
    repositories: Pick<
        AppRepositories,
        | "listRepository"
        | "bookRepository"
        | "recipeRepository"
        | "plannerRepository"
    >;
    logger: Logger;
}

export const createUserStarterDataJob = createJob<
    [userId: string],
    CreateUserStarterDataJobConfig
>(
    ({
        repositories: {
            listRepository,
            bookRepository,
            recipeRepository,
            plannerRepository,
        },
        logger,
    }) => ({
        run: async (userId) => {
            try {
                const {
                    lists: [list],
                } = await listRepository.create({
                    userId,
                    lists: [
                        {
                            name: "My Shopping List",
                            description: "A list of groceries I need to buy",
                        },
                    ],
                });

                if (list) {
                    await listRepository.createItems({
                        userId,
                        listId: list.listId,
                        items: [
                            {
                                name: "Example item",
                                notes: "You can tap to edit me, or swipe left to delete me",
                            },
                        ],
                    });
                }

                const {
                    books: [book],
                } = await bookRepository.create({
                    userId,
                    books: [
                        {
                            name: "Favourite Recipes",
                            description:
                                "A recipe book for all my favourite recipes",
                        },
                    ],
                });

                const { recipes } = await recipeRepository.create({
                    userId,
                    recipes: [
                        {
                            name: "Example Recipe",
                            public: false,
                            ingredients: [
                                {
                                    name: "This is an ingredient section",
                                    description:
                                        "Ingredients can be added in a simple list above, and/or divided into sections like this one",
                                    items: [],
                                },
                            ],
                            method: [
                                {
                                    name: "This is a method section",
                                    description:
                                        "Steps can be added in a simple list above, and/or divided into sections like this one",
                                    items: [],
                                },
                            ],
                            tips: "There are many other entries you can use to create your recipe, such as adding a photo, recording the prep/cook time, servings, additional details, source and more.",
                        },
                    ],
                });

                if (book) {
                    await bookRepository.saveRecipes({
                        bookId: book.bookId,
                        recipes,
                    });
                }

                const { planners } = await plannerRepository.create({
                    userId,
                    planners: [
                        {
                            name: "My Meal Planner",
                            description:
                                "A planner for all the meals I want to cook",
                        },
                    ],
                });

                const [planner] = planners;
                const [recipe] = recipes;

                if (planner && recipe) {
                    await plannerRepository.createMeals({
                        userId,
                        plannerId: planner.plannerId,
                        meals: [
                            {
                                recipeId: recipe.recipeId,
                                year: new Date().getFullYear(),
                                month: new Date().getMonth(),
                                dayOfMonth: new Date().getDate(),
                                course: "lunch",
                            },
                            {
                                year: new Date().getFullYear(),
                                month: new Date().getMonth(),
                                dayOfMonth: new Date().getDate(),
                                course: "breakfast",
                                description: "Example meal with no recipe",
                            },
                        ],
                    });
                }

                return true;
            } catch (error) {
                logger.error("Failed to create user starter data", error);
                throw error;
            }
        },
    }),
);
