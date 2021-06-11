import express, { Request } from 'express';
import db from '../database/db-config';
import { v4 as uuidv4 } from 'uuid';
import { createToken, verifyToken } from '../authentication/auth';
import bcrypt from 'bcrypt';
import { User } from '../database/types';
const router = express.Router();
const saltRounds = 10;


interface UserRequest {
    password: string,
}

interface AuthenticatedBody {
    userId: string,
}

// list all users
router.get('/', function (req, res) {
    db.from('users').select("email", "firstName", "lastName", "status")
        .then((rows) => {
            res.status(200).json({ "Users": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// register user
router.post('/register', (req: Request<{}, {}, User, {}>, res) => {

    if (!req.body.email || !req.body.firstName || !req.body.lastName || !req.body.password) {
        res.status(400).json({ message: `Error updating users` });
        console.log(`Error on request body:`, JSON.stringify(req.body));
    } else {
        // encrypt password
        bcrypt.genSalt(saltRounds, function (err, salt) {
            bcrypt.hash(req.body.password, salt, function (err, hash) {

                const { email, firstName, lastName } = req.body

                //create account based on random id number, email and password, and the current date/time
                var user = {
                    id: uuidv4(),
                    email,
                    firstName,
                    lastName,
                    password: hash,
                    created: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    status: 'c'
                }

                // database insertion
                db('users').insert(user)
                    .then(_ => {
                        res.status(201).json({
                            token: createToken(user.id),
                            token_type: "Bearer",
                        })
                    })
                    .catch(error => {
                        res.status(400).json({ message: `oops! It looks like that user already exists :( ${error}` });
                    })
            });
        });
    }
})

// user login
router.post('/login', (req: Request<{}, {}, User, {}>, res) => {
    if (!req.body.email || !req.body.password) {
        res.status(401).json({ message: `invalid login - bad password` });
    } else {
        db.from('users').select("id", "password").where('email', '=', req.body.email)
            .then((rows: User[]) => {

                // check encrypted password
                bcrypt.compare(req.body.password, rows[0].password, function (err, result) {
                    if (result) {
                        res.status(200).json({
                            token: createToken(rows[0].id),
                            token_type: "Bearer",
                        })
                    } else {
                        res.status(401).json({ message: `invalid login - bad password` });
                    }
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(401).json({ message: `invalid login - bad password` });
            })
    }
})

// profile
router.post('/profile', verifyToken, (req: Request<{}, {}, UserRequest & AuthenticatedBody, {}>, res) => {
    db.from('users').select("first_name").where('id', '=', req.body.userId)
        .then((rows: User[]) => {

            // check encrypted password
            bcrypt.compare(req.body.password, rows[0].password, function (err, result) {
                if (result) {
                    res.status(200).json({
                        token: createToken(rows[0].id),
                        token_type: "Bearer",
                        expires_in: 86400
                    })
                } else {
                    res.status(401).json({ message: `invalid login - bad password` });
                }
            });
        })
        .catch((err) => {
            console.log(err);
            res.status(401).json({ message: `invalid login - bad password` });
        })
})

export default router