import { UserStatus } from "../../src/routes/spec";
import { createToken } from "../../src/services";
import { CreateUsers } from "./database";

export const GenerateToken = async (status: UserStatus) => {
    const [user] = await CreateUsers({ status });
    const token = createToken(user!.userId);

    return { Authorization: `Bearer ${token}` };
};
