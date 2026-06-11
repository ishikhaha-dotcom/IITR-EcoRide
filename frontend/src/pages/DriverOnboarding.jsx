import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function DriverOnboarding() {
  const navigate = useNavigate();
  const { user, login } = useAuth(); // We can re-call login to update the user context
  const [form, setForm] = useState({
    vehicle_model: '',
    license_plate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.put('/auth/profile', form);
      
      // Update local user state or refetch profile
      const { data } = await api.get('/auth/profile');
      
      // The login context function might require the token to be passed again, 
      // but usually the token is stored. Let's just retrieve token from localStorage:
      const token = localStorage.getItem('token');
      if (token) {
        login(token, data.user);
      }
      
      navigate('/driver');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative w-full max-w-md bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-slate-900 border border-slate-800 px-6 py-3.5 rounded-3xl mb-6 shadow-xl shadow-teal-500/5">
            <span className="w-10 h-10 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-2xl flex items-center justify-center text-xl shadow-md">
              🛺
            </span>
            <span className="text-2xl font-black text-white tracking-tight">
              IITR <span className="text-teal-400">EcoRide</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Driver Onboarding</h1>
          <p className="text-gray-400">Please provide your vehicle details to start accepting rides.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">E-Rickshaw Model</label>
            <input
              type="text"
              name="vehicle_model"
              value={form.vehicle_model}
              onChange={handleChange}
              required
              placeholder="e.g., Mahindra Treo"
              className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500
                         rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500
                         focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">License Plate / Reg No.</label>
            <input
              type="text"
              name="license_plate"
              value={form.license_plate}
              onChange={handleChange}
              required
              placeholder="e.g., UK-17-A-1234"
              className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500
                         rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500
                         focus:border-transparent transition-all uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed
                       text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-4
                       shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40"
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
