import type { AppRepositories, Database } from "../repositories/index.ts";
import type { Logger } from "../utils/logger.ts";
import type { CreateJob } from "./job.ts";

interface CreateUserStarterDataJobParams {
    database: Database;
    repositories: Pick<
        AppRepositories,
        | "listRepository"
        | "bookRepository"
        | "recipeRepository"
        | "plannerRepository"
    >;
    logger: Logger;
}

type RunParams = [userId: string];

export const createUserStarterDataJob: CreateJob<
    CreateUserStarterDataJobParams,
    RunParams
> = ({
    database,
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
            await database.transaction(async (trx) => {
                const {
                    lists: [list],
                } = await listRepository.create(trx, {
                    userId,
                    lists: [
                        {
                            name: "My Shopping List",
                            description: "A list of groceries I need to buy",
                        },
                    ],
                });

                if (list) {
                    await listRepository.createItems(trx, {
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
                } = await bookRepository.create(trx, {
                    userId,
                    books: [
                        {
                            name: "Favourite Recipes",
                            description:
                                "A recipe book for all my favourite recipes",
                        },
                    ],
                });

                const { recipes } = await recipeRepository.create(trx, {
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
                    await bookRepository.saveRecipes(trx, {
                        bookId: book.bookId,
                        recipes,
                    });
                }

                const { planners } = await plannerRepository.create(trx, {
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
                    await plannerRepository.createMeals(trx, {
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
            });

            return true;
        } catch (error) {
            logger.error("Failed to create user starter data", error);
            return false;
        }
    },
});
