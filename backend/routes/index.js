const express = require("express");

const productRoutes = require("../modules/product/product.routes");
const tableRoutes = require("../modules/table/table.routes");
const orderRoutes = require("../modules/order/order.routes");

const router = express.Router();

router.use("/products", productRoutes);
router.use("/tables", tableRoutes);
router.use("/orders", orderRoutes);

module.exports = router;
