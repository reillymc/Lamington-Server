import { Knex } from "knex";
import { hashPassword } from "../../../services/password";
import { User, lamington } from "../../definitions";

// Admin user - will be updated to match details set in .env each start-up
export const seed = async (knex: Knex): Promise<void> => {
    const password = process.env.ADMIN_ACCOUNT_PASSWORD;
    const email = process.env.ADMIN_ACCOUNT_NAME;

    if (!password || !email)  {
        throw new Error("NO ADMINISTRATOR ACCOUNT DETAILS PROVIDED")
    }
    
    await knex<User>(lamington.user)
        .insert([
            {
                userId: "00000000-0000-0000-0000-000000000000",
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
};
