import bcrypt from "bcrypt";
import { v4 as Uuid } from "uuid";
import { UniqueViolationError } from "../repositories/common/errors.ts";
import { type components, UserStatus } from "../routes/spec/index.ts";
import {
    CreatedDataFetchError,
    createToken,
    InvalidOperationError,
    NotFoundError,
    PermissionError,
    UnauthorizedError,
} from "./index.ts";
import type { CreateService } from "./service.ts";

const saltRounds = 10;

export const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
};

export const comparePassword = async (password?: string, hash?: string) => {
    if (!hash || !password) return false;
    return bcrypt.compare(password, hash);
};

export interface UserService {
    approve(userId: string, userToApproveId: string): Promise<void>;
    blacklist(userId: string, userToBlacklistId: string): Promise<void>;
    delete(userId: string, userToDeleteId: string): Promise<void>;
    deleteProfile(userId: string): Promise<void>;

    getAll(
        userId: string,
        status?: components["schemas"]["UserStatus"],
    ): Promise<ReadonlyArray<components["schemas"]["User"]>>;
    getProfile(userId: string): Promise<components["schemas"]["User"]>;
    readCredentials(filter: { email: string } | { userId: string }): Promise<
        ReadonlyArray<{
            userId: string;
            email: string;
            password: string;
            status: components["schemas"]["UserStatus"];
        }>
    >;

    login(
        credentials: components["schemas"]["AuthLogin"],
    ): Promise<components["schemas"]["AuthResponse"]>;
    register(
        user: components["schemas"]["AuthRegister"],
    ): Promise<components["schemas"]["AuthRegisterResponse"]>;
}

export const createUserService: CreateService<
    UserService,
    | "userRepository"
    | "listRepository"
    | "bookRepository"
    | "recipeRepository"
    | "plannerRepository"
