import type { Knex } from "knex";
import baseConfig from "./knexfile.base.ts";

const config: Knex.Config = {
    ...baseConfig,
    connection: {
        database: process.env.POSTGRES_DB,
        host: process.env.DB_HOST,
        port: parseInt(process.env.PGPORT ?? "5432", 10),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    },
    pool: {
        min: 2,
        max: 10,
    },
    seeds: {
        directory: "./seeds/production",
    },
};

export default config;
