const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, seats } = req.body;
    const result = await pool.query(
      "INSERT INTO tables (name, seats) VALUES ($1, $2) RETURNING *",
      [name, seats]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create table" });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tables ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

module.exports = router;
