import type { Conn } from "../../src/database/index.ts";
import { type User, UserStatus } from "../../src/routes/spec/index.ts";
import { createToken } from "../../src/services/index.ts";
import { CreateUsers } from "./database.ts";

export const PrepareAuthenticatedUser = async (
    conn: Conn,
    status: UserStatus = UserStatus.Member
): Promise<[{ Authorization: string }, User]> => {
    const [user] = await CreateUsers(conn, { status });

    const token = createToken(user!.userId);

    return [{ Authorization: `Bearer ${token}` }, user!];
};
