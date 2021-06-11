interface User {
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    createdAt: string,
    status: string,
}

interface Meal {
    id: string,
    name: string,
    recipe: string | undefined,
    ingredients: string | undefined,
    method: string | undefined,
    notes?: string | undefined,
    photo?: string | undefined,
    ratingAverage?: number | undefined,
    ratingPersonal?: number | undefined,
    categories?: Category[],
    createdBy: string,
    timesCooked: number | undefined
}

interface Category {
    id: string,
    name: string,
    description?: string
}

interface MealCategory {
    mealId: string,
    name: string,
    description?: string
}

interface MealRating {
    mealId: string,
    raterId: string,
    rating: number
}

export { User, Meal, Category, MealRating, MealCategory }