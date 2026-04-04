import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../config';

const inr = (amount) => `₹${Number(amount || 0).toFixed(2)}`;

export default function OrdersCenter() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  async function fetchAll() {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders`),
        fetch(`${API_BASE_URL}/products`),
      ]);
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      const safeOrders = ordersData?.data || [];
      setOrders(safeOrders);
      setProducts(Array.isArray(productsData) ? productsData : []);
      if (!selectedOrder && safeOrders[0]) setSelectedOrder(safeOrders[0]);
    } catch (error) {
      console.error('OrdersCenter fetchAll failed:', error);
    }
  }

  useEffect(() => {
    const initId = setTimeout(fetchAll, 0);
    const id = setInterval(fetchAll, 6000);
    return () => {
      clearTimeout(initId);
      clearInterval(id);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => (m[String(p.id)] = p.name));
    return m;
  }, [products]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-4">
      <div className="mx-auto max-w-[1600px]">
        <div className="odoo-panel p-3 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-square btn-sm" onClick={() => navigate('/admin')}>
              <ArrowLeft size={16} />
            </button>
            <h1 className="hand text-4xl">Orders Workspace</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div className="xl:col-span-4 odoo-panel p-3 max-h-[78vh] overflow-auto scroll-thin">
            <h2 className="hand text-3xl mb-2">Orders</h2>
            <div className="space-y-2">
              {orders.map((entry) => (
                <button
                  key={entry.order.id}
                  className={`odoo-card w-full p-3 text-left ${selectedOrder?.order?.id === entry.order.id ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                  onClick={() => setSelectedOrder(entry)}
                >
                  <div className="flex justify-between text-sm">
                    <span>Order #{entry.order.id}</span>
                    <span>{inr(entry.order.total)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Session {entry.order.session_id || 'Open'} • {entry.order.status}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-8 odoo-panel p-4">
            <h2 className="hand text-4xl mb-2">Order Details</h2>
            {!selectedOrder && <p className="text-slate-400">Select an order card to view details.</p>}
            {selectedOrder && (
              <>
                <div className="text-sm text-slate-300 mb-3">
                  #{selectedOrder.order.id} • Session {selectedOrder.order.session_id || 'Open'} • {selectedOrder.order.status}
                </div>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it, i) => (
                        <tr key={i}>
                          <td>{productMap[String(it.product_id)] || `Product ${it.product_id}`}</td>
                          <td>{it.quantity}</td>
                          <td>{inr(it.price)}</td>
                          <td>{inr(Number(it.quantity) * Number(it.price))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-lg font-semibold">Total: {inr(selectedOrder.order.total)}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
