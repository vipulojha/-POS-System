import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, RefreshCw, Settings, Copy, Search, Pencil, ClipboardList, UtensilsCrossed, CalendarClock } from 'lucide-react';
import { API_BASE_URL } from '../config';

const topMenus = ['Operations', 'Catalog'];
const sideMenus = {
  Operations: ['Orders', 'Kitchen', 'Reservations', 'Customers'],
  Catalog: ['Inventory', 'Category', 'Floor Plan'],
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
const getCurrentTimeValue = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const seedNamePool = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Kabir', 'Ananya', 'Diya', 'Ira', 'Aanya', 'Myra', 'Sara', 'Riya', 'Meera', 'Siya', 'Aditi'];
const seedCityPool = ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Hyderabad', 'Jaipur'];

function buildDemoCustomers(count, orders) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.order?.created_at || 0) - new Date(a.order?.created_at || 0));
  const customers = [];
  for (let i = 1; i <= count; i++) {
    const first = seedNamePool[i % seedNamePool.length];
    const last = `User${String(i).padStart(3, '0')}`;
    const id = 10000 + i;
    const email = `testuser${String(i).padStart(3, '0')}@example.com`;
    const city = seedCityPool[i % seedCityPool.length];
    const orderSliceStart = (i * 2) % Math.max(sortedOrders.length || 1, 1);
    const orderHistory = sortedOrders.slice(orderSliceStart, orderSliceStart + 3).map((x) => ({
      orderId: x.order?.id,
      total: Number(x.order?.total || 0),
      status: x.order?.status || 'pending',
      date: x.order?.created_at ? new Date(x.order.created_at).toLocaleString() : '-',
      itemCount: (x.items || []).length,
    }));
    const totalSales = orderHistory.reduce((sum, o) => sum + o.total, 0);
    customers.push({
      id,
      name: `${first} ${last}`,
      email,
      phone: `+91 98${String(10000000 + i).slice(0, 8)}`,
      city,
      state: 'Gujarat',
      country: 'India',
      totalSales,
      orderHistory,
    });
  }
  return customers;
}

