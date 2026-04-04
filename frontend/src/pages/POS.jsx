import { useMemo, useState, useEffect } from 'react';
import { LogOut, Menu, Search, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const sampleCatalog = [
  { name: 'Espresso', price: 90, category: 'Drinks' },
  { name: 'Cappuccino', price: 140, category: 'Drinks' },
  { name: 'Latte', price: 150, category: 'Drinks' },
  { name: 'Iced Tea', price: 80, category: 'Drinks' },
  { name: 'Lemon Soda', price: 70, category: 'Drinks' },
  { name: 'Garlic Bread', price: 110, category: 'Quick Bites' },
  { name: 'Paneer Wrap', price: 180, category: 'Quick Bites' },
  { name: 'Veg Sandwich', price: 130, category: 'Quick Bites' },
  { name: 'Chicken Roll', price: 210, category: 'Quick Bites' },
  { name: 'Brownie', price: 120, category: 'Dessert' },
  { name: 'Cheesecake', price: 190, category: 'Dessert' },
  { name: 'Ice Cream', price: 100, category: 'Dessert' },
];

function getCategory(name = '', explicitCategory = '') {
  if (explicitCategory) return explicitCategory;
  const n = name.toLowerCase();
  if (n.includes('tea') || n.includes('coffee') || n.includes('coke') || n.includes('drink') || n.includes('latte') || n.includes('soda')) return 'Drinks';
  if (n.includes('cake') || n.includes('dessert') || n.includes('ice')) return 'Dessert';
  return 'Quick Bites';
}

function formatTableName(table, idx) {
  const raw = (table?.name || '').trim();
  const m = raw.match(/\d+/);
  if (m) return `Table ${m[0]}`;
  return `Table ${idx + 1}`;
}

function inr(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export default function POS() {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [orderItems, setOrderItems] = useState([]);
  const [sessionStatus, setSessionStatus] = useState('CLOSED');
  const [currentSession, setCurrentSession] = useState(null);
  const [activeTopTab, setActiveTopTab] = useState('Orders');
  const [activePosTab, setActivePosTab] = useState('Table');
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [clickedProductId, setClickedProductId] = useState(null);
  const [notice, setNotice] = useState('');
  const [tableOrders, setTableOrders] = useState([]);
  const [hasSeededVarieties, setHasSeededVarieties] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!user.id) {
      navigate('/login');
      return;
    }
    initLoad();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadCurrentOrder(selectedTable);
      loadOrdersForTable(selectedTable);
    }
  }, [selectedTable]);

  useEffect(() => {
    const tableObj = tables.find((t) => t.id === selectedTable);
    const tableName = selectedTable ? formatTableName(tableObj, tables.findIndex((t) => t.id === selectedTable)) : 'Table';
    const payload = {
      items: orderItems,
      paymentMethod,
      total: Number(calculateTotal()),
      table: tableName,
    };
    localStorage.setItem('customer_display_live', JSON.stringify(payload));
    if (paymentMethod === 'UPI' && orderItems.length) {
      localStorage.setItem('customer_display_mode', 'upi');
    } else {
      localStorage.setItem('customer_display_mode', 'summary');
    }
  }, [orderItems, paymentMethod, selectedTable, tables]);

  const seedProductVarieties = async (existingProducts) => {
    const existingNames = new Set(existingProducts.map((p) => String(p.name || '').toLowerCase()));
    const missing = sampleCatalog.filter((p) => !existingNames.has(p.name.toLowerCase()));
    if (!missing.length) return;

    for (const item of missing) {
      try {
        await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: item.name, price: item.price }),
        });
      } catch {}
    }
  };

  const initLoad = async () => {
    await checkSession();
    await fetchData();
  };

  const fetchData = async () => {
    try {
      const [tablesRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tables`),
        fetch(`${API_BASE_URL}/products`),
      ]);

      const tablesData = await tablesRes.json();
      let productsData = await productsRes.json();

      if (!hasSeededVarieties && Array.isArray(productsData)) {
        await seedProductVarieties(productsData);
        setHasSeededVarieties(true);
        const refetch = await fetch(`${API_BASE_URL}/products`);
        productsData = await refetch.json();
      }

      const safeTables = Array.isArray(tablesData) ? tablesData : [];
      const safeProducts = Array.isArray(productsData) ? productsData : [];

      setTables(safeTables);
      setProducts(safeProducts);

      if (!selectedTable && safeTables[0]) {
        setSelectedTable(safeTables[0].id);
      }
    } catch {
      setNotice('Failed to load data');
    }
  };

  const checkSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/session/current`);
      const data = await res.json();
      if (res.ok && data.success && data.session) {
        setCurrentSession(data.session);
        setSessionStatus('OPEN');
      } else {
        setCurrentSession(null);
        setSessionStatus('CLOSED');
      }
    } catch {
      setCurrentSession(null);
      setSessionStatus('CLOSED');
    }
  };

  const handleOpenSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/session/open`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setCurrentSession(data.session);
        setSessionStatus('OPEN');
        setNotice(`Session #${data.session.id} opened`);
        return true;
      }
      setNotice(data.error || 'Failed to open session');
      return false;
    } catch {
      setNotice('Failed to open session');
      return false;
    }
  };

  const loadCurrentOrder = async (tableId) => {
    setOrderItems([]);
    try {
      const res = await fetch(`${API_BASE_URL}/tables/${tableId}/current-order`);
      const data = await res.json();
      if (data && data.items) {
        const mapped = data.items.map((item) => {
          const product = products.find((p) => Number(p.id) === Number(item.product_id));
          return {
            id: Number(item.product_id),
            name: product ? product.name : `Item ${item.product_id}`,
            price: Number(item.price),
            quantity: Number(item.quantity),
          };
        });
        setOrderItems(mapped);
      }
    } catch {}
  };

  const loadOrdersForTable = async (tableId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      const data = await res.json();
      const all = data?.data || [];
      const filtered = all.filter((x) => Number(x.order?.table_id) === Number(tableId)).slice(0, 8);
      setTableOrders(filtered);
      if (filtered[0]) setSelectedOrderDetail(filtered[0]);
    } catch {
      setTableOrders([]);
      setSelectedOrderDetail(null);
    }
  };

  const handleTableClick = async (tableId) => {
    setSelectedTable(tableId);
    setPaymentMethod('Cash');
    setNotice('');
    setSelectedOrderDetail(null);
  };

  const handleProductClick = (product) => {
    setClickedProductId(product.id);
    setTimeout(() => setClickedProductId(null), 220);
    setOrderItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { id: product.id, name: product.name, price: Number(product.price), quantity: 1 }];
    });
  };

  const increaseQty = (id) => setOrderItems((prev) => prev.map((x) => (x.id === id ? { ...x, quantity: x.quantity + 1 } : x)));
  const decreaseQty = (id) =>
    setOrderItems((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))
        .filter((x) => x.quantity > 0)
    );
  const removeItem = (id) => setOrderItems((prev) => prev.filter((x) => x.id !== id));

  const calculateTotal = () => orderItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0).toFixed(2);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const categoryOk = activeCategory === 'All' || getCategory(p.name, p.category) === activeCategory;
      const searchOk = String(p.name || '').toLowerCase().includes(search.toLowerCase());
      return categoryOk && searchOk;
    });
  }, [products, activeCategory, search]);

  const handlePay = async () => {
    if (!orderItems.length) return setNotice('Add items first');
    if (!selectedTable) return setNotice('Select a table first');
    if (!paymentMethod) return setNotice('Select payment method');
    if (isPaying) return;

    let openOk = true;
    if (sessionStatus !== 'OPEN') {
      openOk = await handleOpenSession();
    }
    if (!openOk) return;

    setIsPaying(true);
    try {
      const currentTotal = calculateTotal();
      const createRes = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable,
          items: orderItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createData?.data?.order?.id) {
        setIsPaying(false);
        return setNotice(createData.error || `Order create failed (HTTP ${createRes.status})`);
      }

      const orderId = createData.data.order.id;
      const payRes = await fetch(`${API_BASE_URL}/orders/${orderId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentMethod.toLowerCase() }),
      });
      const payData = await payRes.json().catch(() => ({}));

      if (!payRes.ok || !payData.success) {
        setIsPaying(false);
        return setNotice(payData.error || `Pay failed (HTTP ${payRes.status})`);
      }

      setNotice(`Paid ${inr(currentTotal)} via ${paymentMethod}`);
      setPaymentModal({
        amount: currentTotal,
        orderId,
        method: paymentMethod,
      });
      localStorage.setItem('customer_display_mode', 'thankyou');
      setTimeout(() => {
        localStorage.setItem('customer_display_mode', 'summary');
      }, 6000);
      setOrderItems([]);
      setPaymentMethod('Cash');
      await loadCurrentOrder(selectedTable);
      await loadOrdersForTable(selectedTable);
      await checkSession();
    } catch {
      setNotice('Payment failed due to network/server issue');
    } finally {
      setIsPaying(false);
    }
  };

  const categories = ['All', 'Quick Bites', 'Drinks', 'Dessert'];

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      <div className="mx-auto max-w-[1500px] p-3">
        <div className="odoo-panel p-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-5 text-slate-300">
            <button
              className={`hover:text-white ${activeTopTab === 'Orders' ? 'text-white' : ''}`}
              onClick={() => {
                setActiveTopTab('Orders');
                navigate('/orders-center');
              }}
              title="Open dedicated orders workspace"
            >
              Orders
            </button>
            <button
              className="hover:text-white"
              onClick={() => {
                setActiveTopTab('Products');
                navigate('/admin');
              }}
              title="Open product and table management"
            >
              Products
            </button>
            <button
              className="hover:text-white"
              onClick={() => {
                setActiveTopTab('Reporting');
                navigate('/dashboard');
              }}
              title="Open reporting dashboard"
            >
              Reporting
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchData} title="Reload tables, products, and order state">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="odoo-panel p-3 mb-3 flex items-center justify-between">
          <div>
            <h1 className="hand text-4xl text-slate-200">Odoo Cafe</h1>
            <p className="text-sm text-slate-400">
              Session: {currentSession?.id ? `#${currentSession.id}` : 'Session Open'} | Last open:{' '}
              {currentSession?.opened_at ? new Date(currentSession.opened_at).toLocaleString() : '--'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`status-pill ${sessionStatus === 'OPEN' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{sessionStatus}</span>
            <button className="btn btn-sm btn-secondary" disabled={sessionStatus === 'OPEN'} onClick={handleOpenSession} title="Start a new POS session for billing">
              {sessionStatus === 'OPEN' ? 'Session Opened' : 'Open Session'}
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/customer-display')} title="Open customer-facing screen">
              Customer Display
            </button>
            <button className="btn btn-ghost btn-square" onClick={() => navigate('/kitchen')} title="Open Kitchen Display board">
              <Menu size={16} />
            </button>
          </div>
        </div>

        {notice && (
          <div className="alert alert-info py-2 mb-3 text-sm" onClick={() => setNotice('')}>
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div className="odoo-panel p-3 xl:col-span-2">
            <div className="tabs tabs-boxed bg-transparent p-0 mb-3 gap-1">
              {['Table', 'Register', 'Orders'].map((tab) => (
                <button key={tab} className={`tab text-xs ${activePosTab === tab ? 'tab-active' : ''}`} onClick={() => setActivePosTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>

            {activePosTab === 'Table' && (
              <>
                <div className="text-center text-slate-400 mb-2">Floor View</div>
                <div className="grid grid-cols-2 gap-2">
                  {tables.map((table, i) => (
                    <button
                      key={table.id}
                      onClick={() => handleTableClick(table.id)}
                      className={`h-20 rounded border ${selectedTable === table.id ? 'border-sky-400 bg-sky-900/20' : 'border-slate-700 bg-slate-900/60'} text-sm`}
                    >
                      {formatTableName(table, i)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activePosTab === 'Register' && (
              <div className="odoo-card p-3 space-y-2 text-sm">
                <div>Session ID: {currentSession?.id || '-'}</div>
                <div>Status: {sessionStatus}</div>
                <div>Opened: {currentSession?.opened_at ? new Date(currentSession.opened_at).toLocaleString() : '-'}</div>
                <button className="btn btn-sm btn-outline w-full mt-2" onClick={handleOpenSession} disabled={sessionStatus === 'OPEN'}>
                  Open Session
                </button>
              </div>
            )}

            {activePosTab === 'Orders' && (
              <div className="space-y-2">
                <div className="space-y-2 max-h-[220px] overflow-auto scroll-thin">
                  {tableOrders.map((entry) => (
                    <button
                      key={entry.order.id}
                      className={`odoo-card p-2 text-xs w-full text-left ${selectedOrderDetail?.order?.id === entry.order.id ? 'border-sky-400' : ''}`}
                      onClick={() => setSelectedOrderDetail(entry)}
                    >
                      <div className="flex justify-between">
                        <span>#{entry.order.id}</span>
                        <span>{inr(entry.order.total)}</span>
                      </div>
                      <div className="text-slate-400">{entry.order.status}</div>
                    </button>
                  ))}
                  {!tableOrders.length && <p className="text-slate-500 text-sm">No orders for selected table</p>}
                </div>
                {selectedOrderDetail && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Order #{selectedOrderDetail.order.id} Items</span>
                  </div>
                )}
                {selectedOrderDetail && (
                  <div className="max-h-[130px] overflow-auto scroll-thin border border-slate-700 rounded p-2">
                    {(selectedOrderDetail.items || []).map((it, idx) => {
                      const p = products.find((x) => Number(x.id) === Number(it.product_id));
                      return (
                        <div key={idx} className="text-xs flex justify-between border-b border-slate-800 py-1">
                          <span>{it.quantity} x {p?.name || `Product ${it.product_id}`}</span>
                          <span>{inr(Number(it.quantity) * Number(it.price))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="odoo-panel p-3 xl:col-span-7">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex gap-2">
                {categories.map((cat) => (
                  <button key={cat} className={`btn btn-xs ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveCategory(cat)}>
                    {cat}
                  </button>
                ))}
              </div>
              <label className="input input-bordered input-sm flex items-center gap-2 w-64 odoo-input">
                <Search size={14} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product..." />
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 scroll-thin max-h-[460px] overflow-auto">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className={`odoo-card p-2 text-left hover:border-sky-400 transition-transform cursor-pointer ${clickedProductId === prod.id ? 'scale-95 ring-2 ring-sky-400' : 'scale-100'}`}
                  onClick={() => handleProductClick(prod)}
                >
                  <div className="h-20 bg-[#1d2632] rounded mb-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate">{prod.name}</span>
                    <span className="text-xs text-amber-300">{inr(prod.price)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{getCategory(prod.name, prod.category)}</div>
                  <div className="mt-2">
                    <button
                      className="btn btn-xs btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductDetail(prod);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="odoo-panel p-3 xl:col-span-3">
            <h2 className="hand text-4xl mb-2">Payment</h2>
            <div className="bg-[#fff0f1] border border-[#ef8f9a] text-[#a43244] text-3xl px-3 py-2 rounded mb-2">{inr(calculateTotal())}</div>

            <div className="space-y-2 mb-3 max-h-40 overflow-auto scroll-thin">
              {orderItems.map((item) => (
                <div key={item.id} className="text-sm border-b border-slate-700 pb-1">
                  <div className="flex justify-between">
                    <span>{item.name}</span>
                    <span>{inr(Number(item.price) * item.quantity)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button className="btn btn-xs btn-outline" onClick={() => decreaseQty(item.id)}>-</button>
                    <span>{item.quantity}</span>
                    <button className="btn btn-xs btn-outline" onClick={() => increaseQty(item.id)}>+</button>
                    <button className="btn btn-xs btn-error btn-outline ml-auto" onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                </div>
              ))}
              {!orderItems.length && <p className="text-slate-500 text-sm">No items</p>}
            </div>

            <div className="grid grid-cols-1 gap-2 mb-3">
              {['Cash', 'Card', 'UPI'].map((m) => (
                <button key={m} className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPaymentMethod(m)}>
                  {m}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400 mb-2">Payment: {paymentMethod || 'Not selected'}</div>

            {paymentMethod === 'UPI' && (
              <div className="odoo-card p-2 mb-3 text-center">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=upi://pay?pa=demo@upi&pn=OdooCafe&am=10" className="mx-auto rounded bg-white p-1" />
                <p className="text-xs mt-1 text-slate-300">UPI QR</p>
              </div>
            )}

            <button
              className="w-full h-11 rounded-md bg-[#7b3036] hover:bg-[#923b43] border border-[#a84b53] text-white font-semibold disabled:opacity-50"
              disabled={!orderItems.length || isPaying}
              onClick={handlePay}
              title="Create order and mark it paid"
            >
              {isPaying ? 'Processing...' : 'Pay'}
            </button>

            <div className="mt-2 text-xs text-slate-400">
              {selectedTable ? `${formatTableName(tables.find((t) => t.id === selectedTable), tables.findIndex((t) => t.id === selectedTable))}` : 'No table selected'} | {user.username || 'User'}
            </div>
            <button className="btn btn-ghost btn-xs mt-2" onClick={() => navigate('/login')}>
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </div>
      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="odoo-panel w-full max-w-md p-6 text-center">
            <div className="hand text-5xl mb-3 text-green-300">Payment Success</div>
            <p className="text-slate-300">Order #{paymentModal.orderId}</p>
            <p className="text-4xl font-semibold my-3">{inr(paymentModal.amount)}</p>
            <p className="text-sm text-slate-400 mb-5">Method: {paymentModal.method}</p>
            <button className="btn btn-secondary w-full" onClick={() => setPaymentModal(null)}>
              Continue
            </button>
          </div>
        </div>
      )}
      {productDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="odoo-panel w-full max-w-md p-6">
            <div className="hand text-4xl mb-3">{productDetail.name}</div>
            <div className="text-sm text-slate-300 mb-2">Category: {getCategory(productDetail.name, productDetail.category)}</div>
            <div className="text-sm text-slate-300 mb-4">Price: {inr(productDetail.price)}</div>
            <div className="text-xs text-slate-400 mb-4">Good for quick add, upsell, and order notes workflow in demo.</div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary flex-1"
                onClick={() => {
                  handleProductClick(productDetail);
                  setProductDetail(null);
                }}
              >
                Add To Cart
              </button>
              <button className="btn btn-outline flex-1" onClick={() => setProductDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

