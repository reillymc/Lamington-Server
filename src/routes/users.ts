import express, { Request, Response } from 'express';
import db from '../database/db-config';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Authentication, User } from '../interfaces/types';
import { lamington, users } from '../database/definitions';
import { createToken } from '../authentication/auth';
import { LamingtonDataResponse } from '../interfaces/response';

const router = express.Router();
const saltRounds = 10;

// Define Request Parameters
interface LoginBody {
    email: string,
    password: string,
}
interface RegisterBody extends LoginBody {
    firstName: string,
    lastName: string,
}

interface LoginResponse {
    authorization: {
        token: string,
        token_type: string
    },
    user: User
}


/**
 * GET request to fetch all users
 */
router.get('/', (req, res: LamingtonDataResponse<User[]>) => {
    db.from(lamington.user).select(users.email, users.firstName, users.lastName, users.status)
        .then((users: User[]) => {
            return res.status(200).json({ error: false, data: users });
        })
        .catch((err) => {
            return res.json({ error: true, message: err });
        })
})

/**
 * POST request to register a new user
 */
router.post('/register', async (req: Request<null, null, RegisterBody, null>, res: LamingtonDataResponse<LoginResponse>) => {

    // Extract request fields
    const { email, firstName, lastName, password } = req.body;

    // Check all required fields are present
    if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ error: true, message: `Not enough information to create a user` });
    }

    // Create object
    const user = {
        id: uuidv4(),
        email,
        firstName,
        lastName,
        password: await bcrypt.hash(req.body.password, await bcrypt.genSalt(saltRounds)),
        created: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'c'
    }

    // Update database and return status
    db(lamington.user).insert(user)
        .then(_ => {
            return res.status(200).json({
                error: false,
                data: {
                    authorization: {
                        token: createToken(user.id),
                        token_type: "Bearer"
                    },
                    user: ({ id: user.id, firstName, lastName, status: user.status })
                }
            })
        })
        .catch(error => {
            return res.status(400).json({ error: true, message: `oops! It looks like that user already exists :( ${error}` });
        })
})

/**
 * POST request to login an existing user
 */
router.post('/login', (req: Request<null, null, LoginBody, null>, res: LamingtonDataResponse<LoginResponse>) => {

    // Extract request fields
    const { email, password } = req.body;


    // Check all required fields are present
    if (!email || !password) {
        return res.status(401).json({ error: true, message: `invalid login - bad password` });
    }

    // Fetch and return data from database
    db.from(lamington.user)
        .select(users.id, users.email, users.password, users.firstName, users.lastName, users.status)
        .where({ [users.email]: email })
        .then(async (rows: User[]) => {            
            if (rows.length === 0) {
                return res.status(401).json({ error: true, message: `Invalid username of password` });
            }
            // Verify Password
            const result = await bcrypt.compare(password, rows[0].password ?? "");

            if (result) {
                return res.status(200).json({
                    error: false,
                    data: {
                        authorization: {
                            token: createToken(rows[0].id),
                            token_type: "Bearer"
                        },
                        user: ({ id: rows[0].id, firstName: rows[0].firstName, lastName: rows[0].lastName, status: rows[0].status })
                    }
                })
            }
            return res.status(401).json({ error: true, message: `invalid login - bad password` });
        })
        .catch((e) => {
            return res.status(401).json({ error: true, message: `error ${e}` });
        })
})

export default router