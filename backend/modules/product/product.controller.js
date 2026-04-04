const productModel = require("./product.model");

const addProduct = async (req, res) => {
  try {
    const { name, price } = req.body;
    const product = await productModel.createProduct(name, price);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to add product" });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await productModel.getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

module.exports = {
  addProduct,
  getProducts,
};
