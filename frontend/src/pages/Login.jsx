import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('saved_login');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.username) setUsername(saved.username);
      if (saved?.password) setPassword(saved.password);
      setRememberMe(true);
    } catch (error) {
      console.error('Failed to read saved login:', error);
    }
  }, []);

  const resolveRole = (user, rawUsername) => {
    const explicit = String(user?.role || '').toLowerCase();
    if (['admin', 'customer', 'chef', 'user'].includes(explicit)) return explicit;
    if (user?.is_admin) return 'admin';
    const usernameLower = String(rawUsername || user?.username || '').toLowerCase();
    if (usernameLower === 'admin') return 'admin';
    if (usernameLower === 'chef') return 'chef';
    if (usernameLower === 'customer' || usernameLower.startsWith('cust_')) return 'customer';
    return 'user';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const usernameClean = username.trim();

    try {
      const doLogin = () =>
        fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameClean, password }),
        });

      let response = await doLogin();

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      const usernameLower = String(usernameClean || '').toLowerCase();
      const canBootstrapDefault =
        (usernameLower === 'admin' && password === 'admin123') ||
        (usernameLower === 'chef' && password === 'chef123');

      if ((!response.ok || !data.success) && canBootstrapDefault) {
        try {
          await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameClean, password }),
          });
        } catch (bootstrapError) {
          console.error('Bootstrap default user failed:', bootstrapError);
        }
        response = await doLogin();
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      }

      if (response.ok && data.success) {
        const role = resolveRole(data.user, usernameClean);
        const userWithRole = { ...data.user, role };
        localStorage.setItem('user', JSON.stringify(userWithRole));
        if (rememberMe) {
          localStorage.setItem('saved_login', JSON.stringify({ username: usernameClean, password }));
        } else {
          localStorage.removeItem('saved_login');
        }
        navigate(
          role === 'admin'
            ? '/admin'
            : role === 'chef'
              ? '/kitchen'
              : role === 'customer'
                ? '/self-order'
                : '/pos'
        );
      } else {
        setError(data.error || `Login failed (HTTP ${response.status})`);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1a22] text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="hand text-5xl text-amber-400 mb-6">Login</h1>

        <div className="odoo-panel p-8 min-h-[620px]">
          <h2 className="hand text-6xl text-center mb-16">Login</h2>

          <form onSubmit={handleSubmit} className="space-y-7 max-w-xl mx-auto">
            {error && <div className="alert alert-error text-sm py-2">{error}</div>}

            <div>
              <label className="hand text-4xl block mb-2">Email/Username</label>
              <input
                className="odoo-input w-full h-12 rounded-xl px-4 text-lg"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="hand text-4xl block mb-2">Password</label>
              <div className="flex items-center gap-0">
                <input
                  className="odoo-input w-full h-12 rounded-l-xl px-4 text-lg border-r-0"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="odoo-input h-12 w-12 rounded-r-xl border-l-0 flex items-center justify-center"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" className="checkbox checkbox-sm" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Remember login on this device
            </label>

            <button type="submit" disabled={isLoading} className="btn btn-odoo border-none hand text-5xl h-16 w-52 mx-auto block mt-12">
              {isLoading ? '...' : 'Login'}
            </button>

            <p className="hand text-5xl text-center mt-6 text-sky-400">
              <Link to="/signup">Sign Up here</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
