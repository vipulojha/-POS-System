// Fix for Node 22+ Windows path issue (EISDIR lstat 'C:')
const cwd = process.cwd();
if (cwd.startsWith("\\\\?\\")) {
  process.chdir(cwd.slice(4));
}

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();

const pool = require("./db");

// Global middlewares
app.use(cors());
app.use(express.json());

// Import individual route files
const authRoutes = require("./routes/auth");
const productsRoutes = require("./routes/products");
const tablesRoutes = require("./routes/tables");
const sessionRoutes = require("./routes/session");
const kitchenRoutes = require("./routes/kitchen");
const reportsRoutes = require("./routes/reports");
const selfOrderRoutes = require("./routes/selfOrder");
const routes = require("./routes"); // Modular routes

const PORT = Number(process.env.PORT) || 5001;

app.get("/test", (req, res) => {
  res.send("API working");
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("DB error");
  }
});

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/kitchen", kitchenRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/self-order", selfOrderRoutes);
app.use("/api", routes); // Root modular routes

// Use IPv4 host for wider Windows compatibility when IPv6 is disabled.
const server = app.listen(PORT, "127.0.0.1", () => {
  const addr = server.address();
  console.log("Server listening", addr);
  console.log(`  http://localhost:${PORT}/test`);
  console.log(`  http://localhost:${PORT}/db-test`);
  console.log(`  http://127.0.0.1:${PORT}/test`);
  console.log(`  http://127.0.0.1:${PORT}/db-test`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or run: set PORT=5002&& node ./server.js`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
