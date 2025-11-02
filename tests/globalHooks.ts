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

// beforeEach(async context => {
//     const trx = await db.transaction();
//     context.trx = trx;

//     console.log("before each", !!context.trx);
// });

// afterEach(async context => {
//     console.log("after each1");

//     context.trx?.rollback();
//     // db.raw("rollback").then(() => {});
//     console.log("after each", !!context.trx);
// });

// beforeEach(async context => {
//     const trx = await db.transaction();
//     context[`${context.filePath}/${context.name}`] = trx;
// });

// afterEach(async context => {
//     console.log("after each1");

//     context[`${context.filePath}/${context.name}`]?.rollback();
//     // db.raw("rollback").then(() => {});
// });
