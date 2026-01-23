import knex, { type Knex } from "knex";
import development from "./knexfile.development.ts";
import production from "./knexfile.production.ts";
import test from "./knexfile.testing.ts";

const selectDatabaseConfig = () => {
    switch (process.env.NODE_ENV) {
        case "test":
            return test;
        case "production":
            return production;
        default:
            return development;
    }
};

const db = knex(selectDatabaseConfig());

export default db;

export * from "./definitions/index.ts";

export type KnexDatabase = Knex.Transaction;

export interface Database {
    transaction<T>(
        transactionScope: (trx: Database) => Promise<T> | void,
    ): Promise<T>;
}
