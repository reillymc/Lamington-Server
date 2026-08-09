import type { UserRepository } from "../../src/repositories/userRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { createAccessToken } from "../../src/services/userService.ts";
import { CreateUsers } from "./database.ts";
import { accessSecret } from "./setup.ts";

export const PrepareAuthenticatedUser = async (
    userRepository: UserRepository,
    status: components["schemas"]["UserStatus"] = "M",
) => {
    const [user] = await CreateUsers(userRepository, { status });

    const token = createAccessToken(accessSecret, 1000, user!);

    return [{ Authorization: `Bearer ${token}` }, user!] as const;
};
