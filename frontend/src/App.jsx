import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import POS from './pages/POS';
import Admin from './pages/Admin';
import Kitchen from './pages/Kitchen';
import Dashboard from './pages/Dashboard';
import SelfOrder from './pages/SelfOrder';
import CustomerDisplay from './pages/CustomerDisplay';
import OrdersCenter from './pages/OrdersCenter';

function getRole(user = {}) {
  const role = String(user?.role || '').toLowerCase();
  if (['admin', 'customer', 'chef', 'user'].includes(role)) return role;
  const username = String(user?.username || '').toLowerCase();
  if (username === 'admin') return 'admin';
  if (username === 'chef') return 'chef';
  if (username === 'customer' || username.startsWith('cust_')) return 'customer';
  return 'user';
}

function redirectForRole(role) {
  if (role === 'customer') return '/self-order';
  if (role === 'user') return '/pos';
  if (role === 'chef') return '/kitchen';
  return '/admin';
}

function RequireAuth({ children, roles }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user?.id) return <Navigate to="/login" replace />;
  const role = getRole(user);
  if (roles && !roles.includes(role)) {
    return <Navigate to={redirectForRole(role)} replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pos" element={<RequireAuth roles={['user']}><POS /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth roles={['admin']}><Admin /></RequireAuth>} />
        <Route path="/kitchen" element={<RequireAuth roles={['admin', 'chef']}><Kitchen /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth roles={['admin']}><Dashboard /></RequireAuth>} />
        <Route path="/self-order" element={<RequireAuth roles={['customer']}><SelfOrder /></RequireAuth>} />
        <Route path="/customer-display" element={<RequireAuth roles={['admin', 'user']}><CustomerDisplay /></RequireAuth>} />
        <Route path="/orders-center" element={<RequireAuth roles={['admin']}><OrdersCenter /></RequireAuth>} />
      </Routes>
    </Router>
  );
}

export default App;
