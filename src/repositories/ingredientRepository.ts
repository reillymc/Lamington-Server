import type { Database, RepositoryService } from "./repository.ts";
import type { User } from "./userRepository.ts";

export interface Ingredient {
    ingredientId: string;
    name: string;
    namePlural: string | null;
    description: string | null;
    owner: {
        userId: User["userId"];
        firstName: User["firstName"];
    } | null;
}

type ReadRequest = {
    userId?: User["userId"];
};

type ReadResponse = {
    userId?: User["userId"];
    ingredients: ReadonlyArray<Ingredient>;
};

type CreateRequest = {
    userId: User["userId"];
    ingredients: ReadonlyArray<{
        name: Ingredient["name"];
        namePlural?: Ingredient["namePlural"];
        description?: Ingredient["description"];
    }>;
};

type CreateResponse = {
    userId: User["userId"];
    ingredients: ReadonlyArray<Ingredient>;
};

type VerifyPermissionsRequest = {
    userId: User["userId"];
    ingredients: ReadonlyArray<{
        ingredientId: Ingredient["ingredientId"];
    }>;
};

type VerifyPermissionsResponse = {
    userId: User["userId"];
    ingredients: ReadonlyArray<{
        ingredientId: Ingredient["ingredientId"];
        hasPermissions: boolean;
    }>;
};

export interface IngredientRepository<TDatabase extends Database = Database> {
    readAll: RepositoryService<TDatabase, ReadRequest, ReadResponse>;
    create: RepositoryService<TDatabase, CreateRequest, CreateResponse>;
    verifyPermissions: RepositoryService<
        TDatabase,
        VerifyPermissionsRequest,
        VerifyPermissionsResponse
    >;
}
