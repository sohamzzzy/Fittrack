import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    console.log("Dropping tables...");
    await pool.query("DROP TABLE IF EXISTS supplement_logs CASCADE");
    await pool.query("DROP TABLE IF EXISTS user_supplements CASCADE");
    await pool.query("DROP TABLE IF EXISTS supplements CASCADE");
    console.log("Tables dropped.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

main();
