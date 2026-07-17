import knex, { type Knex } from 'knex';
import config from '../config.js';

const db: Knex = knex({
  client: 'pg',
  connection: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
  acquireConnectionTimeout: 10000,
});

export async function migrate(): Promise<void> {
  try {
    await db.migrate.latest();
    console.log('[Database] Migrations completed successfully');
  } catch (error) {
    console.error('[Database] Migration failed:', error);
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    console.log('[Database] Connection established successfully');
    return true;
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  await db.destroy();
  console.log('[Database] Connection closed');
}

export { db };
export default db;