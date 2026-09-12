import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import type { Knex } from "knex";
import { SYSTEM_USER_ID } from "../../utils/systemUser.ts";

export const up = async (knex: Knex): Promise<void> => {
    const salt = await bcrypt.genSalt();

    await knex("user")
        .insert({
            userId: SYSTEM_USER_ID,
            email: "system@lamington.internal",
            firstName: "System",
            lastName: "User",
            password: await bcrypt.hash(randomUUID(), salt),
            status: "B",
        })
        .onConflict("userId")
        .ignore();

    await knex("content")
        .whereNull("createdBy")
        .update({ createdBy: SYSTEM_USER_ID });
};

export const down = async (knex: Knex): Promise<void> => {
    await knex("content")
        .where({ createdBy: SYSTEM_USER_ID })
        .update({ createdBy: null });

    await knex("user").where({ userId: SYSTEM_USER_ID }).delete();
};
