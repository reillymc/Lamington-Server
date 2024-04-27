import { Knex } from "knex";
import { lamington } from "../definitions";

export const clearDatabase = async (knex: Knex): Promise<void> => {
    // Delete ALL existing entries
    await knex(lamington.bookMember).del();
    await knex(lamington.listMember).del();
    await knex(lamington.plannerMember).del();
    await knex(lamington.listItem).del();
    await knex(lamington.recipeTag).del();
    await knex(lamington.bookRecipe).del();
    await knex(lamington.plannerMeal).del();
    await knex(lamington.recipeRating).del();
    await knex(lamington.recipeIngredient).del();
    await knex(lamington.recipeStep).del();
    await knex(lamington.recipeSection).del();
    await knex(lamington.recipeNote).del();
    await knex(lamington.tag).del();
    await knex(lamington.book).del();
    await knex(lamington.ingredient).del();
    await knex(lamington.list).del();
    await knex(lamington.planner).del();
    await knex(lamington.recipe).del();
    await knex(lamington.user).del();
};
