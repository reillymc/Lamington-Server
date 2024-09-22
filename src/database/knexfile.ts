import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
    development: {
        client: "pg",
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

    test: {
        client: "pg",
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
        migrations: {
            tableName: "knex_migrations",
            directory: __dirname + "/migrations",
        },
        seeds: {
            directory: __dirname + "/seeds/testing",
        },
    },

    production: {
        client: "pg",
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
