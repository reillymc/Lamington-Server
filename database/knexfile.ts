import { Config } from "knex";

export const knexConfig: Config = {
    client: 'mysql',
    connection: {
        host: '127.0.0.1',
        database: 'lamington_db',
        user: 'root',
        password: 'Lamington1116'
    }
}