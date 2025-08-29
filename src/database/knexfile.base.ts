import type { Knex } from "knex";

const config: Knex.Config = {
    client: "pg",
    migrations: {
        tableName: "knex_migrations",
        directory: "./migrations",
    },
};

export default config;
