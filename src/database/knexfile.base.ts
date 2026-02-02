import type { Knex } from "knex";

const config: Knex.Config = {
    client: "pg",
    migrations: {
        tableName: "knex_migrations",
        directory: "./migrations",
    },
    pool: {
        min: 0,
    },
};

export default config;
