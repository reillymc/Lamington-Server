import type { Knex } from "knex";
import baseConfig from "./knexfile.base.ts";

const config: Knex.Config = {
    ...baseConfig,
    connection: {
        database: process.env.DB_TEST_NAME,
        host: process.env.DB_TEST_HOST,
        port: parseInt(process.env.DB_PORT ?? "0", 10),
        user: process.env.DB_TEST_USER,
        password: process.env.DB_TEST_PASSWORD,
    },
    pool: {
        min: 0,
        max: 1,
    },
};

export default config;
