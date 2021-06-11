import express, { Request } from 'express';
import db from '../database/db-config';
import auth from '../authentication/auth';
import bcrypt from 'bcrypt';
const router = express.Router();
const saltRounds = 10;

// list all users
router.get('/', function (req, res) {
    db.from('users').select("email", "first_name", "last_name", "status")
        .then((rows) => {
            res.status(200).json({ "Users": rows });
        })
        .catch((err) => {
            console.log(err);
            res.json({ "Error": true, "Message": err });
        })
})

// register user
router.post('/register', (req, res) => {

    if (!req.body.email || !req.body.first_name || !req.body.last_name || !req.body.password) {
        res.status(400).json({ message: `Error updating users` });
        console.log(`Error on request body:`, JSON.stringify(req.body));
    } else {
        // code from: https://stackoverflow.com/questions/5129624/convert-js-date-time-to-mysql-datetime
        var d = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // encrypt password
        bcrypt.genSalt(saltRounds, function (err, salt) {
            bcrypt.hash(req.body.password, salt, function (err, hash) {

                //create account baseed on random id number, email and password, and the current date/time
                var account = {
                    "email": req.body.email,
                    "first_name": req.body.first_name,
                    "last_name": req.body.last_name,
                    "password": hash,
                }

                // database insertion
                db('users').insert(account)
                    .then(_ => {
                        res.status(201).json({ message: `yay! you've successfully registered your user account :)` });
                    }).catch(error => {
                        res.status(400).json({ message: 'oops! It looks like that user already exists :(' });
                    })
            });
        });
    }
})

// user login
router.post('/login', (req, res) => {
    if (!req.body.email || !req.body.password) {
        res.status(401).json({ message: `invalid login - bad password` });
    } else {
        db.from('users').select("password").where('email', '=', req.body.email)
            .then((rows) => {

                // check encrypted password
                bcrypt.compare(req.body.password, rows[0].password, function (err, result) {
                    if (result) {
                        res.status(200).json({
                            token: auth.createToken(),
                            token_type: "Bearer",
                            expires_in: 86400
                        })
                    } else {
                        //wrong password error
                    }
                });
            })
            .catch((err) => {
                console.log(err);
                res.status(401).json({ message: `invalid login - bad password` });
            })
    }
})

export default router