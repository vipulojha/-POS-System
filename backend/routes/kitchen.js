const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE status IN ('pending', 'to_cook', 'preparing') ORDER BY id DESC"
    );
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch kitchen orders" });
  }
});

router.patch("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update kitchen order status" });
  }
});

module.exports = router;
