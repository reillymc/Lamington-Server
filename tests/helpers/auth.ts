import { User, UserStatus } from "../../src/routes/spec";
import { createToken } from "../../src/services";
import { CreateUsers } from "./database";

export const PrepareAuthenticatedUser = async (
    status = UserStatus.Member
): Promise<[{ Authorization: string }, User]> => {
    const [user] = await CreateUsers({ status });

    const token = createToken(user!.userId);

    return [{ Authorization: `Bearer ${token}` }, user!];
};
