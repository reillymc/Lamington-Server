import type { Knex } from "knex";

const config: Knex.Config = {
    client: "pg",
    migrations: {
        tableName: "knex_migrations",
        directory: "./migrations",
    },
    pool: {
        min: 2,
        max: 10,
    },
};

export default config;
