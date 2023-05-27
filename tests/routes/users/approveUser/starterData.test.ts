import request from "supertest";

import app from "../../../../src/app";
import { CleanTables, CreateUsers, GenerateToken } from "../../../helpers";
import { PostUserApprovalRequestBody, UserStatus } from "../../../../src/routes/spec";
import { UserEndpoint } from "../../../helpers/api";
import {
    BookRecipeActions,
    InternalBookActions,
    InternalPlannerMealActions,
    ListActions,
    ListItemActions,
    PlannerActions,
    RecipeActions,
    UserActions,
} from "../../../../src/controllers";

beforeEach(async () => {
    await CleanTables("user", "list", "list_item", "book", "recipe", "book_recipe", "planner", "planner_meal");
});

afterAll(async () => {
    await CleanTables("user", "list", "list_item", "book", "recipe", "book_recipe", "planner", "planner_meal");
});

test("should create sample data for pending => registered user", async () => {
    const adminToken = await GenerateToken(UserStatus.Administrator);

    const [user] = await CreateUsers({ status: UserStatus.Pending });
    if (!user) throw new Error("User not created");

    const response = await request(app)
        .post(UserEndpoint.approveUser(user.userId))
        .set(adminToken)
        .send({ accept: true } as PostUserApprovalRequestBody);
    expect(response.statusCode).toEqual(200);

    const [updatedUser] = await UserActions.read({ userId: user.userId });
    expect(updatedUser?.status).toEqual(UserStatus.Registered);

    const lists = await ListActions.readAll();
    expect(lists.length).toEqual(1);

    const [list] = lists;
    if (!list) throw new Error("List not created");
    expect(list.createdBy).toEqual(user.userId);

    const listItems = await ListItemActions.read({ listId: list.listId });
    expect(listItems.length).toEqual(1);

    const books = await InternalBookActions.readAll();
    expect(books.length).toEqual(1);

    const [book] = books;
    if (!book) throw new Error("Book not created");
    expect(book.createdBy).toEqual(user.userId);

    const recipes = await RecipeActions.readMy(user.userId);
    expect(recipes.length).toEqual(1);

    const [recipe] = recipes;
    if (!recipe) throw new Error("Recipe not created");
    expect(recipe.createdBy.userId).toEqual(user.userId);

    const bookRecipes = await BookRecipeActions.read({ bookId: book.bookId });
    expect(bookRecipes.length).toEqual(1);

    const [bookRecipe] = bookRecipes;
    if (!bookRecipe) throw new Error("BookRecipe not created");
    expect(bookRecipe.recipeId).toEqual(recipe.recipeId);

    const planners = await PlannerActions.readMy({ userId: user.userId });
    expect(planners.length).toEqual(1);

    const [planner] = planners;
    if (!planner) throw new Error("Planner not created");
    expect(planner.createdBy).toEqual(user.userId);

    const meals = await InternalPlannerMealActions.readAll({ plannerId: planner.plannerId });
    expect(meals.length).toEqual(2);

    const [meal1, meal2] = meals;
    if (!meal1 || !meal2) throw new Error("PlannerMeal not created");
    expect(meal1.createdBy).toEqual(user.userId);
    expect(meal2.createdBy).toEqual(user.userId);
});
