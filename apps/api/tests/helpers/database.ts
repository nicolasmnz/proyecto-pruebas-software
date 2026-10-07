import pool from "../../src/config/database.js";

export async function resetTestDatabase(): Promise<void> {
  const expectedDatabase = "proyecto_pruebas_test";

  if (process.env.DB_NAME !== expectedDatabase) {
    throw new Error("Las pruebas deben utilizar proyecto_pruebas_test");
  }

  const result = await pool.query("SELECT current_database() AS name");

  if (result.rows[0]?.name !== expectedDatabase) {
    throw new Error("La conexión no corresponde a la base de pruebas");
  }

  await pool.query(`
    TRUNCATE TABLE users
    RESTART IDENTITY CASCADE
  `);
}
