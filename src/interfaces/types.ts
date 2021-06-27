interface User {
    id: string,
    email?: string,
    firstName?: string,
    lastName?: string,
    password?: string,
    createdAt?: string,
    status?: string,
}

interface Meal {
    id: string,
    name: string,
    recipe: string,
    ingredients?: string,
    method?: string,
    notes?: string,
    photo?: string,
    ratingAverage?: number,
    ratingPersonal?: number,
    categories?: Category[],
    createdBy: string,
    timesCooked?: number
}

interface Category {
    id: string,
    name: string,
    description?: string
}

interface MealCategory {
    mealId: string,
    categoryId: string,
    name: string,
    description?: string
}

interface MealRating {
    mealId: string,
    raterId: string,
    rating: number
}

interface MealRoster {

}

interface Authentication {
    token: string,
    token_type: string
}


export { User, Meal, Category, MealRating, MealCategory, MealRoster, Authentication }