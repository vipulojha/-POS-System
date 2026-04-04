import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../config';

function inr(amount) {
  return `\u20B9${Number(amount || 0).toFixed(2)}`;
}

export default function CustomerDisplay() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [live, setLive] = useState({ items: [], paymentMethod: 'cash', total: 0, table: 'Table 1' });
  const [mode, setMode] = useState('summary'); // summary | upi | thankyou
  const [orderHistory, setOrderHistory] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [upiId, setUpiId] = useState('demo@upi');

  useEffect(() => {
    const sync = () => {
      try {
        const rawLive = localStorage.getItem('customer_display_live');
        const rawMode = localStorage.getItem('customer_display_mode');
        const rawPaymentStatus = localStorage.getItem('customer_display_payment_status');
        const rawUpiId = localStorage.getItem('admin_upi_id');
        if (rawLive) setLive(JSON.parse(rawLive));
        if (rawMode) setMode(rawMode);
        if (rawPaymentStatus) setPaymentStatus(rawPaymentStatus);
        if (rawUpiId) setUpiId(rawUpiId);
      } catch (error) {
        console.error('CustomerDisplay sync failed:', error);
      }
    };
    sync();
    const id = setInterval(sync, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders`);
        const data = await res.json();
        const rows = (data?.data || []).slice(0, 6).map((x) => ({
          id: x.order.id,
          status: x.order.status,
          total: Number(x.order.total || 0),
          createdAt: x.order.created_at ? new Date(x.order.created_at).toLocaleString() : '-',
          payment: x.order.payment_method || 'cash',
          items: x.items || [],
        }));
        setOrderHistory(rows);
        setSelectedOrderId((prev) => prev || rows[0]?.id || null);
      } catch (error) {
        console.error('CustomerDisplay fetchOrders failed:', error);
      }
    };
    fetchOrders();
    const id = setInterval(fetchOrders, 5000);
    return () => clearInterval(id);
  }, []);

  const tax = useMemo(() => Number(live.total || 0) * 0.05, [live.total]);
  const selectedOrder = useMemo(
    () => orderHistory.find((o) => Number(o.id) === Number(selectedOrderId)) || null,
    [orderHistory, selectedOrderId]
  );
  const goBack = () => {
    const role = String(user?.role || '').toLowerCase();
    if (role === 'admin') navigate('/admin');
    else navigate('/pos');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-4">
      <div className="mx-auto max-w-[1500px]">
        <div className="odoo-panel p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-square btn-sm" onClick={goBack} title="Back to menu">
              <ArrowLeft size={16} />
            </button>
            <h1 className="hand text-4xl">Customer Details</h1>
          </div>
          <div className="text-sm text-slate-600">{live.table || 'Table'}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="odoo-panel p-4 min-h-[360px]">
            <h2 className="hand text-3xl mb-2">Welcome, {user.username || 'Guest'}</h2>
            <p className="text-sm text-slate-600">Powered by Odoo style POS</p>
          </div>

          {mode === 'upi' && (
            <div className="odoo-panel p-4 min-h-[360px] text-center">
              <h2 className="hand text-4xl mb-3">UPI QR</h2>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=OdooCafe&am=${Number(live.total || 0).toFixed(2)}`)}`}
                className="mx-auto bg-white p-2 rounded"
              />
              <p className="text-xl mt-3">{inr(live.total)}</p>
            </div>
          )}

          {mode !== 'upi' && (
            <div className="odoo-panel p-4 min-h-[360px]">
              <h2 className="hand text-4xl mb-3">Current Bill</h2>
              <div className="space-y-2 max-h-[220px] overflow-auto scroll-thin">
                {(live.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-sm border-b border-slate-300 pb-1">
                    <span>{it.quantity} x {it.name}</span>
                    <span>{inr(Number(it.quantity) * Number(it.price))}</span>
                  </div>
                ))}
                {!live.items?.length && <p className="text-slate-500">No active items</p>}
              </div>
              <div className="mt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Sub Total</span><span>{inr(live.total)}</span></div>
                <div className="flex justify-between"><span>Tax (5%)</span><span>{inr(tax)}</span></div>
                <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{inr(Number(live.total) + tax)}</span></div>
                <div className="flex justify-between">
                  <span>Payment Status</span>
                  <span className={`badge ${paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>{paymentStatus}</span>
                </div>
              </div>
            </div>
          )}

          <div className="odoo-panel p-4 min-h-[360px]">
            {mode === 'thankyou' ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="hand text-5xl mb-2">Thank You</div>
                  <div className="text-xl">See you again</div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="hand text-4xl mb-3">Order History</h2>
                <div className="space-y-2">
                  {orderHistory.map((o) => (
                    <button
                      key={o.id}
                      className={`odoo-card p-2 w-full text-left ${Number(selectedOrderId) === Number(o.id) ? 'border-sky-400 ring-1 ring-sky-400' : ''}`}
                      onClick={() => setSelectedOrderId(o.id)}
                    >
                      <div className="flex justify-between">
                        <span>#{o.id}</span>
                        <span className={`badge ${o.status === 'completed' || o.status === 'paid' ? 'badge-success' : o.status === 'preparing' ? 'badge-warning' : 'badge-info'}`}>{o.status}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{o.createdAt}</div>
                      <div className="text-xs text-slate-300 mt-1">Method: {String(o.payment).toUpperCase()} | Total: {inr(o.total)}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 border-t border-slate-700 pt-3">
                  <div className="text-sm font-semibold mb-2">Selected Order Details</div>
                  {selectedOrder ? (
                    <div className="space-y-1 max-h-32 overflow-auto scroll-thin pr-1">
                      {selectedOrder.items.length ? selectedOrder.items.map((it, idx) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span>{it.quantity} x Product #{it.product_id}</span>
                          <span>{inr(Number(it.quantity || 0) * Number(it.price || 0))}</span>
                        </div>
                      )) : <div className="text-xs text-slate-500">No items available.</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Select an order to view item details.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


