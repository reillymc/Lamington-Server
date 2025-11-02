import { type Knex } from "knex";
import { clearDatabase } from "../helpers.ts";

export const seed = async (knex: Knex): Promise<void> => {
    await clearDatabase(knex);
};
