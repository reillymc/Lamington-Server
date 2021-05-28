var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');

// list all meals
router.get('/list', function (req, res, next) {
    //get meal ratings and assign ratings as an array on each meal ratings: {user, value}
    req.db.from('meals').select("id", "name", "recipe", "ingredients", "method", "notes", "photo", "created_by", "times_cooked")
        .then((rows) => {
            res.status(200).json({ "Meals": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// list all meal assignments
router.get('/meal-roster', function (req, res, next) {
    req.db.from('meal_roster').select("meal_id", "assignee_id", "assigned_date", "assigner_id", "cooked")
        .then((rows) => {
            res.status(200).json({ "years": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// list all meal ratings
router.get('/meal-ratings', function (req, res, next) {
    req.db.from('meal_ratings').select("meal_id", "rater_id", "rating")
        .then((rows) => {
            res.status(200).json({ "years": rows });
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
        var meal = {
            "id": uuidv4(),
            "name": req.body.name,
            "recipe": (req.body.recipe != undefined) ? req.body.recipe : "",
            "ingredients": (req.body.ingredients != undefined) ? req.body.ingredients : "",
            "method": (req.body.method != undefined) ? req.body.method : "",
            "notes": (req.body.notes != undefined) ? req.body.notes : "",
            "photo": (req.body.photo != undefined) ? req.body.photo : "",
            "created_by": req.body.createdBy,
            "times_cooked": 0
        }
        // database insertion
        req.db('meals').insert(meal)
            .then(_ => {
                res.status(201).json({ message: `yay! you've successfully added a meal :)` });
            }).catch(error => {
                res.status(400).json({ message: 'oops! It looks like something went wrong adding your meal :(' });
            })
    }
})

module.exports = router;