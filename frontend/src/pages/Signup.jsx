import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name }),
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok && data.success) {
        navigate('/login');
      } else {
        setError(data.error || `Signup failed (HTTP ${response.status})`);
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
        <div className="odoo-panel p-8 min-h-[620px]">
          <h2 className="hand text-6xl text-center mb-14">SignUp</h2>
          <form onSubmit={handleSubmit} className="space-y-7 max-w-xl mx-auto">
            {error && <div className="alert alert-error text-sm py-2">{error}</div>}
            <div>
              <label className="hand text-4xl block mb-2">Name</label>
              <input className="odoo-input w-full h-12 rounded-xl px-4 text-lg" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="hand text-4xl block mb-2">Email/Username</label>
              <input className="odoo-input w-full h-12 rounded-xl px-4 text-lg" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="hand text-4xl block mb-2">Password</label>
              <div className="flex items-center gap-0">
                <input
                  className="odoo-input w-full h-12 rounded-l-xl px-4 text-lg border-r-0"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            <button type="submit" disabled={isLoading} className="btn btn-odoo border-none hand text-5xl h-16 w-52 mx-auto block mt-10">
              {isLoading ? '...' : 'Sign Up'}
            </button>
            <p className="hand text-5xl text-center text-sky-400">
              <Link to="/login">Back to Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
