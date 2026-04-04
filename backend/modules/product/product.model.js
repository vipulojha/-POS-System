const pool = require("../../db");

const createProduct = async (name, price) => {
  const result = await pool.query(
    "INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *",
    [name, price]
  );
  return result.rows[0];
};

const getAllProducts = async () => {
  const result = await pool.query("SELECT * FROM products");
  return result.rows;
};

module.exports = {
  createProduct,
  getAllProducts,
};
