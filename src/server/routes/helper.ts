import { Response } from "express";

export const UnauthenticatedResponse = (res: Response) =>
    res.status(401).json({ error: true, message: "Authentication required to access this service" });