export default function Admin() {
  const navigate = useNavigate();
  const [activeTopMenu, setActiveTopMenu] = useState('Operations');
  const [activeSideMenu, setActiveSideMenu] = useState('Orders');
  const [overviewDetail, setOverviewDetail] = useState('orders');
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ total_orders: 0, total_revenue: 0 });
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState('4');
  const [editingProductId, setEditingProductId] = useState(null);
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
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => {
    try {
      const raw = localStorage.getItem('admin_customers');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.[0]?.id || null;
    } catch {
      return null;
    }
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
  const [selectedTables, setSelectedTables] = useState([]);
  const [hiddenTableIds, setHiddenTableIds] = useState([]);
  const [reservations, setReservations] = useState(() => {
    const raw = localStorage.getItem('admin_reservations');
    return raw ? JSON.parse(raw) : [];
  });
  const [reservationForm, setReservationForm] = useState({
    tableId: '',
    guest: '',
    time: getCurrentTimeValue(),
  });

  useEffect(() => {
    localStorage.setItem('admin_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('admin_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('admin_reservations', JSON.stringify(reservations));
  }, [reservations]);

  async function fetchAll() {
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
      const safeOrders = ordersData?.data || [];
      setOrders(safeOrders);
      setSummary({
        total_orders: Number(summaryData?.total_orders || 0),
        total_revenue: Number(summaryData?.total_revenue || 0),
      });

      const seededFlag = localStorage.getItem('admin_customers_seeded_v1');
      if (seededFlag !== 'yes' && safeOrders.length) {
        if (customers.length < 250) {
          const seeded = buildDemoCustomers(250, safeOrders);
          setCustomers(seeded);
          setSelectedCustomerId(seeded[0]?.id || null);
        }
        localStorage.setItem('admin_customers_seeded_v1', 'yes');
      }
    } catch (error) {
      console.error('Admin fetchAll failed:', error);
    }
  }

  useEffect(() => {
    const initId = setTimeout(fetchAll, 0);
    return () => clearTimeout(initId);
  }, []);

  const resetProductForm = () => {
    setEditingProductId(null);
    setNewProductName('');
    setNewProductPrice('');
    setProductCategory('Quick Bites');
    setProductTax('5');
    setProductUom('Unit');
    setProductDesc('');
  };

  const createProduct = async (e) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) return;
    try {
      const method = editingProductId ? 'PATCH' : 'POST';
      const url = editingProductId ? `${API_BASE_URL}/products/${editingProductId}` : `${API_BASE_URL}/products`;
      let res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProductName, price: Number(newProductPrice) }),
      });
      if (!res.ok && editingProductId) {
        res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newProductName, price: Number(newProductPrice) }),
        });
      }
      if (!res.ok) return;
      resetProductForm();
      fetchAll();
    } catch (error) {
      console.error('Create/update product failed:', error);
    }
  };

  const editProduct = (product, idx) => {
    setEditingProductId(product.id);
    setNewProductName(product.name || '');
    setNewProductPrice(String(product.price ?? ''));
    setProductTax(['5', '12', '18'][idx % 3]);
    setProductUom(['Unit', 'KG', 'Pack'][idx % 3]);
    const cat = categories[idx % Math.max(categories.length, 1)] || { name: 'Quick Bites' };
    setProductCategory(cat.name);
    setProductDesc('');
    setProductTab('General Info');
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (error) {
      console.error('Delete product failed:', error);
    }
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
    } catch (error) {
      console.error('Create table failed:', error);
    }
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
    const newId = Date.now();
    setCustomers((prev) => [
      ...prev,
      { id: newId, ...customerForm, totalSales: 0, orderHistory: [] },
    ]);
    if (!selectedCustomerId) setSelectedCustomerId(newId);
    setCustomerForm({ name: '', email: '', phone: '', city: '', state: '', country: 'India' });
  };

  const loadDemoCustomers = () => {
    const seeded = buildDemoCustomers(250, orders);
    setCustomers(seeded);
    setSelectedCustomerId(seeded[0]?.id || null);
  };

  const visibleTables = useMemo(() => {
    return tables.filter((t) => !hiddenTableIds.includes(t.id));
  }, [tables, hiddenTableIds]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => {
      if (!q) return true;
      return String(c.name).toLowerCase().includes(q) || String(c.email).toLowerCase().includes(q) || String(c.phone).toLowerCase().includes(q);
    });
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(
    () => filteredCustomers.find((c) => Number(c.id) === Number(selectedCustomerId)) || customers.find((c) => Number(c.id) === Number(selectedCustomerId)) || null,
    [filteredCustomers, customers, selectedCustomerId]
  );

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

  const renderOrders = () => {
    const pendingKitchenRows = orders.filter((o) => ['pending', 'paid'].includes(String(o.order?.status || '').toLowerCase()));
    const pendingKitchen = pendingKitchenRows.length;
    const activeReservations = reservations.length;
    const ordersDetailRows = [...orders]
      .sort((a, b) => new Date(b.order?.created_at || 0) - new Date(a.order?.created_at || 0))
      .slice(0, 20);
    const revenueByItem = (() => {
      const agg = {};
      orders.forEach((entry) => {
        (entry.items || []).forEach((item) => {
          const p = products.find((x) => Number(x.id) === Number(item.product_id));
          const key = String(item.product_id);
          if (!agg[key]) {
            agg[key] = { id: key, name: p?.name || `Product ${item.product_id}`, qty: 0, revenue: 0 };
          }
          agg[key].qty += Number(item.quantity || 0);
          agg[key].revenue += Number(item.quantity || 0) * Number(item.price || 0);
        });
      });
      return Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
    })();

    return (
      <div className="space-y-3">
        <div className="odoo-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="hand text-4xl">Operations Overview</h2>
            <button className="btn btn-sm btn-ghost" onClick={fetchAll}><RefreshCw size={14} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <button className="odoo-card p-3 text-left" onClick={() => setOverviewDetail('orders')}>
              <div className="text-xs text-slate-400">Total Orders</div>
              <div className="text-3xl font-semibold mt-1">{summary.total_orders}</div>
            </button>
            <button className="odoo-card p-3 text-left" onClick={() => setOverviewDetail('revenue')}>
              <div className="text-xs text-slate-400">Revenue</div>
              <div className="text-3xl font-semibold mt-1">{inr(summary.total_revenue)}</div>
            </button>
            <button className="odoo-card p-3 text-left" onClick={() => setOverviewDetail('kitchen')}>
              <div className="text-xs text-slate-400">Awaiting Kitchen</div>
              <div className="text-3xl font-semibold mt-1">{pendingKitchen}</div>
            </button>
            <button className="odoo-card p-3 text-left" onClick={() => setOverviewDetail('reservations')}>
              <div className="text-xs text-slate-400">Active Reservations</div>
              <div className="text-3xl font-semibold mt-1">{activeReservations}</div>
            </button>
          </div>
        </div>

        <div className="odoo-panel p-4">
          <h3 className="hand text-3xl mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button className="btn btn-primary justify-start h-12" onClick={() => navigate('/orders-center')}>
              <ClipboardList size={16} /> Orders Workspace
            </button>
            <button className="btn btn-outline justify-start h-12" onClick={() => { setActiveTopMenu('Operations'); setActiveSideMenu('Kitchen'); }}>
              <UtensilsCrossed size={16} /> Kitchen Monitor
            </button>
          </div>
          <div className="mt-3 text-sm text-slate-400 flex items-center gap-2">
            <CalendarClock size={14} />
            Start here for daily operations, then switch to Catalog from the left menu.
          </div>
        </div>

        <div className="odoo-panel p-4">
          <h3 className="hand text-3xl mb-3">
            {overviewDetail === 'orders' && 'Order Details'}
            {overviewDetail === 'revenue' && 'Revenue By Item'}
            {overviewDetail === 'kitchen' && 'Awaiting Kitchen Details'}
            {overviewDetail === 'reservations' && 'Reservation Details'}
          </h3>

          {overviewDetail === 'orders' && (
            <div className="overflow-x-auto max-h-[320px] scroll-thin">
              <table className="table table-sm">
                <thead><tr className="text-slate-300"><th>Order</th><th>Table</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
                <tbody>
                  {ordersDetailRows.map((x) => (
                    <tr key={x.order.id}>
                      <td>#{x.order.id}</td>
                      <td>{x.order.table_id || '-'}</td>
                      <td>{x.order.status}</td>
                      <td>{inr(x.order.total)}</td>
                      <td>{x.order.created_at ? new Date(x.order.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {overviewDetail === 'revenue' && (
            <div className="overflow-x-auto max-h-[320px] scroll-thin">
              <table className="table table-sm">
                <thead><tr className="text-slate-300"><th>Item</th><th>Qty</th><th>Revenue</th></tr></thead>
                <tbody>
                  {revenueByItem.map((row) => (
                    <tr key={row.id}><td>{row.name}</td><td>{row.qty}</td><td>{inr(row.revenue)}</td></tr>
                  ))}
                  {!revenueByItem.length && <tr><td colSpan="3" className="text-center text-slate-500">No revenue data</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {overviewDetail === 'kitchen' && (
            <div className="overflow-x-auto max-h-[320px] scroll-thin">
              <table className="table table-sm">
                <thead><tr className="text-slate-300"><th>Order</th><th>Table</th><th>Status</th><th>Items</th><th>Total</th></tr></thead>
                <tbody>
                  {pendingKitchenRows.map((x) => (
                    <tr key={x.order.id}>
                      <td>#{x.order.id}</td>
                      <td>{x.order.table_id || '-'}</td>
                      <td>{x.order.status}</td>
                      <td>{(x.items || []).length}</td>
                      <td>{inr(x.order.total)}</td>
                    </tr>
                  ))}
                  {!pendingKitchenRows.length && <tr><td colSpan="5" className="text-center text-slate-500">No orders awaiting kitchen</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {overviewDetail === 'reservations' && (
            <div className="overflow-x-auto max-h-[320px] scroll-thin">
              <table className="table table-sm">
                <thead><tr className="text-slate-300"><th>Table</th><th>Guest</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id}><td>{r.tableName}</td><td>{r.guest}</td><td>{r.time}</td><td>{r.status}</td></tr>
                  ))}
                  {!reservations.length && <tr><td colSpan="4" className="text-center text-slate-500">No active reservations</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCustomers = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="odoo-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="hand text-4xl">Customer List</h2>
          <label className="input input-sm odoo-input flex items-center gap-2 w-60">
            <Search size={14} />
            <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search customer..." />
          </label>
        </div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-slate-400">Customers: {filteredCustomers.length}</div>
          <button className="btn btn-xs btn-outline" onClick={loadDemoCustomers}>Load 250 Test Users</button>
        </div>
        <div className="overflow-x-auto max-h-[360px] scroll-thin">
          <table className="table table-sm">
            <thead>
              <tr className="text-slate-300">
                <th>Name</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id} className={`cursor-pointer ${Number(selectedCustomerId) === Number(c.id) ? 'bg-slate-800/50' : ''}`} onClick={() => setSelectedCustomerId(c.id)}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{(c.orderHistory || []).length}</td>
                  <td>{inr(c.totalSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="odoo-panel p-4 space-y-3">
        <div>
          <h2 className="hand text-4xl mb-1">Customer Details</h2>
          {!selectedCustomer && <div className="text-sm text-slate-500">Select a customer to view order history.</div>}
          {selectedCustomer && (
            <div className="text-sm text-slate-300">
              <div>{selectedCustomer.name}</div>
              <div className="text-slate-400">{selectedCustomer.email} | {selectedCustomer.phone}</div>
            </div>
          )}
        </div>
        <div className="odoo-card p-3 max-h-[210px] overflow-auto scroll-thin">
          <div className="text-sm font-semibold mb-2">Order History</div>
          {selectedCustomer?.orderHistory?.length ? selectedCustomer.orderHistory.map((o) => (
            <div key={`${selectedCustomer.id}-${o.orderId}-${o.date}`} className="text-xs border-b border-slate-700 py-1">
              <div className="flex justify-between">
                <span>Order #{o.orderId}</span>
                <span>{inr(o.total)}</span>
              </div>
              <div className="text-slate-400">{o.date} | {o.status} | items: {o.itemCount}</div>
            </div>
          )) : <div className="text-xs text-slate-500">No orders recorded.</div>}
        </div>
        <form className="space-y-2 border-t border-slate-700 pt-3" onSubmit={addCustomer}>
          <div className="text-sm font-semibold">Add Single Customer</div>
          <input className="odoo-input w-full h-10 rounded px-3" placeholder="Name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
          <input className="odoo-input w-full h-10 rounded px-3" placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
          <input className="odoo-input w-full h-10 rounded px-3" placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="odoo-input w-full h-10 rounded px-3" placeholder="City" value={customerForm.city} onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })} />
            <input className="odoo-input w-full h-10 rounded px-3" placeholder="State" value={customerForm.state} onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })} />
          </div>
          <button className="btn btn-odoo border-none mt-2"><Plus size={14} /> Save Customer</button>
        </form>
      </div>
    </div>
  );

  const renderKitchen = () => {
    const statusGroups = ['pending', 'preparing', 'completed', 'paid'];
    return (
      <div className="odoo-panel p-4">
        <h2 className="hand text-4xl mb-3">Kitchen & Order Monitor</h2>
        <div className="flex gap-2 flex-wrap mb-3">
          {statusGroups.map((s) => (
            <span key={s} className="badge badge-neutral">
              {s}: {orders.filter((o) => o.order?.status === s).length}
            </span>
          ))}
        </div>
        <div className="overflow-x-auto max-h-[420px] scroll-thin">
          <table className="table table-sm">
            <thead>
              <tr className="text-slate-300">
                <th>Order</th>
                <th>Table</th>
                <th>Status</th>
                <th>Total</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 40).map((x) => (
                <tr key={x.order.id}>
                  <td>#{x.order.id}</td>
                  <td>{x.order.table_id || '-'}</td>
                  <td>{x.order.status}</td>
                  <td>{inr(x.order.total)}</td>
                  <td>{paymentLabel(x.order.payment_method)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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

        <div className="mt-3 flex gap-2">
          <button className="btn btn-odoo border-none">
            <Plus size={14} /> {editingProductId ? 'Update Product' : 'Save Product'}
          </button>
          {editingProductId && (
            <button type="button" className="btn btn-outline" onClick={resetProductForm}>
              Cancel Edit
            </button>
          )}
        </div>
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
                      <button className="btn btn-xs btn-outline mr-1" onClick={() => editProduct(p, idx)}><Pencil size={12} /></button>
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
          <div className="odoo-card h-10 rounded px-3 flex items-center text-sm text-slate-400">Floor layout is shared across all sessions</div>
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

  const renderReservations = () => {
    const reserve = (e) => {
      e.preventDefault();
      if (!reservationForm.tableId || !reservationForm.guest) return;
      const tableId = Number(reservationForm.tableId);
      const table = tables.find((t) => Number(t.id) === tableId);
      if (!table) return;
      setReservations((prev) => [
        ...prev.filter((r) => Number(r.tableId) !== tableId),
        {
          id: Date.now(),
          tableId,
          tableName: formatTableName(table, tables.findIndex((x) => x.id === table.id)),
          guest: reservationForm.guest,
          time: reservationForm.time || getCurrentTimeValue(),
          status: 'reserved',
        },
      ]);
      setReservationForm({ tableId: '', guest: '', time: getCurrentTimeValue() });
    };

    const release = (tableId) => {
      setReservations((prev) => prev.filter((r) => Number(r.tableId) !== Number(tableId)));
    };

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <form className="odoo-panel p-4" onSubmit={reserve}>
          <h2 className="hand text-4xl mb-3">Reserve Table</h2>
          <div className="space-y-2">
            <select
              className="odoo-input w-full h-10 rounded px-3"
              value={reservationForm.tableId}
              onChange={(e) => setReservationForm((p) => ({ ...p, tableId: e.target.value }))}
            >
              <option value="">Select table</option>
              {tables.map((t, idx) => (
                <option key={t.id} value={t.id}>{formatTableName(t, idx)}</option>
              ))}
            </select>
            <input
              className="odoo-input w-full h-10 rounded px-3"
              placeholder="Guest name"
              value={reservationForm.guest}
              onChange={(e) => setReservationForm((p) => ({ ...p, guest: e.target.value }))}
            />
            <input
              className="odoo-input w-full h-10 rounded px-3"
              type="time"
              value={reservationForm.time}
              onChange={(e) => setReservationForm((p) => ({ ...p, time: e.target.value }))}
            />
            <button className="btn btn-secondary w-full">Reserve</button>
          </div>
        </form>
        <div className="odoo-panel p-4">
          <h2 className="hand text-4xl mb-3">Active Reservations</h2>
          <div className="space-y-2 max-h-[360px] overflow-auto scroll-thin">
            {reservations.map((r) => (
              <div key={r.id} className="odoo-card p-2 flex items-center justify-between">
                <div className="text-sm">
                  <div>{r.tableName} - {r.guest}</div>
                  <div className="text-xs text-slate-400">{r.time}</div>
                </div>
                <button className="btn btn-xs btn-outline btn-error" onClick={() => release(r.tableId)}>Release</button>
              </div>
            ))}
            {!reservations.length && <p className="text-slate-500">No reservations</p>}
          </div>
        </div>
      </div>
    );
  };

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
    if (activeSideMenu === 'Kitchen') return renderKitchen();
    if (activeSideMenu === 'Reservations') return renderReservations();
    if (activeSideMenu === 'Customers') return renderCustomers();
    if (activeSideMenu === 'Inventory') return renderProducts();
    if (activeSideMenu === 'Category') return renderCategory();
    if (activeSideMenu === 'Floor Plan') return renderFloorPlan();
    return renderDashboard();
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      <div className="mx-auto max-w-[1600px] p-3">
        <div className="odoo-panel p-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-square btn-sm"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/login'))}
              title="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="hand text-4xl">Cafe Control</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={fetchAll} title="Refresh all admin data"><RefreshCw size={14} /> Reload</button>
            <button
              className="btn btn-sm btn-error"
              onClick={() => {
                localStorage.removeItem('user');
                navigate('/login');
              }}
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <aside className="odoo-panel p-3 xl:col-span-2">
            <h2 className="hand text-3xl mb-3">Menu</h2>
            <div className="flex flex-col gap-2">
              {topMenus.map((menu) => (
                <button
                  key={menu}
                  onClick={() => {
                    setActiveTopMenu(menu);
                    setActiveSideMenu(sideMenus[menu][0]);
                  }}
                  className={`btn btn-sm justify-start ${activeTopMenu === menu ? 'btn-primary' : 'btn-ghost'}`}
                  title={`Open ${menu} section`}
                >
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
            <button className="btn btn-outline btn-sm w-full" onClick={() => navigate('/dashboard')} title="Open interactive reporting dashboard">
              <Settings size={14} /> Dashboard
            </button>
          </aside>

          <main className="xl:col-span-10">{renderMain()}</main>
        </div>
      </div>
    </div>
  );
}
