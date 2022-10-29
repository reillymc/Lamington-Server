import knex from "knex";
import config from "../config";

const db = knex({
    client: config.database.client,
    connection: {
        host: config.database.host,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        charset: 'utf8mb4'
    },
});

export default db;
