import { AuthData } from "../../src/middleware";

declare module "express" {
    interface Request {
        session: AuthData;
    }
}

declare module "express-serve-static-core" {
    interface Request {
        session: AuthData;
    }
}
