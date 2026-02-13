import bcrypt from "bcrypt";
import type { Knex } from "knex";
import { v4 } from "uuid";

export async function up(knex: Knex): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
        return;
    }

    const password = process.env.ADMIN_ACCOUNT_PASSWORD;
    const email = process.env.ADMIN_ACCOUNT_NAME;

    if (!password || !email) {
        throw new Error("NO ADMINISTRATOR ACCOUNT DETAILS PROVIDED");
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = bcrypt.hash(password, salt);

    await knex("user")
        .insert([
            {
                userId: v4(),
                email,
                firstName: "admin",
                lastName: "",
                password: hashedPassword,
                status: "A",
                preferences: "{}",
            },
        ])
        .onConflict("userId")
        .merge();
}

export async function down(_knex: Knex): Promise<void> {
    // do nothing, we don't need to remove the admin account.
}
