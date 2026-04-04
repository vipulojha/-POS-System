const tableModel = require("./table.model");

const addTable = async (req, res) => {
  try {
    const { name, seats } = req.body;
    const table = await tableModel.createTable(name, seats);
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: "Failed to add table" });
  }
};

const getTables = async (req, res) => {
  try {
    const tables = await tableModel.getAllTables();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tables" });
  }
};

const getCurrentOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await tableModel.getCurrentOrderByTableId(id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch current order" });
  }
};

module.exports = {
  addTable,
  getTables,
  getCurrentOrder,
};
