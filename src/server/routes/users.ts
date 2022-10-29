import express, { Request, Response } from "express";
import bcrypt from "bcrypt";

import { createToken } from "../../authentication/auth";
import { LamingtonAuthenticatedRequest, LamingtonDataResponse } from "../response";
import UserActions, { createUsers, InternalUserActions } from "../../database/actions/user";
import { User, Users } from "../specification";

const router = express.Router();
const saltRounds = 10;

// Define Request Parameters
interface LoginBody {
    email: string;
    password: string;
}
interface RegisterBody extends LoginBody {
    userId?: string;
    firstName: string;
    lastName: string;
}

interface AuthenticationResponse {
    authorization: {
        token: string;
        tokenType: string;
    };
    user: {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        status: string;
    };
}

/**
 * GET request to fetch all users
 */
router.get("/", async (req, res: LamingtonDataResponse<Users>) => {
    try {
        const users = await UserActions.readAllUsers();
        const data = Object.fromEntries(users.map(user => [user.userId, user]));
        return res.status(200).json({ error: false, data });
    } catch (error: unknown) {
        return res.json({ error: true, message: `Could not fetch users ${error}` });
    }
});

type CreateUserRequest = LamingtonAuthenticatedRequest<RegisterBody>;
type CreateUserResponse = LamingtonDataResponse<AuthenticationResponse>;

/**
 * POST request to register a new user
 */
router.post("/register", async (req: CreateUserRequest, res: CreateUserResponse) => {
    // Extract request fields
    const { userId, email, firstName, lastName, password } = req.body;

    // Check all required fields are present
    if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ error: true, message: `Not enough information to create a user` });
    }

    // Create object
    const user = {
        userId,
        email,
        firstName,
        lastName,
        password: await bcrypt.hash(password, await bcrypt.genSalt(saltRounds)),
        created: new Date().toISOString().slice(0, 19).replace("T", " "),
        status: "c",
    };

    // Update database and return status
    try {
        if (!userId) {
            const [createdUser] = await createUsers(user);
            const token = createToken(createdUser?.userId);
            if (!token || !createdUser) throw "Failed to create token";

            return res.status(200).json({
                error: false,
                data: {
                    authorization: {
                        token,
                        tokenType: "Bearer",
                    },
                    user: createdUser,
                },
            });
        } else {
            return res.status(400).json({ error: true, message: `Cannot edit existing user :(` });
        }
    } catch (error: unknown) {
        console.log(error);

        return res.status(400).json({ error: true, message: `Error creating user :( ${error}` });
    }
});

type LoginUserRequest = LamingtonAuthenticatedRequest<LoginBody>;
type LoginUserResponse = LamingtonDataResponse<AuthenticationResponse>;

/**
 * POST request to login an existing user
 */
router.post("/login", async (req: LoginUserRequest, res: LoginUserResponse) => {
    // Extract request fields
    const { email, password } = req.body;

    // Check all required fields are present
    if (!email || !password) {
        return res.status(401).json({ error: true, message: `invalid login - bad password` });
    }

    // Fetch and return data from database
    try {
        const [user] = await InternalUserActions.readUsers({ email });
        if (!user) {
            return res.status(401).json({ error: true, message: `Invalid username of password` });
        }
        const result = await bcrypt.compare(password, user.password ?? "");

        if (result) {
            const token = createToken(user.userId);
            if (!token) throw "Failed to create token";

            return res.status(200).json({
                error: false,
                data: {
                    authorization: {
                        token,
                        tokenType: "Bearer",
                    },
                    user: {
                        userId: user.userId,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        status: user.status,
                    },
                },
            });
        }
        return res.status(401).json({ error: true, message: `invalid login - bad password` });
    } catch (error: unknown) {
        return res.status(401).json({ error: true, message: `error ${error}` });
    }
});

export default router;
