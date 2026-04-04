import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const mobileCategories = ['All', 'Quick Bites', 'Drinks', 'Dessert'];

function toCategory(name = '') {
  const s = name.toLowerCase();
  if (s.includes('tea') || s.includes('coffee') || s.includes('drink') || s.includes('coke')) return 'Drinks';
  if (s.includes('cake') || s.includes('dessert') || s.includes('ice')) return 'Dessert';
  return 'Quick Bites';
}

export default function SelfOrder() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [token, setToken] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {}
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => activeCategory === 'All' || toCategory(p.name) === activeCategory);
  }, [products, activeCategory]);

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((x) => x.id === product.id);
      if (found) {
        return prev.map((x) => (x.id === product.id ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const placeOrder = async () => {
    if (!token.trim()) return alert('Enter table token first');
    if (!cart.length) return alert('Add at least one item');

    try {
      const res = await fetch(`${API_BASE_URL}/self-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Order Confirmed #${data.data?.order?.id || ''}`);
        setCart([]);
      } else {
        alert(data.error || 'Failed to place order');
      }
    } catch {
      alert('Failed to place order');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[430px] h-[880px] odoo-panel overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <button className="btn btn-xs btn-outline" onClick={() => navigate('/login')}>Back</button>
          <h1 className="hand text-3xl">Order Here</h1>
          <div />
        </div>

        <div className="p-3 border-b border-slate-700">
          <input
            className="odoo-input w-full h-10 rounded-xl px-3"
            placeholder="Enter table token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <div className="flex gap-2 px-3 py-2 border-b border-slate-700 overflow-auto scroll-thin">
          {mobileCategories.map((cat) => (
            <button
              key={cat}
              className={`btn btn-xs whitespace-nowrap ${cat === activeCategory ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {filteredProducts.map((p) => (
              <button key={p.id} className="odoo-card p-2 text-left hover:border-sky-400" onClick={() => addToCart(p)}>
                <div className="h-20 bg-[#222b38] rounded mb-2" />
                <div className="text-sm">{p.name}</div>
                <div className="text-xs text-amber-300">{`\u20B9${Number(p.price).toFixed(2)}`}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-700 p-3 space-y-2">
          <div className="max-h-32 overflow-auto scroll-thin pr-1">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1 border-b border-slate-800">
                <span>{item.quantity} x {item.name}</span>
                <span>{`\u20B9${(Number(item.price) * item.quantity).toFixed(2)}`}</span>
              </div>
            ))}
            {!cart.length && <p className="text-slate-500 text-sm">No items added</p>}
          </div>
          <div className="flex justify-between text-xl font-semibold">
            <span>Total</span>
            <span>{`\u20B9${total.toFixed(2)}`}</span>
          </div>
          <button className="btn btn-secondary w-full" onClick={placeOrder}>Confirm Order</button>
        </div>
      </div>
    </div>
  );
}


