import type { Knex } from "knex";
import { v4 } from "uuid";
import { hashPassword } from "../../services/password";
import { User, lamington } from "../definitions";

export async function up(knex: Knex): Promise<void> {
    const password = process.env.ADMIN_ACCOUNT_PASSWORD;
    const email = process.env.ADMIN_ACCOUNT_NAME;

    if (!password || !email) {
        throw new Error("NO ADMINISTRATOR ACCOUNT DETAILS PROVIDED");
    }

    await knex<User>(lamington.user)
        .insert([
            {
                userId: v4(),
                email,
                firstName: "admin",
                lastName: "",
                password: await hashPassword(password),
                status: "A",
                preferences: "{}",
            },
        ])
        .onConflict("userId")
        .merge();
}

export async function down(knex: Knex): Promise<void> {
    // do nothing, we don't need to remove the admin account.
}
