import db from '../database/db-config';
import express, { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();
interface Meal {
    id: string,
    name: string,
    recipe: string,
    ingredients: string,
    method: string,
    notes: string,
    photo: string,
    created_by: string
}

// list all meals
router.get('/', (req, res) => {
    //get meal ratings and assign ratings as an array on each meal ratings: {user, value}
    db.from('meals').select("id", "name", "recipe", "ingredients", "method", "notes", "photo", "created_by", "times_cooked")//.join on ratings and categories
        .then((rows: Meal[]) => {
            res.status(200).json({ "Meals": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// list all meal assignments
router.get('/meal-roster', (req, res) => {
    db.from('meal_roster').select("meal_id", "assignee_id", "assigned_date", "assigner_id", "cooked")
        .then((rows) => {
            res.status(200).json({ "years": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// list all meal ratings
router.get('/meal-ratings', (req, res) => {
    db.from('meal_ratings').select("meal_id", "rater_id", "rating")
        .then((rows) => {
            res.status(200).json({ "ratings": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// create new meal
router.post('/add-meal', (req, res) => {
    if (!req.body.name || !req.body.createdBy) {
        res.status(400).json({ message: `Error updating meals` });
        console.log(`Error on request body:`, JSON.stringify(req.body));
    } else {
        const { name, recipe, ingredients, method, notes, photo, createdBy } = req.body;

        var meal = {
            "id": uuidv4(),
            "name": name,
            "recipe": (recipe != undefined) ? recipe : "",
            "ingredients": (ingredients != undefined) ? ingredients : "",
            "method": (method != undefined) ? method : "",
            "notes": (notes != undefined) ? notes : "",
            "photo": (photo != undefined) ? photo : "",
            "created_by": createdBy,
            "times_cooked": 0
        }
        // database insertion
        db('meals').insert(meal)
            .then(_ => {
                res.status(201).json({ message: `yay! you've successfully added a meal :)` });
            }).catch(error => {
                res.status(400).json({ message: 'oops! It looks like something went wrong adding your meal :(' });
            })
    }
})

// edit a meal
router.post('/update-meal', (req, res) => {
    if (!req.body.id || !req.body.name || !req.body.createdBy) {
        res.status(400).json({ message: `Error updating meals` });
        console.log(`Error on request body:`, JSON.stringify(req.body));
    } else {
        const { id, name, recipe, ingredients, method, notes, photo, createdBy } = req.body;

        // database update
        db('meals').update({ name, recipe, ingredients, method, notes, photo }).where({ id: id })
            .then(_ => {
                res.status(201).json({ message: `yay! you've successfully added a meal :)` });
            }).catch(error => {
                res.status(400).json({ message: `oops! It looks like something went wrong adding your meal :( ${error}` });
            })
    }
})


// rate a meal
router.post('/rate-meal', async (req, res) => {
    if (!req.body.raterId || !req.body.mealId || !req.body.rating) {
        res.status(400).json({ message: `You haven't given enough information to rate this meal` });
        console.log(`Error on request body:`, JSON.stringify(req.body));
    } else {
        const { raterId, mealId, rating } = req.body;
        const prevRatings = await db.from('meal_ratings').select("meal_id", "rater_id", "rating").where({ 'meal_id': mealId, 'raterId': raterId })
        var mealRating = {
            "meal_id": mealId,
            "rater_id": raterId,
            "rating": rating,
        }
        // database insertion
        // if (prevRatings.rows > 1) { // probably need to await
        if (true) {
            db('meal_ratings').update(mealRating)
                .then(_ => {
                    res.status(201).json({ message: `yay! you've successfully rated this meal :)` });
                }).catch(error => {
                    res.status(400).json({ message: 'oops! It looks like something went wrong rating this meal :(' });
                })
        } else {
            db('meal_ratings').insert(mealRating)
                .then(_ => {
                    res.status(201).json({ message: `yay! you've successfully rated this meal :)` });
                }).catch(error => {
                    res.status(400).json({ message: 'oops! It looks like something went wrong rating this meal :(' });
                })
        }
    }
})

export default router