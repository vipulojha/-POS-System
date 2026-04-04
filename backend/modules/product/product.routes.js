const express = require("express");
const productController = require("./product.controller");

const router = express.Router();

router.use(express.json());

router.post("/", productController.addProduct);
router.get("/", productController.getProducts);

module.exports = router;
