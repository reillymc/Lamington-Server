var express = require('express');
var router = express.Router();
var multer  = require('multer')
var path = require('path')
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})
const fileFilter = (req, file, cb) => {

    if (file.mimetype === 'image/jpeg') {
        cb(null, true)
    } else {
        cb(null, true)
    }
}
var upload = multer({ storage: storage })


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

// list all chore assignments
router.get('/chore-roster', function (req, res, next) {
    req.db.from('chore_roster').select("chore_id", "assignee_id", "assigned_date", "assigner_id", "repeat", "completed")
        .then((rows) => {
            res.status(200).json({ "Roster": rows });
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



router.post('/add-chore', (req, res) => {
    if (!req.body.title || !req.body.description || !req.body.createdBy) {
        console.log(req.body,)
        res.status(400).json({ message: `Error updating chores` });
        console.log(`Error on request body:`, JSON.stringify(req.body));
    } else {
        var chore = {
            "id": uuidv4(),
            "title": req.body.title,
            "description": req.body.description,
            "created_by": req.body.createdBy
        }

        // database insertion
        req.db('chores').insert(chore)
            .then(_ => {
                res.status(201).json({ message: `yay! you've successfully added a chore :)` });
            }).catch(error => {
                res.status(400).json({ message: 'oops! It looks like something went wrong adding your chore :(' });
            })
    }
})

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

router.post('/assign-chore', (req, res) => {
    if (!req.body.chore_id || !req.body.assignee_id || !req.body.assigned_date || !req.body.assigner_id || !req.body.repeat) {
        res.status(400).json({ message: `Error updating meals` });
        console.log(`Error on request body:`, JSON.stringify(req.body));
    } else {
        var date = new Date(req.body.assigned_date).toISOString().slice(0, 19).replace('T', ' ');
        var choreAssignment = {
            "chore_id": req.body.chore_id,
            "assignee_id": req.body.assignee_id,
            "assigned_date": date,
            "assigner_id": req.body.assigner_id,
            "repeat": (req.body.repeat == '1') ? 1 : 0,
            "completed": 0
        }
        console.log(choreAssignment)
        // database insertion
        req.db('chore_roster').insert(choreAssignment)
            .then(_ => {
                res.status(201).json({ message: `yay! you've successfully added a chore :)` });
            }).catch(error => {
                console.log(error)
                res.status(400).json({ message: 'oops! It looks like something went wrong adding your chore :(' });
            })
    }
})



router.post('/upload-image', upload.single('photo'),  (req, res) => {
    console.log(req.file)
    res.json(req.file.filename)
})


module.exports = router;