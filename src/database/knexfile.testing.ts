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
        ...baseConfig.pool,
        // By default, Knex (via tarn.js) throws an error immediately if it fails to create a connection.
        // This tells the pool to retry creating a connection instead of throwing an error when the DB
        // rejects the connection (e.g. due to connection limits when running test simultaneously).
        propagateCreateError: false,
    },
};

export default config;
