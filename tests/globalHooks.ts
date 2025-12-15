import { after, afterEach, before, beforeEach } from "node:test";
import db from "../src/database/index.ts";

before(async () => {});

after(async () => {});

beforeEach(async () => {
    await db.raw("start transaction");
});

afterEach(async () => {
    await db.raw("rollback");
});
