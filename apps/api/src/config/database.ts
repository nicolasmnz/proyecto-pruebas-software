import { Pool } from "pg";
import "./env.js";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Si PostgreSQL cierra una conexión inactiva (reinicio, db:reset),
// pg emite 'error' en el pool; sin este handler el proceso se cae.
// El pool descarta esa conexión y abre una nueva en la siguiente consulta.
pool.on("error", (error) => {
  console.error("Conexión inactiva con PostgreSQL perdida:", error.message);
});

export default pool;
