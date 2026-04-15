const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  };
} else if (process.env.DB_HOST) {
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: false
  };
} else {
  poolConfig = {
    host: 'localhost',
    port: 5432,
    database: 'KaynarMotor',
    user: 'postgres',
    password: '12345',
    ssl: false
  };
}

const pool = new Pool({
  ...poolConfig,
  max: isProduction ? 3 : 10,
  min: 0,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 20000,
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

const RETRY_DELAY = 2000;
const MAX_RETRIES = 5;

const queryWithRetry = async (text, params, retries = 0) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    const retryableErrors = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', '57P01', '08006', '08001'];
    const isRetryable = retryableErrors.some(code =>
      error.code === code || (error.message && error.message.includes(code))
    );

    if (isRetryable && retries < MAX_RETRIES) {
      const delay = RETRY_DELAY * (retries + 1);
      console.log(`DB bağlantı hatası, ${delay}ms sonra tekrar deneniyor... (${retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return queryWithRetry(text, params, retries + 1);
    }
    throw error;
  }
};

pool.on('error', (err) => {
  console.error('Beklenmeyen pool hatası:', err.message);
});

module.exports = { pool, queryWithRetry };
