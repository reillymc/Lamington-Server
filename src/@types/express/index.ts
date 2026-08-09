import type { components } from "../../routes/spec/schema.d.ts";

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
