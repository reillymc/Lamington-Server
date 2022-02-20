import { Meal, CreateRequestData } from "../src/server/specification"

const exampleMeal: Meal & CreateRequestData = {
    "format": 1,
    "id": "eb7a2ab0-0650-4edf-a908-a6a067b4b325",
    "name": "Spinach and Ricotta Lasagne",
    "source": "www.google.com",
    "categories":  [
            {
                "categoryId": "xbcv4567-cbxv-fsad-kljw-4xcbv4174000"
            },
            {
                "categoryId": "14324567-sgbr-rtyu-hljk-426614174ut3"
            }
        ],
    "ingredients": {
            "default": [{
                    "ingredientId": "rrr24567-3333-cccc-9999-996614174ubb",
                    "amount": 4,
                    "unit": "Cup",
                    "description": "Fresh spinach works best"
                },
                {
                    "ingredientId": "rrr24567-3333-cccc-9999-996614174ubc",
                    "amount": 275,
                    "unit": "Gram"
                },
                {
                    "ingredientId": "rrr24567-3333-cccc-9999-996614174ubd",
                    "amount": 0.5,
                    "unit": "Cup",
                    "multiplier": 0.85
                },
                {
                    "ingredientId": "4db41776-e5c9-47c9-8e5d-98fb84b47392",
                    "amount": 1
                }
            ]
    },
    "method":  {
            "default": [
                {
                    "description": "Mix spinach and cheeses"
                },
                {
                    "description": "Bake at 275 degrees celsius."
                }
            ]
        },
    "cookTime": 20,
    "prepTime": 40,
    "ratingPersonal": 4,
    "servings": 4,
    "timesCooked": 10,
    "notes": "Make sure to drain the spinach before mixing with ingredients",
    "photo": "jfasbdh32479ydshkaj"
}

export { exampleMeal };