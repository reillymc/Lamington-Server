import type { RepositoryMethod } from "./repository.ts";
import type { Owner } from "./types.ts";
import type { User } from "./userRepository.ts";

export interface Ingredient {
    ingredientId: string;
    name: string;
    namePlural: string | undefined;
    description: string | undefined;
    owner: Owner | undefined;
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

export interface IngredientRepository {
    readAll: RepositoryMethod<ReadRequest, ReadResponse>;
    create: RepositoryMethod<CreateRequest, CreateResponse>;
}
