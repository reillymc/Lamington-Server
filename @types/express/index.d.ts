import type { AuthData } from "../../src/services/token.ts";

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
