const pool = require("../../db");

const getItemsByOrderId = async (orderId) => {
  const itemResult = await pool.query(
    "SELECT * FROM order_items WHERE order_id = $1 ORDER BY id",
    [orderId]
  );
  return itemResult.rows;
};

const createOrder = async (tableId, items) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const total = items.reduce((sum, item) => {
      return sum + Number(item.price) * Number(item.quantity);
    }, 0);

    const orderResult = await client.query(
      "INSERT INTO orders (table_id, total, status) VALUES ($1, $2, $3) RETURNING *",
      [tableId, total, "pending"]
    );

    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [order.id, item.product_id, item.quantity, item.price]
      );
    }

    await client.query("COMMIT");
    return getOrderById(order.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getAllOrders = async () => {
  const result = await pool.query("SELECT * FROM orders ORDER BY id DESC");
  const ordersWithItems = [];

  for (const order of result.rows) {
    const items = await getItemsByOrderId(order.id);
    ordersWithItems.push({ order, items });
  }

  return ordersWithItems;
};

const getOrderById = async (orderId) => {
  const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [orderId]);
  const items = await getItemsByOrderId(orderId);
  return {
    order: orderResult.rows[0] || null,
    items,
  };
};

const updateOrderStatus = async (orderId, status, paymentMethod = null) => {
  if (paymentMethod) {
    await pool.query(
      "UPDATE orders SET status = $1, payment_method = $2 WHERE id = $3 RETURNING *",
      [status, paymentMethod, orderId]
    );
  } else {
    await pool.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
      [status, orderId]
    );
  }
  return getOrderById(orderId);
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};
