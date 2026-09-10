import { AsyncLocalStorage } from "node:async_hooks";
import type { components } from "../routes/spec/schema.d.ts";

type UserStatus = components["schemas"]["UserStatus"];

export type Session = {
    userId: string;
    status: UserStatus;
};

export const sessionStore = new AsyncLocalStorage<Session>();

export const getSession = (): Session => {
    const session = sessionStore.getStore();
    if (!session) {
        throw new Error("No session — request is not authenticated");
    }
    return session;
};
