import { Pool, type PoolClient, type QueryResult } from 'pg';
import config from './config.js';

// ============================================================================
// PostgreSQL 连接池
// ============================================================================

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  min: config.db.poolMin,
  max: config.db.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 监听连接池错误
pool.on('error', (err: Error) => {
  console.error('[Database] Unexpected pool error:', err.message);
});

// ============================================================================
// 导出的查询函数
// ============================================================================

/**
 * 执行查询并返回结果行
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result: QueryResult<T> = await pool.query(text, params);
  return result.rows;
}

/**
 * 执行查询并返回单行，无结果返回 null
 */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const result: QueryResult<T> = await pool.query(text, params);
  return result.rows[0] ?? null;
}

/**
 * 获取事务客户端
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * 在事务中执行操作
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    console.log('[Database] Connection established successfully');
    return true;
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    return false;
  }
}

/**
 * 关闭连接池
 */
export async function closeConnection(): Promise<void> {
  await pool.end();
  console.log('[Database] Connection pool closed');
}

export { pool };
export default { query, queryOne, getClient, transaction, testConnection, closeConnection, pool };