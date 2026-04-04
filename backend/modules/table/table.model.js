const pool = require("../../db");

const createTable = async (name, seats) => {
  const result = await pool.query(
    "INSERT INTO tables (name, seats) VALUES ($1, $2) RETURNING *",
    [name, seats]
  );
  return result.rows[0];
};

const getAllTables = async () => {
  const result = await pool.query("SELECT * FROM tables");
  return result.rows;
};

const getCurrentOrderByTableId = async (tableId) => {
  const orderResult = await pool.query(
    "SELECT * FROM orders WHERE table_id = $1 AND status = $2 ORDER BY created_at DESC, id DESC LIMIT 1",
    [tableId, "pending"]
  );

  const order = orderResult.rows[0] || null;
  if (!order) {
    return null;
  }

  const itemsResult = await pool.query(
    "SELECT * FROM order_items WHERE order_id = $1 ORDER BY id",
    [order.id]
  );

  return {
    order,
    items: itemsResult.rows,
  };
};

module.exports = {
  createTable,
  getAllTables,
  getCurrentOrderByTableId,
};
