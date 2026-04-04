const pool = require('./db');
(async () => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)');
    console.log("Users table updated with name and email.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
