import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { createAccessToken } from "../../src/services/index.ts";
import { CreateUsers } from "./database.ts";

export const PrepareAuthenticatedUser = async (
    database: KnexDatabase,
    status: components["schemas"]["UserStatus"] = "M",
) => {
    const [user] = await CreateUsers(database, { status });

    const token = createAccessToken(user!.userId, status);

    return [{ Authorization: `Bearer ${token}` }, user!] as const;
};
