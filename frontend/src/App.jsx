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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/self-order" element={<SelfOrder />} />
        <Route path="/customer-display" element={<CustomerDisplay />} />
        <Route path="/orders-center" element={<OrdersCenter />} />
      </Routes>
    </Router>
  );
}

export default App;
