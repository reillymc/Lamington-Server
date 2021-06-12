import express, { Request, Response } from 'express';
import db from '../database/db-config';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Authentication, User } from '../interfaces/types';
import { lamington_db, users } from '../database/definitions';
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


/**
 * GET request to fetch all users
 */
router.get('/', (req, res: Response<LamingtonDataResponse<User[]>>) => {
    db.from(lamington_db.users).select(users.email, users.firstName, users.lastName, users.status)
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
router.post('/register', async (req: Request<null, LamingtonDataResponse<Authentication>, RegisterBody, null>, res) => {

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
    db(lamington_db.users).insert(user)
        .then(_ => {
            return res.status(201).json({
                error: false,
                data: {
                    token: createToken(user.id),
                    token_type: "Bearer"
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
router.post('/login', (req: Request<null, LamingtonDataResponse<Authentication>, LoginBody, null>, res) => {

    // Extract request fields
    const { email, password } = req.body;

    // Check all required fields are present
    if (!email || !password) {
        return res.status(401).json({ error: true, message: `invalid login - bad password` });
    }

    // Fetch and return data from database
    db.from(lamington_db.users)
        .select(users.id, users.password)
        .where({ [users.email]: email })
        .then(async (rows: User[]) => {

            // Verify Password
            const result = await bcrypt.compare(req.body.password, rows[0].password);

            if (result) {
                return res.status(200).json({
                    error: false,
                    data: {
                        token: createToken(rows[0].id),
                        token_type: "Bearer"
                    }
                })
            }
            return res.status(401).json({ error: true, message: `invalid login - bad password` });
        })
        .catch(() => {
            return res.status(401).json({ error: true, message: `error` });
        })
})

export default router