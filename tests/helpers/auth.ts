import type { KnexDatabase } from "../../src/database/index.ts";
import { UserStatus } from "../../src/routes/spec/index.ts";
import { createAccessToken } from "../../src/services/index.ts";
import { CreateUsers } from "./database.ts";

export const PrepareAuthenticatedUser = async (
    database: KnexDatabase,
    status: UserStatus = UserStatus.Member,
) => {
    const [user] = await CreateUsers(database, { status });

    const token = createAccessToken(user!.userId, status);

    return [{ Authorization: `Bearer ${token}` }, user!] as const;
};
