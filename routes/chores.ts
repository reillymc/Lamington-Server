import db from '../db-config';
import express, { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = express.Router();

// list all chores
router.get('/', function (req: Request, res: any) {
    db.from('chores').select("id", "title", "description", "created_by")
        .then((rows) => {
            res.status(200).json({ "Chores": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// list all chore assignments
router.get('/chore-roster', function (req: Request, res: any) {
    db.from('chore_roster').select("chore_id", "assignee_id", "assigned_date", "assigner_id", "repeat", "completed")
        .then((rows) => {
            res.status(200).json({ "Roster": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

interface Chore {
    title: string,
    description: string,
    createdBy: string
}

// create new chore
router.post('/add-chore', (req: Request<{}, {}, Chore>, res: any) => {
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
        db('chores').insert(chore)
            .then(_ => {
                res.status(201).json({ message: `yay! you've successfully added a chore :)` });
            }).catch(error => {
                res.status(400).json({ message: 'oops! It looks like something went wrong adding your chore :(' });
            })
    }
})

// assign chore to user
router.post('/assign-chore', (req: Request, res: any) => {
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
        db('chore_roster').insert(choreAssignment)
            .then(_ => {
                res.status(201).json({ message: `yay! you've successfully added a chore :)` });
            }).catch(error => {
                console.log(error)
                res.status(400).json({ message: 'oops! It looks like something went wrong adding your chore :(' });
            })
    }
})

module.exports = router;