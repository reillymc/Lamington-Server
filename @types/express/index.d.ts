import { AuthenticatedBody } from "../../src/middleware";

declare module "express" {
    interface Request {
        session: AuthenticatedBody;
    }
}

declare module "express-serve-static-core" {
    interface Request {
        session: AuthenticatedBody;
    }
}
