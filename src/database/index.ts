import knex from "knex";
const config = require("./knexfile");

const selectDatabaseConfig = () => {
    switch (process.env.NODE_ENV) {
        case "test":
            return config.test;
        case "production":
            return config.production;
        default:
            return config.development;
    }
};

const db = knex(selectDatabaseConfig());

export default db;

export * from "./definitions";
export * from "./helpers";
