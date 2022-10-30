import { Response } from "express";

/**
 * @deprecated should no longer be required to verify userId
 */
export const UnauthenticatedResponse = (res: Response) =>
    res.status(401).json({ error: true, message: "Authentication required to access this service" });

/**
 * @deprecated should now be handled by logger
 */
export const InternalErrorResponse = (res: Response, exception: unknown) =>
    res.status(500).json({ error: true, message: `An internal error occurred when processing request ${exception}` });
