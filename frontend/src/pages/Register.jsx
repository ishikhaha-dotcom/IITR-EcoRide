import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Register() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { connectWithToken } = useSocket();

  const [form, setForm]       = useState({
    full_name: '', email: '', password: '', phone: '', role: 'rider',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function setRole(role) {
    setForm((f) => ({ ...f, role }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      connectWithToken(data.token);
      navigate(data.user.role === 'driver' ? '/driver' : '/passenger');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-800 px-6 py-3.5 rounded-3xl mb-4 shadow-xl shadow-teal-500/5">
            <span className="w-10 h-10 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-2xl flex items-center justify-center text-xl shadow-md">
              🛺
            </span>
            <span className="text-2xl font-black text-white tracking-tight">
              IITR <span className="text-teal-400">EcoRide</span>
            </span>
          </div>
          <p className="text-teal-400 text-sm font-bold tracking-wide uppercase">For IITR Students, By IITR Students</p>
          <p className="text-gray-400 mt-2 text-xs">Create your account</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Role Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                I am a…
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'rider',  label: '🧍 Passenger' },
                  { value: 'driver', label: '🚗 Driver' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`py-3 rounded-xl border-2 font-medium text-sm transition-all duration-200
                      ${form.role === value
                        ? 'border-violet-500 bg-violet-500/20 text-violet-300 shadow-lg shadow-violet-500/20'
                        : 'border-gray-700 bg-gray-800/40 text-gray-400 hover:border-gray-600'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-Column Grid for Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">👤</span>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                    placeholder="Jane Smith"
                    className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500
                               rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500
                               focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wide">Email address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">✉️</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="you@campus.edu"
                    className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500
                               rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500
                               focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Two-Column Grid for Contact & Security */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wide">
                  Phone <span className="text-gray-500 font-medium normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">📱</span>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765"
                    className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500
                               rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500
                               focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">🔒</span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    placeholder="Min 6 chars"
                    className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500
                               rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500
                               focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed
                         text-white font-semibold py-3 rounded-xl transition-all duration-200
                         shadow-lg shadow-violet-600/30 hover:shadow-violet-500/40 hover:-translate-y-0.5
                         active:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <footer className="text-center text-slate-500 text-xs mt-8 font-semibold tracking-wide">
          Made with 💙 for the IITR community
        </footer>
      </div>
    </div>
  );
}
