import knex from 'knex';

const db = knex({
    client: 'mysql2',
    connection: {
        host: process.env.DB_HOST,
        database: 'lamingtondb',
        user: process.env.DB_USER,
        password: process.env.DB_PASS
    }
});

export default db;