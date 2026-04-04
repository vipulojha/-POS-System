const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/open", async (req, res) => {
  try {
    const result = await pool.query(
      "INSERT INTO sessions (opened_at, total_sales) VALUES (NOW(), 0) RETURNING *"
    );
    res.json({ success: true, session: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to open session" });
  }
});

router.get("/current", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM sessions ORDER BY id DESC LIMIT 1");
    res.json({ success: true, session: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch current session" });
  }
});

module.exports = router;
