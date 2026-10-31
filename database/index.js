const { Pool } = require("pg");
require("dotenv").config();

const sslEnabled =
  process.env.DB_SSL === "true" || process.env.NODE_ENV === "production";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION);
const maxConnections = isServerless
  ? parseInt(process.env.DB_POOL_MAX || "3", 10)
  : parseInt(process.env.DB_POOL_MAX || "10", 10);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  port: process.env.DATABASE_URL
    ? undefined
    : Number(process.env.DB_PORT || 5432),
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  max: maxConnections,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
  connectionTimeoutMillis: parseInt(
    process.env.DB_CONNECTION_TIMEOUT || "15000",
    10,
  ),
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Écouteur pour éviter les crashs si une connexion inactive est fermée par le serveur Neon
pool.on("error", (err) => {
  console.warn("⚠️ Avertissement pool PostgreSQL (client inactif) :", err.message);
});

pool
  .connect()
  .then((client) => {
    console.log("✅ Connect to PostgreSQL (Neon) database successfully!");
    client.release();
  })
  .catch((error) => {
    console.error(`❌ Connect to database failed: ${error.message}`);
  });

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};

