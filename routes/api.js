var express = require('express');
var router = express.Router();

// list all users
router.get('/users', function (req, res, next) {
    req.db.from('users').select("email", "first_name", "last_name", "status")
        .then((rows) => {
            res.status(200).json({ "Users": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// list all chores
router.get('/chores', function (req, res, next) {
    req.db.from('chores').select("id", "title", "description", "created_by")
        .then((rows) => {
            res.status(200).json({ "Chores": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// list all meals
router.get('/meals', function (req, res, next) {
    req.db.from('meals').select("id", "name", "recipe", "ingredients", "method", "notes", "created_by", "times_cooked")
        .then((rows) => {
            res.status(200).json({ "Meals": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// list all chore assignments
router.get('/chore-roster', function (req, res, next) {
    req.db.from('chore_roster').select("chore_id", "assignee_id", "assigned_date", "assigner_id", "repeat", "completed")
        .then((rows) => {
            res.status(200).json({ "Chore Assignments": rows });
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

module.exports = router;