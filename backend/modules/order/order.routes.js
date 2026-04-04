const express = require("express");
const orderController = require("./order.controller");

const router = express.Router();

router.use(express.json());

router.post("/", orderController.addOrder);
router.get("/", orderController.getOrders);
router.get("/:id", orderController.getOrder);
router.patch("/:id", orderController.patchOrderStatus);
router.patch("/:id/pay", orderController.payOrder);

module.exports = router;
