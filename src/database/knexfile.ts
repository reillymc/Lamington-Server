import type { Knex } from "knex";
import { default as appConfig } from "../config";

const config: { [key: string]: Knex.Config } = {
    development: {
        client: appConfig.database.client,
        connection: {
            database: process.env.DB_DEV_NAME,
            host: process.env.DB_DEV_HOST,
            port: parseInt(process.env.DB_PORT ?? "0", 10),
            user: process.env.DB_DEV_USER,
            password: process.env.DB_DEV_PASSWORD,
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: "knex_migrations",
            directory: __dirname + "/migrations",
        },
        seeds: {
            directory: __dirname + "/seeds/development",
        },
    },

    testing: {
        client: appConfig.database.client,
        connection: {
            database: process.env.DB_TEST_NAME,
            host: process.env.DB_TEST_HOST,
            port: parseInt(process.env.DB_PORT ?? "0", 10),
            user: process.env.DB_TEST_USER,
            password: process.env.DB_TEST_PASSWORD,
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: "knex_migrations",
            directory: __dirname + "/migrations",
        },
    },

    production: {
        client: appConfig.database.client,
        connection: {
            database: process.env.DB_PROD_NAME,
            host: process.env.DB_PROD_HOST,
            port: parseInt(process.env.DB_PORT ?? "0", 10),
            user: process.env.DB_PROD_USER,
            password: process.env.DB_PROD_PASSWORD,
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            tableName: "knex_migrations",
            directory: __dirname + "/migrations",
        },
        seeds: {
            directory: __dirname + "/seeds/production",
        },
    },
};

module.exports = config;
