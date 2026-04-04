import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, RefreshCw, Settings, Copy, Search } from 'lucide-react';
import { API_BASE_URL } from '../config';

const topMenus = ['Orders', 'Products', 'Reporting'];
const sideMenus = {
  Orders: ['Orders', 'Payment', 'Customer'],
  Products: ['Products', 'Category', 'Floor Plan'],
  Reporting: ['Dashboard'],
};

const defaultCategories = [
  { id: 'quick-bites', name: 'Quick Bites', color: '#7c5cff' },
  { id: 'drinks', name: 'Drinks', color: '#4aa3ff' },
  { id: 'dessert', name: 'Dessert', color: '#ff9f43' },
];
const categoryShades = ['#7c5cff', '#4aa3ff', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

function formatTableName(table, idx) {
  const raw = (table?.name || '').trim();
  const m = raw.match(/\d+/);
  if (m) return `Table ${m[0]}`;
  return `Table ${idx + 1}`;
}

function paymentLabel(raw) {
  const p = String(raw || '').toLowerCase();
  if (!p || p === 'unknown') return 'Cash';
  if (p === 'upi') return 'UPI';
  if (p === 'card') return 'Card';
  return 'Cash';
}

const inr = (amount) => `\u20B9${Number(amount || 0).toFixed(2)}`;

export default function Admin() {
  const navigate = useNavigate();
  const [activeTopMenu, setActiveTopMenu] = useState('Orders');
  const [activeSideMenu, setActiveSideMenu] = useState('Orders');
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ total_orders: 0, total_revenue: 0 });
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState('4');
  const [productTab, setProductTab] = useState('General Info');
  const [productCategory, setProductCategory] = useState('Quick Bites');
  const [productTax, setProductTax] = useState('5');
  const [productUom, setProductUom] = useState('Unit');
  const [productDesc, setProductDesc] = useState('');
  const [variantRows, setVariantRows] = useState([
    { attr: 'Pack', value: '6', unit: 'Unit', extra: '20' },
    { attr: 'Pack', value: '12', unit: 'Unit', extra: '0' },
  ]);
  const [categories, setCategories] = useState(() => {
    const raw = localStorage.getItem('admin_categories');
    return raw ? JSON.parse(raw) : defaultCategories;
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#7c5cff');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState(() => {
    const raw = localStorage.getItem('admin_customers');
    return raw
      ? JSON.parse(raw)
      : [
          { id: 1, name: 'Eric', email: 'eric@odoo.com', phone: '+91 9898989898', city: 'Gandhinagar', state: 'Gujarat', country: 'India', totalSales: 2000 },
          { id: 2, name: 'Smith', email: 'smith@odoo.com', phone: '+91 9797979797', city: 'Ahmedabad', state: 'Gujarat', country: 'India', totalSales: 1200 },
        ];
  });
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    country: 'India',
  });
  const [floorName, setFloorName] = useState('Ground Floor');
  const [selectedSession, setSelectedSession] = useState('all');
  const [selectedTables, setSelectedTables] = useState([]);
  const [hiddenTableIds, setHiddenTableIds] = useState([]);

  useEffect(() => {
    const firstSide = sideMenus[activeTopMenu][0];
    setActiveSideMenu(firstSide);
  }, [activeTopMenu]);

  useEffect(() => {
    localStorage.setItem('admin_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('admin_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [productsRes, tablesRes, ordersRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/tables`),
        fetch(`${API_BASE_URL}/orders`),
        fetch(`${API_BASE_URL}/reports/summary`),
      ]);

      const productsData = await productsRes.json();
      const tablesData = await tablesRes.json();
      const ordersData = await ordersRes.json();
      const summaryData = await summaryRes.json();

      setProducts(Array.isArray(productsData) ? productsData : []);
      setTables(Array.isArray(tablesData) ? tablesData : []);
      setOrders(ordersData?.data || []);
      setSummary({
        total_orders: Number(summaryData?.total_orders || 0),
        total_revenue: Number(summaryData?.total_revenue || 0),
      });
    } catch {}
  };

  const paymentGroups = useMemo(() => {
    const grouped = {};
    orders.forEach((entry) => {
      const key = paymentLabel(entry.order?.payment_method);
      grouped[key] = (grouped[key] || 0) + Number(entry.order?.total || 0);
    });
    return grouped;
  }, [orders]);

  const paymentRows = useMemo(() => {
    return orders
      .filter((x) => x.order?.status === 'paid')
      .map((x) => ({
        id: x.order.id,
        method: paymentLabel(x.order.payment_method),
        date: x.order.created_at ? new Date(x.order.created_at).toLocaleDateString() : '-',
        amount: Number(x.order.total || 0),
      }));
  }, [orders]);

  const createProduct = async (e) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) return;
    try {
      await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProductName, price: Number(newProductPrice) }),
      });
      setNewProductName('');
      setNewProductPrice('');
      setProductDesc('');
      fetchAll();
    } catch {}
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch {}
  };

  const createTable = async (e) => {
    e.preventDefault();
    if (!newTableName) return;
    try {
      await fetch(`${API_BASE_URL}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTableName, seats: Number(newTableSeats || 4) }),
      });
      setNewTableName('');
      setNewTableSeats('4');
      fetchAll();
    } catch {}
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const id = `${newCategoryName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    setCategories((prev) => [...prev, { id, name: newCategoryName.trim(), color: newCategoryColor }]);
    setNewCategoryName('');
  };

  const removeCategory = (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addCustomer = (e) => {
    e.preventDefault();
    if (!customerForm.name || !customerForm.email) return;
    setCustomers((prev) => [
      ...prev,
      { id: Date.now(), ...customerForm, totalSales: 0 },
    ]);
    setCustomerForm({ name: '', email: '', phone: '', city: '', state: '', country: 'India' });
  };

  const visibleTables = useMemo(() => {
    return tables.filter((t) => !hiddenTableIds.includes(t.id));
  }, [tables, hiddenTableIds]);

  const sessionOptions = useMemo(() => {
    const s = new Set();
    orders.forEach((x) => {
      if (x.order?.session_id) s.add(String(x.order.session_id));
    });
    return ['all', ...Array.from(s)];
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => {
      if (!q) return true;
      return String(c.name).toLowerCase().includes(q) || String(c.email).toLowerCase().includes(q) || String(c.phone).toLowerCase().includes(q);
    });
  }, [customers, customerSearch]);

  const toggleTableSelection = (id) => {
    setSelectedTables((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const duplicateSelectedTables = () => {
    const toDuplicate = visibleTables.filter((t) => selectedTables.includes(t.id));
    const copies = toDuplicate.map((t, idx) => ({
      ...t,
      id: Date.now() + idx,
      name: `${formatTableName(t, idx)} Copy`,
    }));
    setTables((prev) => [...prev, ...copies]);
  };

  const removeSelectedTables = () => {
    setHiddenTableIds((prev) => [...new Set([...prev, ...selectedTables])]);
    setSelectedTables([]);
  };

  const renderOrders = () => (
    <div className="odoo-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="hand text-4xl">Orders</h2>
        <button className="btn btn-sm btn-ghost" onClick={fetchAll}><RefreshCw size={14} /></button>
      </div>
      <div className="odoo-card p-4">
        <p className="text-slate-300 mb-3">
          Orders now open in a dedicated workspace page with card view and full item-level details.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/orders-center')}>
          Open Orders Workspace
        </button>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="odoo-panel p-4">
        <h2 className="hand text-4xl mb-3">Payment Summary</h2>
        <div className="space-y-2">
          {Object.entries(paymentGroups).map(([method, amount]) => (
            <div className="odoo-card p-2 flex justify-between" key={method}>
              <span>{method}</span>
              <span>{inr(amount)}</span>
            </div>
          ))}
          {!Object.keys(paymentGroups).length && <p className="text-slate-500">No payment data</p>}
        </div>
      </div>

      <div className="odoo-panel p-4">
        <h2 className="hand text-4xl mb-3">Payment Rows</h2>
        <div className="overflow-x-auto max-h-[360px] scroll-thin">
          <table className="table table-sm">
            <thead>
              <tr className="text-slate-300">
                <th>Method</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {paymentRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.method}</td>
                  <td>{r.date}</td>
                  <td>{inr(r.amount)}</td>
                </tr>
              ))}
              {!paymentRows.length && <tr><td colSpan="3" className="text-center text-slate-500">No paid rows</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCustomer = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="odoo-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="hand text-4xl">Customer List</h2>
          <label className="input input-sm odoo-input flex items-center gap-2 w-60">
            <Search size={14} />
            <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search customer..." />
          </label>
        </div>
        <div className="overflow-x-auto max-h-[360px] scroll-thin">
          <table className="table table-sm">
            <thead>
              <tr className="text-slate-300">
                <th>Name</th>
                <th>Contact</th>
                <th>Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <div>{c.email}</div>
                    <div className="text-xs text-slate-400">{c.phone}</div>
                  </td>
                  <td>{inr(c.totalSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form className="odoo-panel p-4" onSubmit={addCustomer}>
        <h2 className="hand text-4xl mb-3">New Customer</h2>
        <div className="space-y-2">
          <input className="odoo-input w-full h-10 rounded px-3" placeholder="Name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
          <input className="odoo-input w-full h-10 rounded px-3" placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
          <input className="odoo-input w-full h-10 rounded px-3" placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
          <input className="odoo-input w-full h-10 rounded px-3" placeholder="City" value={customerForm.city} onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="odoo-input w-full h-10 rounded px-3" placeholder="State" value={customerForm.state} onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })} />
            <input className="odoo-input w-full h-10 rounded px-3" placeholder="Country" value={customerForm.country} onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })} />
          </div>
          <button className="btn btn-odoo border-none mt-2"><Plus size={14} /> Save Customer</button>
        </div>
      </form>
    </div>
  );

  const renderProducts = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <form className="odoo-panel p-4" onSubmit={createProduct}>
        <h2 className="hand text-4xl mb-3">Product Creation</h2>
        <div className="tabs tabs-boxed bg-transparent p-0 mb-3 gap-1">
          {['General Info', 'Variant'].map((tab) => (
            <button key={tab} type="button" className={`tab text-xs ${productTab === tab ? 'tab-active' : ''}`} onClick={() => setProductTab(tab)}>{tab}</button>
          ))}
        </div>

        {productTab === 'General Info' && (
          <div className="space-y-2">
            <input className="odoo-input w-full h-10 rounded px-3" placeholder="Product name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="odoo-input h-10 rounded px-3" placeholder="Price" type="number" step="0.01" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} />
              <select className="odoo-input h-10 rounded px-2" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                {categories.map((c) => <option key={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="odoo-input h-10 rounded px-2" value={productTax} onChange={(e) => setProductTax(e.target.value)}>
                {['5', '12', '18', '28'].map((x) => <option key={x} value={x}>{x}%</option>)}
              </select>
              <select className="odoo-input h-10 rounded px-2" value={productUom} onChange={(e) => setProductUom(e.target.value)}>
                {['Unit', 'KG', 'Liter', 'Pack'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <input className="odoo-input w-full h-10 rounded px-3" placeholder="Description" value={productDesc} onChange={(e) => setProductDesc(e.target.value)} />
          </div>
        )}

        {productTab === 'Variant' && (
          <div className="overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr className="text-slate-300">
                  <th>Attribute</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>Extra Price</th>
                </tr>
              </thead>
              <tbody>
                {variantRows.map((v, idx) => (
                  <tr key={idx}>
                    <td><input className="odoo-input h-8 rounded px-2 w-24" value={v.attr} onChange={(e) => {
                      const next = [...variantRows];
                      next[idx].attr = e.target.value;
                      setVariantRows(next);
                    }} /></td>
                    <td><input className="odoo-input h-8 rounded px-2 w-20" value={v.value} onChange={(e) => {
                      const next = [...variantRows];
                      next[idx].value = e.target.value;
                      setVariantRows(next);
                    }} /></td>
                    <td>
                      <select className="odoo-input h-8 rounded px-2 w-20" value={v.unit} onChange={(e) => {
                        const next = [...variantRows];
                        next[idx].unit = e.target.value;
                        setVariantRows(next);
                      }}>
                        {['Unit', 'KG', 'Liter'].map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td><input className="odoo-input h-8 rounded px-2 w-20" value={v.extra} onChange={(e) => {
                      const next = [...variantRows];
                      next[idx].extra = e.target.value;
                      setVariantRows(next);
                    }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button className="btn btn-odoo border-none mt-3"><Plus size={14} /> Save Product</button>
      </form>

      <div className="odoo-panel p-4">
        <h2 className="hand text-4xl mb-3">Products List</h2>
        <div className="overflow-x-auto max-h-[420px] scroll-thin">
          <table className="table table-sm">
            <thead>
              <tr className="text-slate-300">
                <th>Product</th>
                <th>Sale Price</th>
                <th>Tax</th>
                <th>UOM</th>
                <th>Category</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => {
                const cat = categories[idx % Math.max(categories.length, 1)] || { name: 'Quick Bites', color: '#7c5cff' };
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{inr(p.price)}</td>
                    <td>{['5%', '12%', '18%'][idx % 3]}</td>
                    <td>{['Unit', 'KG', 'Pack'][idx % 3]}</td>
                    <td><span className="badge" style={{ backgroundColor: cat.color }}>{cat.name}</span></td>
                    <td>
                      <button className="btn btn-xs btn-outline btn-error" onClick={() => deleteProduct(p.id)}><Trash2 size={12} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCategory = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="odoo-panel p-4">
        <h2 className="hand text-4xl mb-3">Product Category</h2>
        <div className="overflow-x-auto max-h-[360px] scroll-thin">
          <table className="table table-sm">
            <thead>
              <tr className="text-slate-300">
                <th>Category</th>
                <th>Color</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><span className="badge" style={{ backgroundColor: c.color }}>{c.color}</span></td>
                  <td><button className="btn btn-xs btn-outline btn-error" onClick={() => removeCategory(c.id)}><Trash2 size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="odoo-panel p-4">
        <h2 className="hand text-4xl mb-3">New Category</h2>
        <div className="space-y-2">
          <input className="odoo-input w-full h-10 rounded px-3" placeholder="Category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
          <div className="flex items-center gap-2">
            {categoryShades.map((shade) => (
              <button
                key={shade}
                type="button"
                className={`h-6 w-6 rounded-full border-2 ${newCategoryColor === shade ? 'border-white scale-110' : 'border-slate-500'} transition-transform`}
                style={{ backgroundColor: shade }}
                onClick={() => setNewCategoryColor(shade)}
                title={shade}
              />
            ))}
          </div>
          <button className="btn btn-odoo border-none" onClick={addCategory}><Plus size={14} /> Add Category</button>
        </div>
      </div>
    </div>
  );

  const renderFloorPlan = () => (
    <div className="grid grid-cols-1 gap-3">
      <div className="odoo-panel p-4">
        <h2 className="hand text-4xl mb-3">Floor Plan Setup</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="odoo-input h-10 rounded px-3" value={floorName} onChange={(e) => setFloorName(e.target.value)} />
          <select className="odoo-input h-10 rounded px-2" value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}>
            {sessionOptions.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Sessions' : `Session ${s}`}</option>)}
          </select>
          <form onSubmit={createTable} className="grid grid-cols-3 gap-2">
            <input className="odoo-input h-10 rounded px-3 col-span-2" placeholder="Table name (e.g. Table 6)" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} />
            <button className="btn btn-secondary h-10">Add</button>
          </form>
        </div>
      </div>

      <div className="odoo-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="hand text-4xl">{floorName}</h2>
          <div className="flex gap-2">
            <button className="btn btn-xs btn-outline" onClick={duplicateSelectedTables}><Copy size={12} /> Duplicate</button>
            <button className="btn btn-xs btn-outline btn-error" onClick={removeSelectedTables}><Trash2 size={12} /> Remove</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr className="text-slate-300">
                <th></th>
                <th>Table</th>
                <th>Seats</th>
                <th>Active</th>
                <th>Resource</th>
              </tr>
            </thead>
            <tbody>
              {visibleTables.map((t, idx) => (
                <tr key={t.id}>
                  <td>
                    <input type="checkbox" className="checkbox checkbox-xs" checked={selectedTables.includes(t.id)} onChange={() => toggleTableSelection(t.id)} />
                  </td>
                  <td>{formatTableName(t, idx)}</td>
                  <td>{t.seats}</td>
                  <td><span className="badge badge-success">Active</span></td>
                  <td>{`${formatTableName(t, idx)} (${t.seats} seats)`}</td>
                </tr>
              ))}
              {!visibleTables.length && <tr><td colSpan="5" className="text-center text-slate-500">No tables in this floor plan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <div className="odoo-panel p-4">
        <div className="text-sm text-slate-400">Total Orders</div>
        <div className="text-4xl font-semibold mt-1">{summary.total_orders}</div>
      </div>
      <div className="odoo-panel p-4">
        <div className="text-sm text-slate-400">Revenue</div>
        <div className="text-4xl font-semibold mt-1">{inr(summary.total_revenue)}</div>
      </div>
      <div className="odoo-panel p-4 md:col-span-2 xl:col-span-2">
        <div className="text-sm text-slate-400 mb-2">Status Mix</div>
        <div className="flex gap-2 flex-wrap">
          {['pending', 'preparing', 'completed', 'paid'].map((s) => {
            const count = orders.filter((o) => o.order?.status === s).length;
            return <span className="badge badge-neutral" key={s}>{s}: {count}</span>;
          })}
        </div>
      </div>
    </div>
  );

  const renderMain = () => {
    if (activeSideMenu === 'Orders') return renderOrders();
    if (activeSideMenu === 'Payment') return renderPayments();
    if (activeSideMenu === 'Customer') return renderCustomer();
    if (activeSideMenu === 'Products') return renderProducts();
    if (activeSideMenu === 'Category') return renderCategory();
    if (activeSideMenu === 'Floor Plan') return renderFloorPlan();
    return renderDashboard();
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      <div className="mx-auto max-w-[1600px] p-3">
        <div className="odoo-panel p-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-square btn-sm" onClick={() => navigate('/pos')} title="Back to POS terminal"><ArrowLeft size={16} /></button>
            <h1 className="hand text-4xl">Cafe Control</h1>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchAll} title="Refresh all admin data"><RefreshCw size={14} /> Reload</button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <aside className="odoo-panel p-3 xl:col-span-2">
            <h2 className="hand text-3xl mb-3">Menu</h2>
            <div className="flex flex-col gap-2">
              {topMenus.map((menu) => (
                <button key={menu} onClick={() => setActiveTopMenu(menu)} className={`btn btn-sm justify-start ${activeTopMenu === menu ? 'btn-primary' : 'btn-ghost'}`} title={`Open ${menu} section`}>
                  {menu}
                </button>
              ))}
            </div>
            <div className="divider my-3" />
            <div className="flex flex-col gap-2">
              {(sideMenus[activeTopMenu] || []).map((menu) => (
                <button
                  key={menu}
                  onClick={() => {
                    setActiveSideMenu(menu);
                    if (menu === 'Dashboard') navigate('/dashboard');
                  }}
                  className={`btn btn-sm justify-start ${activeSideMenu === menu ? 'btn-secondary' : 'btn-ghost'}`}
                  title={`View ${menu} details`}
                >
                  {menu}
                </button>
              ))}
            </div>
            <div className="divider my-3" />
            <button className="btn btn-outline btn-sm w-full" onClick={() => navigate('/dashboard')} title="Open full interactive reporting dashboard">
              <Settings size={14} /> Full Dashboard
            </button>
          </aside>

          <main className="xl:col-span-10">{renderMain()}</main>
        </div>
      </div>
    </div>
  );
}
