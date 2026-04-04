const express = require("express");
const pool = require("../db");

const router = express.Router();

function generateToken() {
  return `tok_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

router.post("/token", async (req, res) => {
  try {
    const { table_id } = req.body;
    const token = generateToken();
    const result = await pool.query(
      "INSERT INTO self_order_tokens (token, table_id) VALUES ($1, $2) RETURNING *",
      [token, table_id]
    );
    res.json({ success: true, token: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to generate token" });
  }
});

router.post("/order", async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, items } = req.body;

    await client.query("BEGIN");

    const tokenResult = await client.query(
      "SELECT * FROM self_order_tokens WHERE token = $1 ORDER BY id DESC LIMIT 1",
      [token]
    );

    if (!tokenResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Invalid token" });
    }

    const tableId = tokenResult.rows[0].table_id;
    const total = (items || []).reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity);
    }, 0);

    const orderResult = await client.query(
      "INSERT INTO orders (table_id, total, status) VALUES ($1, $2, $3) RETURNING *",
      [tableId, total, "pending"]
    );
    const order = orderResult.rows[0];

    for (const item of items || []) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [order.id, item.product_id, item.quantity, item.price]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true, order });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: "Failed to create self order" });
  } finally {
    client.release();
  }
});

module.exports = router;
