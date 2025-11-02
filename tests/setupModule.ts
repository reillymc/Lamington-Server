import db from "../src/database/index.ts";

export async function globalSetup() {}

export async function globalTeardown() {
    console.log("Global teardown executed");
    await db.destroy();
}
