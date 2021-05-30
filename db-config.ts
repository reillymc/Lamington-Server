
import knex from 'knex';

import { knexConfig } from './database/knexfile';

const db = knex(knexConfig);

export default db;