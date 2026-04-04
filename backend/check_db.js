const pool = require('./db');
pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'users\'', (err, res) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(res.rows.map(r => r.column_name));
  process.exit(0);
});
