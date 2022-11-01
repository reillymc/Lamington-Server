interface ResponseBodyBase {
    error: boolean;
    schema?: 1; // TODO make mandatory
    message?: string;
}


export type ResponseBody<T = null> = T extends null ? ResponseBodyBase : ResponseBodyBase & { data?: T }


interface MealIngredientItem {
    ingredientId?: string;
    amount?: number;
    description?: string;
    unit?: string;
    multiplier?: number;
    name?: string;
    namePlural?: string;
}


interface MealIngredients {
    [sectionName: string]: Array<MealIngredientItem>;
}


interface MealMethodStep {
    stepId?: string;
    description?: string;
}


interface MealMethod {
    [sectionName: string]: Array<MealMethodStep>;
}
interface MealCategoryItem {
    categoryId: string;
    type?: string;
    name?: string;
}

type MealCategories = Array<MealCategoryItem>;


export interface Meal {
    id: string;
    name?: string;
    source?: string;
    ingredients?: MealIngredients;
    method?: MealMethod;
    notes?: string;
    photo?: string;
    ratingAverage?: number;
    ratingPersonal?: number;
    categories?: MealCategories;
    createdBy: string;
    cookTime?: number;
    prepTime?: number;
    servings?: number;
    timesCooked?: number;
}

export { MealIngredients, MealMethod, MealCategories }