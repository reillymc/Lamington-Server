import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import config from "../config";
import { ResponseBody } from "../spec/response";
import { logger } from "../services";

const { jwtSecret } = config.authentication;

type AuthenticatedBody<T = null> = T extends null ? { userId: string } : { userId: string } & T;

// const authenticationMiddleware = (req: Request<null, null, AuthenticatedBody, null>, res: Response, next: NextFunction) => {
//     if (!jwtSecret) return;

//     var token = req.headers["authorization"];
//     if (!token) {
//         const response: ResponseBody = { error: true, message: "Authentication required to access this service." };
//         return res.status(403).send(response);
//     }
//     if (token.startsWith("Bearer ")) {
//         token = token.slice(7, token.length);
//     }
//     jwt.verify(token, jwtSecret, function (err, decoded: AuthenticatedBody) {
//         if (err) {
//             logger.log({
//                 level: "error",
//                 message: err.message,
//                 request: {
//                     params: req.params,
//                     query: req.query,
//                     body: req.body,
//                     route: req.originalUrl,
//                 },
//             });
//             const response: ResponseBody = { error: true, message: "Failed to authenticate token." };
//             return res.status(400).send(response);
//         }
//         req.body.userId = decoded.userId;
//         return next();
//     });
// };

const authenticationMiddleware = (req: Request<null, null, AuthenticatedBody, null>, res: Response, next: NextFunction) => {
        req.body.userId = "10000000-0000-0000-0000-000000000000"
        return next();
};

export { authenticationMiddleware, AuthenticatedBody };
