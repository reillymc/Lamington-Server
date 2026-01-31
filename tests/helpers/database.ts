import { v4 as uuid } from "uuid";

import type { KnexDatabase } from "../../src/repositories/knex/knex.ts";
import { KnexUserRepository } from "../../src/repositories/knex/knexUserRepository.ts";
import type { components } from "../../src/routes/spec/index.ts";
import { hashPassword } from "../../src/services/userService.ts";

const randomEmail = () => `${uuid()}@${uuid()}.${uuid()}`;

export const CreateUsers = async (
    database: KnexDatabase,
    {
        count = 1,
        status = "M",
    }: { count?: number; status?: components["schemas"]["UserStatus"] } = {},
) => {
    const seedUsers = Array.from({ length: count }, () => ({
        email: randomEmail(),
        firstName: uuid(),
        lastName: uuid(),
        password: uuid(),
        status,
    }));

    const usersToInsert = await Promise.all(
        seedUsers.map(async ({ password, ...user }) => ({
            ...user,
            password: await hashPassword(password),
        })),
    );

    const passwordByEmail = new Map(
        seedUsers.map((user) => [user.email, user.password]),
    );

    const { users: createdUsers } = await KnexUserRepository.create(database, {
        users: usersToInsert,
    });

    return createdUsers.map((user) => ({
        ...user,
        password: passwordByEmail.get(user.email)!,
    }));
};
