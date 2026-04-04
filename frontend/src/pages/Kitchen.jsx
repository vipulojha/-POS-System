import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Kitchen() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('All');

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {}
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch {}
  };

  const allProducts = useMemo(() => {
    const s = new Set();
    orders.forEach((o) => (o.items || []).forEach((i) => {
      const p = products.find((x) => Number(x.id) === Number(i.product_id));
      s.add(p?.name || `Product ${i.product_id}`);
    }));
    return ['All', ...Array.from(s)];
  }, [orders, products]);

  const stageOf = (status) => {
    if (status === 'completed') return 'Completed';
    if (status === 'preparing') return 'Preparing';
    return 'To Cook';
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const idMatch = String(o.order?.id || '').includes(search);
      const itemMatch = (o.items || []).some((i) => {
        const p = products.find((x) => Number(x.id) === Number(i.product_id));
        return String(i.product_id).includes(search) || String(p?.name || '').toLowerCase().includes(search.toLowerCase());
      });
      const searchOk = !search || idMatch || itemMatch;
      const productOk = productFilter === 'All' || (o.items || []).some((i) => {
        const p = products.find((x) => Number(x.id) === Number(i.product_id));
        return (p?.name || `Product ${i.product_id}`) === productFilter;
      });
      return searchOk && productOk;
    });
  }, [orders, search, productFilter, products]);

  const grouped = {
    'To Cook': filtered.filter((o) => stageOf(o.order?.status) === 'To Cook'),
    Preparing: filtered.filter((o) => stageOf(o.order?.status) === 'Preparing'),
    Completed: filtered.filter((o) => stageOf(o.order?.status) === 'Completed'),
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API_BASE_URL}/kitchen/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
    } catch {}
  };

  const nextStatus = (stage) => (stage === 'To Cook' ? 'preparing' : stage === 'Preparing' ? 'completed' : 'completed');

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 p-4">
      <div className="mx-auto max-w-[1600px] odoo-panel">
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-square" onClick={() => navigate('/pos')}><ArrowLeft size={18} /></button>
            <h1 className="hand text-4xl">Kitchen Display</h1>
          </div>
          <label className="input input-bordered input-sm odoo-input flex items-center gap-2 w-72">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3">
          <aside className="lg:col-span-2 odoo-card p-3">
            <div className="flex items-center gap-2 mb-2 text-slate-300"><Filter size={14} /> Filter</div>
            <div className="space-y-1">
              {allProducts.map((p) => (
                <button key={p} className={`btn btn-sm w-full justify-start ${productFilter === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setProductFilter(p)}>{p}</button>
              ))}
            </div>
          </aside>

          <main className="lg:col-span-10 grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(grouped).map(([stage, list]) => (
              <section key={stage} className="odoo-card p-3 min-h-[520px]">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
                  <h2 className="hand text-3xl">{stage}</h2>
                  <span className="badge badge-warning">{list.length}</span>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-auto scroll-thin">
                  {list.map((entry) => (
                    <button
                      key={entry.order.id}
                      className="w-full text-left odoo-card p-3 hover:border-sky-500"
                      onClick={() => updateStatus(entry.order.id, nextStatus(stage))}
                    >
                      <div className="text-2xl font-bold mb-1">#{entry.order.id}</div>
                      <div className="space-y-1 text-sm text-slate-300">
                        {(entry.items || []).map((it, idx) => (
                          <div key={idx}>- {it.quantity} x {products.find((p) => Number(p.id) === Number(it.product_id))?.name || `Product ${it.product_id}`}</div>
                        ))}
                        {!entry.items?.length && <div>- No items</div>}
                      </div>
                    </button>
                  ))}
                  {!list.length && <p className="text-slate-500 text-sm">No tickets</p>}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
