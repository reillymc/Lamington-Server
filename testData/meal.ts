import { Meal, MealCategories, MealIngredients, MealMethod } from "../src/interfaces/types";

const exampleIngredients: MealIngredients = {
    "schema": 1,
    "data": {
        "default": [{
                "id": "rrr24567-3333-cccc-9999-996614174ubb",
                "amount": 4,
                "unit": "Cup",
                "notes": "Fresh spinach works best",
            },
            {
                "id": "rrr24567-3333-cccc-9999-996614174ubc",
                "amount": 275,
                "unit": "Gram",
            },
            {
                "id": "rrr24567-3333-cccc-9999-996614174ubd",
                "amount": 0.5,
                "unit": "Cup",
                "multiplier": 0.85
            },
            {
                "name": "Egg",
                "amount": 1
            }
        ],
    },
};

const exampleMethod: MealMethod = {
    "schema": 1,
    "data": {
        "default": [
            {
                "step": "Mix spinach and cheeses",
                "notes": "Be careful not to over-stir.",
            },
            {
                "step": "Bake at 275 degrees celsius."
            }
        ],
    },
};

const exampleCategories: MealCategories = {
    "schema": 1,
    "data": [
        "xbcv4567-cbxv-fsad-kljw-4xcbv4174000",
        "14324567-sgbr-rtyu-hljk-426614174ut3"
    ],
};

const exampleMeal: Meal = {
    "name": "Spinach and Ricotta Lasagne",
    "source": "www.google.com",
    "categories": {
        "schema": 1,
        "data": [
            "xbcv4567-cbxv-fsad-kljw-4xcbv4174000",
            "14324567-sgbr-rtyu-hljk-426614174ut3"
        ]
    },
    "cost": 3,
    "ingredients": {
        "schema": 1,
        "data": {
            "default": [{
                    "id": "rrr24567-3333-cccc-9999-996614174ubb",
                    "amount": 4,
                    "unit": "Cup",
                    "notes": "Fresh spinach works best"
                },
                {
                    "id": "rrr24567-3333-cccc-9999-996614174ubc",
                    "amount": 275,
                    "unit": "Gram"
                },
                {
                    "id": "rrr24567-3333-cccc-9999-996614174ubd",
                    "amount": 0.5,
                    "unit": "Cup",
                    "multiplier": 0.85
                },
                {
                    "id": "4db41776-e5c9-47c9-8e5d-98fb84b47392",
                    "name": "Egg",
                    "amount": 1
                }
            ]
        }
    },
    "method": {
        "schema": 1,
        "data": {
            "default": [
                {
                    "step": "Mix spinach and cheeses",
                    "notes": "Be careful not to over-stir."
                },
                {
                    "step": "Bake at 275 degrees celsius."
                }
            ]
        }
    }
};
