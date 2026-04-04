const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS total_orders, COALESCE(SUM(total), 0)::numeric AS total_revenue FROM orders"
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch report summary" });
  }
});

module.exports = router;
