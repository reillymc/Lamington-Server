import knex from 'knex';

const db = knex({
    client: 'mysql',
    connection: {
        host: process.env.DB_HOST,
        database: 'lamington_db',
        user: process.env.DB_USER,
        password: process.env.DB_PASS
    }
});

export default db;