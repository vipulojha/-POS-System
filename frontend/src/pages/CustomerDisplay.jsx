import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';

function inr(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export default function CustomerDisplay() {
  const [live, setLive] = useState({ items: [], paymentMethod: 'cash', total: 0, table: 'Table 1' });
  const [mode, setMode] = useState('summary'); // summary | upi | thankyou
  const [orderHistory, setOrderHistory] = useState([]);

  useEffect(() => {
    const sync = () => {
      try {
        const rawLive = localStorage.getItem('customer_display_live');
        const rawMode = localStorage.getItem('customer_display_mode');
        if (rawLive) setLive(JSON.parse(rawLive));
        if (rawMode) setMode(rawMode);
      } catch {}
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
        }));
        setOrderHistory(rows);
      } catch {}
    };
    fetchOrders();
    const id = setInterval(fetchOrders, 5000);
    return () => clearInterval(id);
  }, []);

  const tax = useMemo(() => Number(live.total || 0) * 0.05, [live.total]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-4">
      <div className="mx-auto max-w-[1500px]">
        <div className="odoo-panel p-3 mb-4 flex items-center justify-between">
          <h1 className="hand text-4xl">Customer Display</h1>
          <div className="text-sm text-slate-600">{live.table || 'Table'}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="odoo-panel p-4 min-h-[360px]">
            <div className="btn btn-xs btn-outline mb-2">Logo</div>
            <h2 className="hand text-3xl mb-2">Welcome to Store</h2>
            <p className="text-sm text-slate-600">Powered by Odoo style POS</p>
          </div>

          {mode === 'upi' && (
            <div className="odoo-panel p-4 min-h-[360px] text-center">
              <h2 className="hand text-4xl mb-3">UPI QR</h2>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=demo@upi&pn=OdooCafe&am=10"
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
                    <div key={o.id} className="odoo-card p-2 flex justify-between">
                      <span>#{o.id}</span>
                      <span className={`badge ${o.status === 'completed' || o.status === 'paid' ? 'badge-success' : o.status === 'preparing' ? 'badge-warning' : 'badge-info'}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

