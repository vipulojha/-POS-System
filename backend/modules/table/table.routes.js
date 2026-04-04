const express = require("express");
const tableController = require("./table.controller");

const router = express.Router();

router.use(express.json());

router.post("/", tableController.addTable);
router.get("/", tableController.getTables);
router.get("/:id/current-order", tableController.getCurrentOrder);

module.exports = router;
