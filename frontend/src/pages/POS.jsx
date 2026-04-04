import { useMemo, useState, useEffect } from 'react';
import { LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

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

const FOOD_IMAGE_BY_KEYWORD = {
  samosa: 'https://loremflickr.com/320/180/samosa?lock=101',
  cappuccino: 'https://loremflickr.com/320/180/cappuccino?lock=102',
  espresso: 'https://loremflickr.com/320/180/espresso?lock=103',
  latte: 'https://loremflickr.com/320/180/latte?lock=104',
  coffee: 'https://loremflickr.com/320/180/coffee?lock=105',
  coke: 'https://loremflickr.com/320/180/cold-drink?lock=106',
  'iced tea': 'https://loremflickr.com/320/180/iced-tea?lock=107',
  'lemon soda': 'https://loremflickr.com/320/180/lemon-soda?lock=108',
  burger: 'https://loremflickr.com/320/180/burger?lock=109',
  pizza: 'https://loremflickr.com/320/180/pizza?lock=110',
  fries: 'https://loremflickr.com/320/180/french-fries?lock=111',
  brownie: 'https://loremflickr.com/320/180/brownie?lock=112',
  cheesecake: 'https://loremflickr.com/320/180/cheesecake?lock=113',
  'ice cream': 'https://loremflickr.com/320/180/ice-cream?lock=114',
  'garlic bread': 'https://loremflickr.com/320/180/garlic-bread?lock=115',
  'paneer wrap': 'https://loremflickr.com/320/180/paneer-wrap?lock=116',
  'veg sandwich': 'https://loremflickr.com/320/180/sandwich?lock=117',
  'chicken roll': 'https://loremflickr.com/320/180/chicken-roll?lock=118',
};

function productImageFallback(name = 'Item') {
  const label = encodeURIComponent(String(name).slice(0, 12));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#22345a'/>
        <stop offset='100%' stop-color='#1a2740'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <circle cx='40' cy='36' r='24' fill='#2e4f88' opacity='0.45'/>
    <circle cx='290' cy='150' r='30' fill='#2f7bc4' opacity='0.25'/>
    <text x='16' y='164' font-size='18' fill='#dbeafe' font-family='Arial, sans-serif'>${decodeURIComponent(label)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function productImageData(name = 'Item') {
  const normalized = String(name || '').toLowerCase().trim();
  const matchedKey = Object.keys(FOOD_IMAGE_BY_KEYWORD).find((key) => normalized.includes(key));
  return matchedKey ? FOOD_IMAGE_BY_KEYWORD[matchedKey] : productImageFallback(name);
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
  const [activePosTab, setActivePosTab] = useState('Table');
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [clickedProductId, setClickedProductId] = useState(null);
  const [notice, setNotice] = useState('');
  const [tableOrders, setTableOrders] = useState([]);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [enabledPayments, setEnabledPayments] = useState(['Cash', 'Digital', 'UPI']);
  const [upiId, setUpiId] = useState('demo@upi');
  const [upiConfirmOpen, setUpiConfirmOpen] = useState(false);
  const [paymentOrderForUpi, setPaymentOrderForUpi] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const unlockCustomerBill = () => localStorage.setItem('customer_display_keep_last_bill', 'no');

  useEffect(() => {
    if (!user.id) {
      navigate('/login');
      return;
    }
    initLoad();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onFocus = () => loadPosConfig();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadOrdersForTable(selectedTable);
    }
  }, [selectedTable]);

  useEffect(() => {
    const keepLastBill = localStorage.getItem('customer_display_keep_last_bill') === 'yes';
    if (keepLastBill && !orderItems.length) return;
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
  }, [orderItems, paymentMethod, selectedTable, tables]); // eslint-disable-line react-hooks/exhaustive-deps

  const initLoad = async () => {
    loadPosConfig();
    await checkSession();
    await fetchData();
  };

  const loadPosConfig = () => {
    try {
      const rawPayments = localStorage.getItem('admin_enabled_payments');
      if (rawPayments) {
      const parsed = JSON.parse(rawPayments);
      const list = [
        parsed?.cash ? 'Cash' : null,
        parsed?.card ? 'Digital' : null,
        parsed?.upi ? 'UPI' : null,
      ].filter(Boolean);
      setEnabledPayments(list.length ? list : ['Cash']);
    } else {
      setEnabledPayments(['Cash', 'Digital', 'UPI']);
    }
  } catch {
      setEnabledPayments(['Cash', 'Digital', 'UPI']);
  }

    try {
      const rawUpiId = localStorage.getItem('admin_upi_id');
      if (rawUpiId?.trim()) setUpiId(rawUpiId.trim());
      else setUpiId('demo@upi');
    } catch {
      setUpiId('demo@upi');
    }
  };

  useEffect(() => {
    if (!enabledPayments.includes(paymentMethod)) {
      setPaymentMethod(enabledPayments[0] || 'Cash');
    }
  }, [enabledPayments, paymentMethod]);

  const fetchData = async () => {
    try {
      const [tablesRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tables`),
        fetch(`${API_BASE_URL}/products`),
      ]);

      const tablesData = await tablesRes.json();
      const productsData = await productsRes.json();

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

  const loadOrdersForTable = async (tableId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      const data = await res.json();
      const all = data?.data || [];
      const filtered = all.filter((x) => Number(x.order?.table_id) === Number(tableId)).slice(0, 8);
      setTableOrders(filtered);
      if (filtered[0]) {
        setSelectedOrderDetail(filtered[0]);
        localStorage.setItem('customer_display_payment_status', filtered[0].order?.status === 'paid' ? 'paid' : 'unpaid');
      }
    } catch {
      setTableOrders([]);
      setSelectedOrderDetail(null);
    }
  };

  const handleTableClick = async (tableId) => {
    setSelectedTable(tableId);
    setPaymentMethod(enabledPayments[0] || 'Cash');
    setNotice('');
    setSelectedOrderDetail(null);
    setOrderItems([]);
    unlockCustomerBill();
  };

  const handleProductClick = (product) => {
    unlockCustomerBill();
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

  const increaseQty = (id) => {
    unlockCustomerBill();
    setOrderItems((prev) => prev.map((x) => (x.id === id ? { ...x, quantity: x.quantity + 1 } : x)));
  };
  const decreaseQty = (id) => {
    unlockCustomerBill();
    setOrderItems((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))
        .filter((x) => x.quantity > 0)
    );
  };
  const removeItem = (id) => {
    unlockCustomerBill();
    setOrderItems((prev) => prev.filter((x) => x.id !== id));
  };

  const calculateTotal = () => orderItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0).toFixed(2);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const categoryOk = activeCategory === 'All' || getCategory(p.name, p.category) === activeCategory;
      const searchOk = String(p.name || '').toLowerCase().includes(search.toLowerCase());
      return categoryOk && searchOk;
    });
  }, [products, activeCategory, search]);

  const setupReady = tables.length > 0 && products.length > 0 && enabledPayments.length > 0;

  const processPayment = async (sourceOrder = null) => {
    setIsPaying(true);
    try {
      const finalizedItems = orderItems.map((x) => ({ ...x }));
      let orderId = sourceOrder?.id || null;
      let currentTotal = sourceOrder?.total || Number(calculateTotal());
      if (!orderId) {
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
        orderId = createData.data.order.id;
        currentTotal = Number(createData.data.order.total || currentTotal);
      }

      const paymentApiMethod = paymentMethod === 'Digital' ? 'card' : paymentMethod.toLowerCase();
      const payRes = await fetch(`${API_BASE_URL}/orders/${orderId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: paymentApiMethod }),
      });
      const payData = await payRes.json().catch(() => ({}));

      if (!payRes.ok || !payData.success) {
        setIsPaying(false);
        return setNotice(payData.error || `Pay failed (HTTP ${payRes.status})`);
      }

      setNotice(`Paid ${inr(currentTotal)} via ${paymentMethod}. Order #${orderId} is now in kitchen.`);
      setPaymentModal({
        amount: currentTotal,
        orderId,
        method: paymentMethod,
      });
      const tableObj = tables.find((t) => t.id === selectedTable);
      const tableName = selectedTable ? formatTableName(tableObj, tables.findIndex((t) => t.id === selectedTable)) : 'Table';
      localStorage.setItem(
        'customer_display_live',
        JSON.stringify({
          items: finalizedItems,
          paymentMethod,
          total: Number(currentTotal),
          table: tableName,
        })
      );
      localStorage.setItem('customer_display_keep_last_bill', 'yes');
      localStorage.setItem('customer_display_payment_status', 'paid');
      localStorage.setItem('customer_display_mode', 'thankyou');
      setTimeout(() => {
        localStorage.setItem('customer_display_mode', 'summary');
      }, 6000);
      setTimeout(() => {
        setPaymentModal(null);
        setActivePosTab('Table');
      }, 2200);
      setPaymentMethod(enabledPayments[0] || 'Cash');
      setOrderItems([]);
      setPaymentOrderForUpi(null);
      await loadOrdersForTable(selectedTable);
      await checkSession();
    } catch {
      setNotice('Payment failed due to network/server issue');
    } finally {
      setIsPaying(false);
    }
  };

  const handlePay = async () => {
    if (!setupReady) return setNotice('Configure products, payment methods, and tables in Admin first');
    if (!orderItems.length) return setNotice('Add items first');
    if (!selectedTable) return setNotice('Select a table first');
    if (!paymentMethod) return setNotice('Select payment method');
    if (sessionStatus !== 'OPEN') return setNotice('Open session first');
    if (isPaying) return;

    const draftOrder = {
      id: null,
      total: Number(calculateTotal()),
    };
    if (paymentMethod === 'UPI') {
      setPaymentOrderForUpi(draftOrder);
      setUpiConfirmOpen(true);
      return;
    }
    await processPayment(draftOrder);
  };

  const handleConfirmUpiPayment = async () => {
    setUpiConfirmOpen(false);
    await processPayment(paymentOrderForUpi);
  };

  const handleCloseSession = async () => {
    if (sessionStatus !== 'OPEN' || !currentSession?.id) return setNotice('No open session to close');
    try {
      const closeCalls = [
        () =>
          fetch(`${API_BASE_URL}/session/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSession.id }),
          }),
        () =>
          fetch(`${API_BASE_URL}/session/close`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSession.id }),
          }),
        () => fetch(`${API_BASE_URL}/session/${currentSession.id}/close`, { method: 'POST' }),
      ];

      let closed = false;
      for (const call of closeCalls) {
        const res = await call();
        if (res.ok) {
          closed = true;
          break;
        }
      }
      if (!closed) {
        setCurrentSession(null);
        setSessionStatus('CLOSED');
        return setNotice('Register closed');
      }
      setCurrentSession(null);
      setSessionStatus('CLOSED');
      setNotice('Register closed');
    } catch {
      setCurrentSession(null);
      setSessionStatus('CLOSED');
      setNotice('Register closed');
    }
  };

  const categories = ['All', 'Quick Bites', 'Drinks', 'Dessert'];

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      <div className="mx-auto max-w-[1500px] p-3">
        <div className="odoo-panel p-3 mb-3 flex items-center justify-between">
          <div>
            <h1 className="hand text-4xl text-slate-200">Welcome, {user.username || 'User'}</h1>
            <p className="text-sm text-slate-400">
              Odoo Cafe | Session: {currentSession?.id ? `#${currentSession.id}` : 'Session Open'} | Last open:{' '}
              {currentSession?.opened_at ? new Date(currentSession.opened_at).toLocaleString() : '--'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`status-pill ${sessionStatus === 'OPEN' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{sessionStatus}</span>
            <button className="btn btn-sm btn-secondary" disabled={sessionStatus === 'OPEN'} onClick={handleOpenSession} title="Start a new POS session for billing">
              {sessionStatus === 'OPEN' ? 'Session Opened' : 'Open Session'}
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/customer-display')} title="Open customer details">
              Customer Details
            </button>
            <button className="btn btn-sm btn-error" onClick={() => navigate('/login')} title="Logout">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        {notice && (
          <div className="alert alert-info py-2 mb-3 text-sm" onClick={() => setNotice('')}>
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div className="odoo-panel p-3 xl:col-span-3 self-start min-h-[760px]">
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
                <div className="grid grid-cols-2 gap-2 auto-rows-fr">
                  {tables.map((table, i) => (
                    <button
                      key={table.id}
                      onClick={() => handleTableClick(table.id)}
                      className={`h-44 rounded border ${selectedTable === table.id ? 'border-sky-400 bg-sky-900/20' : 'border-slate-700 bg-slate-900/60'} text-sm`}
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
                <button className="btn btn-sm btn-outline w-full" onClick={fetchData}>
                  Reload Data
                </button>
                <button className="btn btn-sm btn-outline w-full mt-2" onClick={handleOpenSession} disabled={sessionStatus === 'OPEN'}>
                  Open Session
                </button>
                <button className="btn btn-sm btn-outline w-full" onClick={handleCloseSession} disabled={sessionStatus !== 'OPEN'}>
                  Close Register
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

          <div className="odoo-panel p-3 xl:col-span-6">
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 scroll-thin max-h-[calc(100vh-270px)] overflow-y-auto pb-6 content-start">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className={`odoo-card p-2 text-left hover:border-sky-400 transition-transform cursor-pointer ${clickedProductId === prod.id ? 'scale-95 ring-2 ring-sky-400' : 'scale-100'}`}
                  onClick={() => handleProductClick(prod)}
                >
                  <img
                    src={productImageData(prod.name)}
                    alt={prod.name}
                    className="h-20 w-full object-cover rounded mb-2 border border-slate-700"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = productImageFallback(prod.name);
                    }}
                  />
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
              {enabledPayments.map((m) => (
                <button key={m} className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPaymentMethod(m)}>
                  {m}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400 mb-2">Payment: {paymentMethod || 'Not selected'}</div>
            <div className="text-xs text-slate-400 mb-2">
              Selected table: {selectedTable ? formatTableName(tables.find((t) => t.id === selectedTable), tables.findIndex((t) => t.id === selectedTable)) : 'No table selected'}
            </div>

            {paymentMethod === 'UPI' && (
              <div className="odoo-card p-2 mb-3 text-center">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=OdooCafe&am=${Number(calculateTotal()).toFixed(2)}`)}`} className="mx-auto rounded bg-white p-1" />
                <p className="text-xs mt-1 text-slate-300">UPI QR</p>
              </div>
            )}

            <button
              className="w-full h-11 rounded-md bg-[#7b3036] hover:bg-[#923b43] border border-[#a84b53] text-white font-semibold disabled:opacity-50"
              disabled={isPaying || !setupReady || !selectedTable || !orderItems.length}
              onClick={handlePay}
              title="Create and pay order, then auto-send it to kitchen"
            >
              {isPaying ? 'Processing...' : 'Complete Payment'}
            </button>

            <div className="mt-2 text-xs text-slate-400">
              {selectedTable ? `${formatTableName(tables.find((t) => t.id === selectedTable), tables.findIndex((t) => t.id === selectedTable))}` : 'No table selected'} | {user.username || 'User'}
            </div>
          </div>
        </div>
      </div>
      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => { setPaymentModal(null); setActivePosTab('Table'); }}>
          <div className="odoo-panel w-full max-w-md p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="hand text-5xl mb-3 text-green-300">Payment Success</div>
            <p className="text-slate-300">Order #{paymentModal.orderId}</p>
            <p className="text-4xl font-semibold my-3">{inr(paymentModal.amount)}</p>
            <p className="text-sm text-slate-400 mb-5">Method: {paymentModal.method}</p>
            <button className="btn btn-secondary w-full" onClick={() => { setPaymentModal(null); setActivePosTab('Table'); }}>
              Continue
            </button>
          </div>
        </div>
      )}
      {upiConfirmOpen && paymentOrderForUpi && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="odoo-panel w-full max-w-md p-6 text-center">
            <div className="hand text-5xl mb-3">UPI QR</div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=OdooCafe&am=${Number(paymentOrderForUpi.total || 0).toFixed(2)}`)}`}
              className="mx-auto rounded bg-white p-2 mb-3"
            />
            <div className="text-lg mb-1">{inr(paymentOrderForUpi.total)}</div>
            <div className="text-xs text-slate-400 mb-4">{upiId}</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-secondary" onClick={handleConfirmUpiPayment}>Confirmed</button>
              <button className="btn btn-outline" onClick={() => setUpiConfirmOpen(false)}>Cancel</button>
            </div>
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

