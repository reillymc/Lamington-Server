import type { KnexDatabase } from "../../src/database/index.ts";
import { type User, UserStatus } from "../../src/routes/spec/index.ts";
import { createToken } from "../../src/services/index.ts";
import { CreateUsers } from "./database.ts";

export const PrepareAuthenticatedUser = async (
    database: KnexDatabase,
    status: UserStatus = UserStatus.Member
): Promise<[{ Authorization: string }, User]> => {
    const [user] = await CreateUsers(database, { status });

    const token = createToken(user!.userId);

    return [{ Authorization: `Bearer ${token}` }, user!];
};
