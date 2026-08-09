import { afterEach, beforeEach } from "node:test";
import { expect } from "expect";
import { createUserStarterDataJob } from "../../src/jobs/createUserStarterData.ts";
import { CreateUsers } from "../helpers/index.ts";
import {
    beginTestTransaction,
    createTransactionRunner,
    repositories,
    rollbackTestTransaction,
    silentLogger,
    withCxIt,
} from "../helpers/setup.ts";

beforeEach(async () => {
    await beginTestTransaction();
});

afterEach(async () => {
    await rollbackTestTransaction();
});

const createJob = () =>
    createUserStarterDataJob({
        transaction: createTransactionRunner(),
        repositories: {
            listRepository: repositories.listRepository,
            bookRepository: repositories.bookRepository,
            recipeRepository: repositories.recipeRepository,
            plannerRepository: repositories.plannerRepository,
        },
        logger: silentLogger,
    });

withCxIt(
    "should create starter list, book, recipe, planner and meals for a user",
    async () => {
        const [user] = await CreateUsers(repositories.userRepository, {
            status: "P",
        });

        const result = await createJob().run(user!.userId);

        expect(result).toBe(true);

        const { lists } = await repositories.listRepository.readAll(user!);
        expect(lists.length).toEqual(1);

        const [list] = lists;
        expect(list!.owner.userId).toEqual(user!.userId);

        const { items } = await repositories.listRepository.readAllItems({
            userId: user!.userId,
            filter: list!,
        });
        expect(items.length).toEqual(1);

        const { books } = await repositories.bookRepository.readAll(user!);
        expect(books.length).toEqual(1);

        const [book] = books;
        expect(book!.owner.userId).toEqual(user!.userId);

        const { recipes } = await repositories.recipeRepository.readAll({
            userId: user!.userId,
            filter: { books: [book!] },
        });
        expect(recipes.length).toEqual(1);

        const [recipe] = recipes;
        expect(recipe!.owner.userId).toEqual(user!.userId);

        const { planners } = await repositories.plannerRepository.readAll(
            user!,
        );
        expect(planners.length).toEqual(1);

        const [planner] = planners;
        expect(planner!.owner.userId).toEqual(user!.userId);

        const { meals } = await repositories.plannerRepository.readAllMeals({
            userId: user!.userId,
            filter: planner!,
        });
        expect(meals.length).toEqual(2);
    },
);
