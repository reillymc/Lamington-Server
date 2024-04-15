import { Knex } from "knex";
import { clearDatabase } from "../helpers";

export const seed = async (knex: Knex): Promise<void> => {
    await clearDatabase(knex);
};
