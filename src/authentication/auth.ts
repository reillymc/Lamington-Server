import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
const secret = process.env.JWT_SECRET!

interface AuthenticatedBody {
    userId: string,
}

const createToken = (userId: string) => {
    let payload = { "userId": userId }
    return jwt.sign(payload, secret, { noTimestamp: true, expiresIn: process.env.JWT_EXPIRES_IN })
}

const verifyToken = (req: Request<{}, {}, AuthenticatedBody, {}>, res: Response, next: NextFunction) => {
    var token = req.headers['authorization'];
    if (!token)
        return res.status(403).send({ auth: false, message: 'No token provided.' });
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }
    jwt.verify(token, secret, function (err, decoded: AuthenticatedBody) {
        if (err)
            return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
        req.body.userId = decoded.userId;
        next();
    });
}

const checkToken = (req: Request<{}, {}, AuthenticatedBody, {}>, res: Response, next: NextFunction) => {
    var token = req.headers['authorization'];
    if (!token) {
        req.body.userId = "";
        next();
    } else {
        if (token.startsWith('Bearer ')) {
            token = token.slice(7, token.length);
        }
        jwt.verify(token, secret, function (err, decoded: AuthenticatedBody) {
            if (err)
                return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
            req.body.userId = decoded.userId;
            next();
        });
    }
}

export {
    checkToken,
    createToken,
    verifyToken,
    AuthenticatedBody
}