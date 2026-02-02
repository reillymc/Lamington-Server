import type { components } from "../../src/routes/spec/schema.js";

type UserStatus = components["schemas"]["UserStatus"];

declare module "express" {
    interface Request {
        session: {
            userId: string;
            status: UserStatus;
        };
    }
}

declare module "express-serve-static-core" {
    interface Request {
        session: {
            userId: string;
            status: UserStatus;
        };
    }
}