> = (
    database,
    {
        userRepository,
        bookRepository,
        listRepository,
        plannerRepository,
        recipeRepository,
    },
) => ({
    getAll: async (userId, status) => {
        const { hasPermissions } = await userRepository.verifyPermissions(
            database,
            {
                userId,
                status: [UserStatus.Administrator, UserStatus.Owner],
            },
        );
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        const { users } = await userRepository.readAll(database, {
            filter: { status },
        });
        return users.filter((u) => u.userId !== userId);
    },
    approve: async (userId, userToApproveId) => {
        const { hasPermissions } = await userRepository.verifyPermissions(
            database,
            {
                userId,
                status: [UserStatus.Administrator, UserStatus.Owner],
            },
        );
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        const {
            users: [user],
        } = await userRepository.read(database, {
            users: [{ userId: userToApproveId }],
        });

        if (!user) {
            throw new NotFoundError("user", userId);
        }

        const {
            users: [updatedUser],
        } = await userRepository.update(database, {
            users: [{ userId: userToApproveId, status: UserStatus.Member }],
        });

        if (
            user.status === UserStatus.Pending &&
            updatedUser?.status === UserStatus.Member
        ) {
            const {
                lists: [list],
            } = await listRepository.create(database, {
                userId: userToApproveId,
                lists: [
                    {
                        name: "My Shopping List",
                        description: "A list of groceries I need to buy",
                    },
                ],
            });

            if (list) {
                await listRepository.createItems(database, {
                    userId: userToApproveId,
                    listId: list.listId,
                    items: [
                        {
                            name: "Example item",
                            notes: "You can tap to edit me, or swipe left to delete me",
                        },
                    ],
                });
            }

            const {
                books: [book],
            } = await bookRepository.create(database, {
                userId: userToApproveId,
                books: [
                    {
                        name: "Favourite Recipes",
                        description:
                            "A recipe book for all my favourite recipes",
                    },
                ],
            });

            const { recipes } = await recipeRepository.create(database, {
                userId: userToApproveId,
                recipes: [
                    {
                        name: "Example Recipe",
                        public: false,
                        ingredients: [
                            {
                                sectionId: Uuid(),
                                name: "This is an ingredient section",
                                description:
                                    "Ingredients can be added in a simple list above, and/or divided into sections like this one",
                                items: [],
                            },
                        ],
                        method: [
                            {
                                sectionId: Uuid(),
                                name: "This is a method section",
                                description:
                                    "Steps can be added in a simple list above, and/or divided into sections like this one",
                                items: [],
                            },
                        ],
                        tips: "There are many other entries you can use to create your recipe, such as adding a photo, recording the prep/cook time, servings, additional details, source and more.",
                    },
                ],
            });

            if (book) {
                await bookRepository.saveRecipes(database, {
                    bookId: book.bookId,
                    recipes,
                });
            }

            const { planners } = await plannerRepository.create(database, {
                userId: userToApproveId,
                planners: [
                    {
                        name: "My Meal Planner",
                        description:
                            "A planner for all the meals I want to cook",
                    },
                ],
            });

            const [planner] = planners;
            const [recipe] = recipes;

            if (planner && recipe) {
                await plannerRepository.createMeals(database, {
                    userId: userToApproveId,
                    plannerId: planner.plannerId,
                    meals: [
                        {
                            recipeId: recipe.recipeId,
                            year: new Date().getFullYear(),
                            month: new Date().getMonth(),
                            dayOfMonth: new Date().getDate(),
                            course: "lunch",
                        },
                        {
                            year: new Date().getFullYear(),
                            month: new Date().getMonth(),
                            dayOfMonth: new Date().getDate(),
                            course: "breakfast",
                            description: "Example meal with no recipe",
                        },
                    ],
                });
            }
        }
    },
    blacklist: async (userId, userToBlacklistId) => {
        const { hasPermissions } = await userRepository.verifyPermissions(
            database,
            {
                userId,
                status: [UserStatus.Administrator, UserStatus.Owner],
            },
        );
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        const {
            users: [user],
        } = await userRepository.read(database, {
            users: [{ userId: userToBlacklistId }],
        });

        if (!user) {
            throw new NotFoundError("user", userId);
        }

        await userRepository.update(database, {
            users: [
                { userId: userToBlacklistId, status: UserStatus.Blacklisted },
            ],
        });
    },
    delete: async (userId, userToDeleteId) => {
        const { hasPermissions } = await userRepository.verifyPermissions(
            database,
            {
                userId,
                status: [UserStatus.Administrator, UserStatus.Owner],
            },
        );
        if (!hasPermissions) {
            throw new PermissionError("user");
        }
        await userRepository.delete(database, {
            users: [{ userId: userToDeleteId }],
        });
    },
    getProfile: async (userId) => {
        const {
            users: [user],
        } = await userRepository.read(database, { users: [{ userId }] });
        if (!user) {
            throw new NotFoundError("user", userId);
        }
        return user;
    },
    deleteProfile: async (userId) => {
        await userRepository.delete(database, { users: [{ userId }] });
    },
    register: async (user) => {
        const password = await hashPassword(user.password);
        try {
            const { users } = await userRepository.create(database, {
                users: [
                    {
                        ...user,
                        email: user.email.toLowerCase(),
                        password,
                        status: UserStatus.Pending,
                    },
                ],
            });

            const [createdUser] = users;

            if (!createdUser) {
                throw new CreatedDataFetchError("user");
            }

            return {
                user: {
                    userId: createdUser.userId,
                    email: createdUser.email,
                    status: createdUser.status,
                },
            };
        } catch (e: unknown) {
            if (e instanceof UniqueViolationError) {
                throw new InvalidOperationError("user");
            }
            throw e;
        }
    },
    login: async ({ email, password }) => {
        const {
            users: [user],
        } = await userRepository.readCredentials(database, {
            users: [{ email }],
        });

        if (!user) {
            throw new UnauthorizedError();
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            throw new UnauthorizedError();
        }

        const userPending = user.status === UserStatus.Pending;
        const token = !userPending ? createToken(user.userId) : undefined;
        const message = userPending ? "Account is pending approval" : undefined;

        return {
            authorization: token ? { token, tokenType: "Bearer" } : undefined,
            user: {
                userId: user.userId,
                email: user.email,
                status: user.status,
            },
            message,
        };
    },
    readCredentials: async (filter) => {
        const { users } = await userRepository.readCredentials(database, {
            users: [filter],
        });
        return users;
    },
});
