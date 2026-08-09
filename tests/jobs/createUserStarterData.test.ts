import { after, afterEach, beforeEach, it } from "node:test";
import { expect } from "expect";
import { createUserStarterDataJob } from "../../src/jobs/createUserStarterData.ts";
import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexBookRepository } from "../../src/repositories/knex/knexBookRepository.ts";
import { KnexListRepository } from "../../src/repositories/knex/knexListRepository.ts";
import { KnexPlannerRepository } from "../../src/repositories/knex/knexPlannerRepository.ts";
import { KnexRecipeRepository } from "../../src/repositories/knex/knexRecipeRepository.ts";
import { CreateUsers } from "../helpers/index.ts";
import { db, silentLogger } from "../helpers/setup.ts";

let database: KnexDatabase;

beforeEach(async () => {
    database = await db.transaction();
});

afterEach(async () => {
    await database.rollback();
});

after(async () => {
    await db.destroy();
});

const createJob = (database: KnexDatabase) =>
    createUserStarterDataJob({
        database,
        repositories: {
            listRepository: KnexListRepository,
            bookRepository: KnexBookRepository,
            recipeRepository: KnexRecipeRepository,
            plannerRepository: KnexPlannerRepository,
        },
        logger: silentLogger,
    });

it("should create starter list, book, recipe, planner and meals for a user", async () => {
    const [user] = await CreateUsers(database, {
        status: "P",
    });

    const result = await createJob(database).run(user!.userId);

    expect(result).toBe(true);

    const { lists } = await KnexListRepository.readAll(database, user!);
    expect(lists.length).toEqual(1);

    const [list] = lists;
    expect(list!.owner.userId).toEqual(user!.userId);

    const { items } = await KnexListRepository.readAllItems(database, {
        userId: user!.userId,
        filter: list!,
    });
    expect(items.length).toEqual(1);

    const { books } = await KnexBookRepository.readAll(database, user!);
    expect(books.length).toEqual(1);

    const [book] = books;
    expect(book!.owner.userId).toEqual(user!.userId);

    const { recipes } = await KnexRecipeRepository.readAll(database, {
        userId: user!.userId,
        filter: { books: [book!] },
    });
    expect(recipes.length).toEqual(1);

    const [recipe] = recipes;
    expect(recipe!.owner.userId).toEqual(user!.userId);

    const { planners } = await KnexPlannerRepository.readAll(database, user!);
    expect(planners.length).toEqual(1);

    const [planner] = planners;
    expect(planner!.owner.userId).toEqual(user!.userId);

    const { meals } = await KnexPlannerRepository.readAllMeals(database, {
        userId: user!.userId,
        filter: planner!,
    });
    expect(meals.length).toEqual(2);
});
