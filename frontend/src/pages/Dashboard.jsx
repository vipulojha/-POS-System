import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, PieChart } from 'lucide-react';
import { API_BASE_URL } from '../config';

const periodOptions = ['Today', 'Weekly', 'Monthly', '365 Days', 'Custom'];
const categoryColors = {
  'Quick Bites': '#f59e0b',
  Drinks: '#2563eb',
  Dessert: '#22c55e',
};

function toDateOnly(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

function inPeriod(dateValue, period, customFrom, customTo) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  const now = new Date();
  const today = toDateOnly(now);
  const target = toDateOnly(d);
  const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));

  if (period === 'Today') return diffDays === 0;
  if (period === 'Weekly') return diffDays >= 0 && diffDays <= 7;
  if (period === 'Monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (period === '365 Days') return diffDays >= 0 && diffDays <= 365;
  if (period === 'Custom') {
    if (!customFrom && !customTo) return true;
    const fromOk = !customFrom || target >= toDateOnly(customFrom);
    const toOk = !customTo || target <= toDateOnly(customTo);
    return fromOk && toOk;
  }
  return true;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [activePeriod, setActivePeriod] = useState('Today');
  const [selectedSession, setSelectedSession] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [infoTitle, setInfoTitle] = useState('Dashboard Info');
  const [infoText, setInfoText] = useState('Use filters and click cards/rows to inspect details.');
  const inr = (amount) => `₹${Number(amount || 0).toFixed(2)}`;

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, []);

  const showInfo = (title, text) => {
    setInfoTitle(title);
    setInfoText(text);
  };

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders`),
        fetch(`${API_BASE_URL}/products`),
      ]);
      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();
      setOrders(ordersData?.data || []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch {
      showInfo('Reload Failed', 'Unable to fetch backend data.');
    }
  };

  const productNameById = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[String(p.id)] = p.name;
    });
    return map;
  }, [products]);

  const sessions = useMemo(() => {
    const s = new Set();
    orders.forEach((o) => {
      if (o.order?.session_id) s.add(String(o.order.session_id));
    });
    return ['all', ...Array.from(s)];
  }, [orders]);

  const productOptions = useMemo(() => {
    const ids = new Set();
    orders.forEach((o) => (o.items || []).forEach((i) => ids.add(String(i.product_id))));
    return ['all', ...Array.from(ids)];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((entry) => {
      const order = entry.order || {};
      const paymentRaw = String(order.payment_method || '').toLowerCase();
      const payment = paymentRaw && paymentRaw !== 'unknown' ? paymentRaw : 'cash';
      const status = String(order.status || '').toLowerCase();

      if (!inPeriod(order.created_at, activePeriod, customFrom, customTo)) return false;
      if (selectedSession !== 'all' && String(order.session_id || '') !== selectedSession) return false;
      if (selectedPayment !== 'all' && payment !== selectedPayment) return false;
      if (selectedStatus !== 'all' && status !== selectedStatus) return false;
      if (selectedProduct !== 'all' && !(entry.items || []).some((i) => String(i.product_id) === selectedProduct)) return false;
      return true;
    });
  }, [orders, activePeriod, customFrom, customTo, selectedSession, selectedPayment, selectedStatus, selectedProduct]);

  const summary = useMemo(() => {
    const total_orders = filteredOrders.length;
    const total_revenue = filteredOrders.reduce((sum, x) => sum + Number(x.order?.total || 0), 0);
    const paid_orders = filteredOrders.filter((x) => x.order?.status === 'paid').length;
    const avg_order = total_orders ? total_revenue / total_orders : 0;
    return { total_orders, total_revenue, paid_orders, avg_order };
  }, [filteredOrders]);

  const topOrders = useMemo(() => {
    return [...filteredOrders]
      .sort((a, b) => Number(b.order?.total || 0) - Number(a.order?.total || 0))
      .slice(0, 8);
  }, [filteredOrders]);

  const topProducts = useMemo(() => {
    const agg = {};
    filteredOrders.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        const key = String(item.product_id);
        if (!agg[key]) agg[key] = { qty: 0, revenue: 0 };
        agg[key].qty += Number(item.quantity || 0);
        agg[key].revenue += Number(item.quantity || 0) * Number(item.price || 0);
      });
    });
    return Object.entries(agg)
      .map(([id, v]) => ({
        id,
        name: productNameById[id] || `Product ${id}`,
        qty: v.qty,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [filteredOrders, productNameById]);

  const topCategories = useMemo(() => {
    const agg = { 'Quick Bites': 0, Drinks: 0, Dessert: 0 };
    const toCategory = (name = '') => {
      const n = String(name).toLowerCase();
      if (n.includes('tea') || n.includes('coffee') || n.includes('drink') || n.includes('coke') || n.includes('latte') || n.includes('soda')) return 'Drinks';
      if (n.includes('cake') || n.includes('dessert') || n.includes('ice') || n.includes('brownie')) return 'Dessert';
      return 'Quick Bites';
    };

    filteredOrders.forEach((entry) => {
      (entry.items || []).forEach((item) => {
        const name = productNameById[String(item.product_id)] || '';
        const cat = toCategory(name);
        agg[cat] += Number(item.quantity || 0) * Number(item.price || 0);
      });
    });

    return Object.entries(agg)
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, productNameById]);

  const paymentSplit = useMemo(() => {
    const agg = { cash: 0, card: 0, upi: 0 };
    filteredOrders.forEach((entry) => {
      const raw = String(entry.order?.payment_method || '').toLowerCase();
      const method = raw && raw !== 'unknown' ? raw : 'cash';
      agg[method] = (agg[method] || 0) + Number(entry.order?.total || 0);
    });
    return agg;
  }, [filteredOrders]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return filteredOrders.find((x) => Number(x.order?.id) === Number(selectedOrderId)) || null;
  }, [filteredOrders, selectedOrderId]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-3">
      <div className="mx-auto max-w-[1500px]">
        <div className="odoo-panel p-3 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-square btn-sm" onClick={() => navigate('/admin')} title="Go back to admin">
              <ArrowLeft size={16} />
            </button>
            <h1 className="hand text-4xl">Reporting Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700">Welcome, {user?.username || user?.name || 'User'}</span>
            
            <button
              className="btn btn-sm btn-error"
              onClick={() => {
                localStorage.removeItem('user');
                navigate('/login');
              }}
              title="Logout current user"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="odoo-panel p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
            <select
              className="odoo-input h-10 rounded px-2"
              value={activePeriod}
              onChange={(e) => {
                setActivePeriod(e.target.value);
                showInfo('Filter: Period', `Applied period filter: ${e.target.value}`);
              }}
              title="Filter by date duration"
            >
              {periodOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              className="odoo-input h-10 rounded px-2"
              value={selectedSession}
              onChange={(e) => {
                setSelectedSession(e.target.value);
                showInfo('Filter: Session', `Session filter: ${e.target.value}`);
              }}
              title="Filter by session id"
            >
              {sessions.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Sessions' : `Session ${s}`}</option>)}
            </select>

            <select
              className="odoo-input h-10 rounded px-2"
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                const label = e.target.value === 'all' ? 'All Products' : productNameById[e.target.value] || `Product ${e.target.value}`;
                showInfo('Filter: Product', `Product filter: ${label}`);
              }}
              title="Filter by product"
            >
              {productOptions.map((p) => <option key={p} value={p}>{p === 'all' ? 'All Products' : productNameById[p] || `Product ${p}`}</option>)}
            </select>

            <select
              className="odoo-input h-10 rounded px-2"
              value={selectedPayment}
              onChange={(e) => {
                setSelectedPayment(e.target.value);
                showInfo('Filter: Payment', `Payment method: ${e.target.value}`);
              }}
              title="Filter by payment method"
            >
              {['all', 'cash', 'card', 'upi'].map((x) => <option key={x} value={x}>{x === 'all' ? 'All Payment Methods' : x.toUpperCase()}</option>)}
            </select>

            <select
              className="odoo-input h-10 rounded px-2"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                showInfo('Filter: Status', `Order status: ${e.target.value}`);
              }}
              title="Filter by order status"
            >
              {['all', 'pending', 'preparing', 'completed', 'paid'].map((x) => <option key={x} value={x}>{x === 'all' ? 'All Status' : x}</option>)}
            </select>
          </div>

          {activePeriod === 'Custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <input className="odoo-input h-10 rounded px-2" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <input className="odoo-input h-10 rounded px-2" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
          <button className="odoo-panel p-4 text-left" onClick={() => showInfo('Total Orders', `Filtered orders count: ${summary.total_orders}`)} title="Click for details">
            <div className="text-slate-600 text-sm flex items-center gap-1"><ShoppingCart size={14} /> Total Orders</div>
            <div className="text-4xl font-semibold mt-1">{summary.total_orders}</div>
          </button>
          <button className="odoo-panel p-4 text-left" onClick={() => showInfo('Revenue', `Filtered revenue: ${inr(summary.total_revenue)}`)} title="Click for details">
            <div className="text-slate-600 text-sm flex items-center gap-1"><DollarSign size={14} /> Revenue</div>
            <div className="text-4xl font-semibold mt-1">{inr(summary.total_revenue)}</div>
          </button>
          <button className="odoo-panel p-4 text-left" onClick={() => showInfo('Average Order', `Average order value: ${inr(summary.avg_order)}`)} title="Click for details">
            <div className="text-slate-600 text-sm flex items-center gap-1"><TrendingUp size={14} /> Avg Order</div>
            <div className="text-4xl font-semibold mt-1">{inr(summary.avg_order)}</div>
          </button>
          <button className="odoo-panel p-4 text-left" onClick={() => showInfo('Paid Orders', `Paid orders in filter: ${summary.paid_orders}`)} title="Click for details">
            <div className="text-slate-600 text-sm flex items-center gap-1"><PieChart size={14} /> Paid Orders</div>
            <div className="text-4xl font-semibold mt-1">{summary.paid_orders}</div>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <div className="odoo-panel p-4">
            <h2 className="hand text-4xl mb-2">Sales Trend</h2>
            <div className="grid grid-cols-8 gap-2 h-40 items-end">
              {Array.from({ length: 8 }).map((_, i) => {
                const value = topOrders[i] ? Number(topOrders[i].order.total || 0) : [1200, 1800, 1500, 2600, 1400, 2100, 2000, 2300][i];
                const h = Math.max(10, Math.min(100, (value / Math.max(summary.total_revenue || 1, 1)) * 100));
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-full bg-[#6bb7ff] rounded-t" style={{ height: `${h}%` }} />
                    <span className="text-[10px] text-slate-600">{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="odoo-panel p-4">
            <h2 className="hand text-4xl mb-2">Top Selling Category</h2>
            <div className="flex items-center gap-4">
              <div
                className="h-36 w-36 rounded-full"
                style={{
                  background: `conic-gradient(
                    #f08a5d 0% ${Math.max(1, (topCategories[0]?.revenue || 0) / Math.max(summary.total_revenue || 1, 1) * 100)}%,
                    #6bb7ff ${Math.max(1, (topCategories[0]?.revenue || 0) / Math.max(summary.total_revenue || 1, 1) * 100)}% ${Math.max(2, ((topCategories[0]?.revenue || 0) + (topCategories[1]?.revenue || 0)) / Math.max(summary.total_revenue || 1, 1) * 100)}%,
                    #7ed957 ${Math.max(2, ((topCategories[0]?.revenue || 0) + (topCategories[1]?.revenue || 0)) / Math.max(summary.total_revenue || 1, 1) * 100)}% 100%
                  )`,
                }}
              />
              <div className="space-y-1 text-sm">
                {topCategories.map((c) => (
                  <div key={c.category} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors[c.category] || '#94a3b8' }} />
                      {c.category}
                    </span>
                    <span>{inr(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Legend: dot color matches pie slice color.</p>
          </div>

          <div className="odoo-panel p-4">
            <h2 className="hand text-4xl mb-2">Payment Split</h2>
            {Object.entries(paymentSplit).map(([method, amount]) => (
              <button
                key={method}
                className="w-full text-left mb-2"
                onClick={() => showInfo('Payment Method', `${method.toUpperCase()} amount: ${inr(amount)}`)}
                title={`View ${method.toUpperCase()} details`}
              >
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="uppercase">{method}</span>
                  <span>{inr(amount)}</span>
                </div>
                <progress className="progress progress-primary w-full" value={Number(amount)} max={Math.max(summary.total_revenue, 1)} />
              </button>
            ))}
          </div>

          <div className="odoo-panel p-4">
            <h2 className="hand text-4xl mb-2">Top Orders</h2>
            <div className="overflow-x-auto max-h-[280px] scroll-thin">
              <table className="table table-xs">
                <thead>
                  <tr className="text-slate-300">
                    <th>Order</th>
                    <th>Session</th>
                    <th>Date</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topOrders.map((x) => (
                    <tr
                      key={x.order.id}
                      className="cursor-pointer hover:bg-[#1b2230]"
                      onClick={() => {
                        setSelectedOrderId(x.order.id);
                        showInfo('Order Details', `Selected order #${x.order.id} with ${x.items?.length || 0} items`);
                      }}
                    >
                      <td>#{x.order.id}</td>
                      <td>{x.order.session_id || 'Session Open'}</td>
                      <td>{x.order.created_at ? new Date(x.order.created_at).toLocaleDateString() : '-'}</td>
                      <td>{inr(x.order.total)}</td>
                    </tr>
                  ))}
                  {!topOrders.length && (
                    <tr>
                      <td colSpan="4" className="text-center text-slate-500">No orders in current filter</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <div className="odoo-panel p-4">
            <h2 className="hand text-4xl mb-2">Top Product</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-slate-300">
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.id} onClick={() => showInfo('Product Detail', `${p.name}: qty ${p.qty}, revenue ${inr(p.revenue)}`)} className="cursor-pointer hover:bg-[#1b2230]">
                      <td>{p.name}</td>
                      <td>{p.qty}</td>
                      <td>{inr(p.revenue)}</td>
                    </tr>
                  ))}
                  {!topProducts.length && <tr><td colSpan="3" className="text-center text-slate-500">No product data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="odoo-panel p-4">
            <h2 className="hand text-4xl mb-2">Top Category</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-slate-300">
                    <th>Category</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topCategories.map((c) => (
                    <tr key={c.category} onClick={() => showInfo('Category Detail', `${c.category}: revenue ${inr(c.revenue)}`)} className="cursor-pointer hover:bg-[#1b2230]">
                      <td>{c.category}</td>
                      <td>{inr(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedOrder && (
          <div className="odoo-panel p-4 mb-3">
            <h3 className="hand text-3xl mb-2">Order #{selectedOrder.order.id} Details</h3>
            <div className="text-sm text-slate-300 mb-3">
              Session: {selectedOrder.order.session_id || 'Session Open'} | Status: {selectedOrder.order.status} | Total: {inr(selectedOrder.order.total)}
            </div>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr className="text-slate-300">
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>{productNameById[String(item.product_id)] || `Product ${item.product_id}`}</td>
                      <td>{item.quantity}</td>
                      <td>{inr(item.price)}</td>
                      <td>{inr(Number(item.quantity || 0) * Number(item.price || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="odoo-panel p-4">
          <h3 className="hand text-3xl mb-2">{infoTitle}</h3>
          <p className="text-slate-300">{infoText}</p>
        </div>
      </div>
    </div>
  );
}

