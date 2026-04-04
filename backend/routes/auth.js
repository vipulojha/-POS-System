const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, password]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const username = String(body.username || body.email || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username/email and password are required" });
    }

    const result = await pool.query(
      "SELECT id, username FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

module.exports = router;
