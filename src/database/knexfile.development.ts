import type { Knex } from "knex";
import baseConfig from "./knexfile.base.ts";

const config: Knex.Config = {
    ...baseConfig,
    connection: {
        database: process.env.DB_DEV_NAME,
        host: process.env.DB_DEV_HOST,
        port: parseInt(process.env.DB_PORT ?? "5432", 10),
        user: process.env.DB_DEV_USER,
        password: process.env.DB_DEV_PASSWORD,
    },
    seeds: {
        directory: "./seeds/development",
    },
};

export default config;
