import {
    AttachmentServices,
    AuthServices,
    BookServices,
    IngredientServices,
    ListServices,
    PlannerServices,
    RecipeServices,
    TagServices,
    UserServices,
    approveSubpath,
    attachmentEndpoint,
    authEndpoint,
    bookEndpoint,
    bookMemberSubpath,
    imageSubpath,
    ingredientEndpoint,
    itemSubpath,
    listEndpoint,
    cookListEndpoint,
    listMemberSubpath,
    loginSubpath,
    mealSubpath,
    plannerEndpoint,
    plannerMemberSubpath,
    rateSubpath,
    recipeEndpoint,
    recipeSubpath,
    registerSubpath,
    tagEndpoint,
    uploadDirectory,
    usersEndpoint,
    CookListServices,
} from "../../src/routes/spec";

const ServerURL = "";
const ApiVersion = "v1";
const ApiUrl = `${ServerURL}/${ApiVersion}` as const;

type Endpoint = string | ((...param: string[]) => string);

export const AttachmentEndpoint = {
    postImage: `${ApiUrl}${attachmentEndpoint}/${imageSubpath}` as const,
    downloadImage: `${ApiUrl}${attachmentEndpoint}/${uploadDirectory}/` as const,
} as const satisfies Record<keyof AttachmentServices, Endpoint>;

export const AuthEndpoint = {
    login: `${ApiUrl}${authEndpoint}/${loginSubpath}` as const,
    register: `${ApiUrl}${authEndpoint}/${registerSubpath}` as const,
} as const satisfies Record<keyof AuthServices, Endpoint>;

export const BookEndpoint = {
    deleteBook: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}` as const,
    deleteBookRecipe: (bookId: string, recipeId: string) =>
        `${ApiUrl}${bookEndpoint}/${bookId}/${recipeSubpath}/${recipeId}` as const,
    getBook: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}` as const,
    getBooks: `${ApiUrl}${bookEndpoint}`,
    postBook: `${ApiUrl}${bookEndpoint}`,
    postBookRecipe: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}/${recipeSubpath}` as const,
    deleteBookMember: (bookId: string, memberId: string) =>
        `${ApiUrl}${bookEndpoint}/${bookId}/${bookMemberSubpath}/${memberId}` as const,
    postBookMember: (bookId: string) => `${ApiUrl}${bookEndpoint}/${bookId}/${bookMemberSubpath}` as const,
} as const satisfies Record<keyof BookServices, Endpoint>;

export const PlannerEndpoint = {
    deletePlanner: (plannerId: string) => `${ApiUrl}${plannerEndpoint}/${plannerId}` as const,
    deletePlannerMeal: (plannerId: string, id: string) =>
        `${ApiUrl}${plannerEndpoint}/${plannerId}/${mealSubpath}/${id}` as const,
    getPlanner: (plannerId: string, year?: string, month?: string) =>
        `${ApiUrl}${plannerEndpoint}/${plannerId}${
            year ? (`/${year}${month ? (`/${month}` as const) : ("" as const)}` as const) : ("" as const)
        }` as const,
    getPlanners: `${ApiUrl}${plannerEndpoint}`,
    postPlanner: `${ApiUrl}${plannerEndpoint}`,
    postPlannerMeal: (plannerId: string) => `${ApiUrl}${plannerEndpoint}/${plannerId}/${mealSubpath}` as const,
    deletePlannerMember: (plannerId: string, memberId: string) =>
        `${ApiUrl}${plannerEndpoint}/${plannerId}/${plannerMemberSubpath}/${memberId}` as const,
    postPlannerMember: (plannerId: string) =>
        `${ApiUrl}${plannerEndpoint}/${plannerId}/${plannerMemberSubpath}` as const,
} as const satisfies Record<keyof PlannerServices, Endpoint>;

export const CookListEndpoint = {
    getMeals: `${ApiUrl}${cookListEndpoint}` as const,
    deleteMeal: `${ApiUrl}${cookListEndpoint}` as const,
    postMeal: `${ApiUrl}${cookListEndpoint}` as const,
} as const satisfies Record<keyof CookListServices, Endpoint>;

export const IngredientEndpoint = {
    getIngredients: `${ApiUrl}${ingredientEndpoint}`,
    postIngredient: `${ApiUrl}${ingredientEndpoint}`,
} as const satisfies Record<keyof IngredientServices, Endpoint>;

export const ListEndpoint = {
    deleteList: (listId: string) => `${ApiUrl}${listEndpoint}/${listId}` as const,
    deleteListItem: (listId: string, itemId: string) =>
        `${ApiUrl}${listEndpoint}/${listId}/${itemSubpath}/${itemId}` as const,
    deleteListMember: (listId: string, memberId: string) =>
        `${ApiUrl}${listEndpoint}/${listId}/${listMemberSubpath}/${memberId}` as const,
    getList: (listId: string) => `${ApiUrl}${listEndpoint}/${listId}` as const,
    getLists: `${ApiUrl}${listEndpoint}`,
    postList: `${ApiUrl}${listEndpoint}`,
    postListItem: (listId: string) => `${ApiUrl}${listEndpoint}/${listId}/${itemSubpath}` as const,
    postListMember: (listId: string) => `${ApiUrl}${listEndpoint}/${listId}/${listMemberSubpath}` as const,
} as const satisfies Record<keyof ListServices, Endpoint>;

export const RecipeEndpoint = {
    deleteRecipe: (recipeId: string) => `${ApiUrl}${recipeEndpoint}/${recipeId}` as const,
    getRecipe: (recipeId: string) => `${ApiUrl}${recipeEndpoint}/${recipeId}` as const,
    getAllRecipes: `${ApiUrl}${recipeEndpoint}`,
    getMyRecipes: `${ApiUrl}${recipeEndpoint}/my`,
    postRecipe: `${ApiUrl}${recipeEndpoint}`,
    postRecipeRating: (recipeId: string) => `${ApiUrl}${recipeEndpoint}/${recipeId}/${rateSubpath}` as const,
} as const satisfies Record<keyof RecipeServices, Endpoint>;

export const TagEndpoint = {
    getTags: `${ApiUrl}${tagEndpoint}`,
} as const satisfies Record<keyof TagServices, Endpoint>;

export const UserEndpoint = {
    approveUser: (userId: string) => `${ApiUrl}${usersEndpoint}/${userId}/${approveSubpath}` as const,
    getPendingUsers: `${ApiUrl}${usersEndpoint}/pending`,
    getUsers: `${ApiUrl}${usersEndpoint}`,
} as const satisfies Record<keyof UserServices, Endpoint>;
