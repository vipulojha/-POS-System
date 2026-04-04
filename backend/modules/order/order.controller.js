const orderModel = require("./order.model");

const addOrder = async (req, res) => {
  try {
    const { table_id, items } = req.body;
    const data = await orderModel.createOrder(table_id, items);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to add order" });
  }
};

const getOrders = async (req, res) => {
  try {
    const data = await orderModel.getAllOrders();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
};

const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await orderModel.getOrderById(id);

    if (!data.order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch order" });
  }
};

const patchOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const data = await orderModel.updateOrderStatus(id, status);

    if (!data.order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update order status" });
  }
};

const payOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method } = req.body || {};
    const data = await orderModel.updateOrderStatus(id, "paid", payment_method || "cash");

    if (!data.order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to mark order as paid" });
  }
};

module.exports = {
  addOrder,
  getOrders,
  getOrder,
  patchOrderStatus,
  payOrder,
};
