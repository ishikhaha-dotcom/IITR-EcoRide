import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function AccountDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Editable fields for drivers
  const [vehicleModel, setVehicleModel] = useState('');
  const [iitrPlate, setIitrPlate] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      loadProfileData();
    }
  }, [isOpen, user]);

  async function loadProfileData() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/auth/profile');
      setProfile(data.user);
      setRideHistory(data.ride_history || []);
      
      try {
        const upcomingRes = await api.get('/rides/upcoming');
        setUpcomingRides(upcomingRes.data.rides || []);
      } catch (err) {
        console.error('Failed to load upcoming rides:', err);
      }
      
      if (data.user.role === 'driver') {
        setVehicleModel(data.user.vehicle_model || '');
        setIitrPlate(data.user.license_plate || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Could not load profile details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveStatus('Saving...');
    try {
      await api.put('/auth/profile', {
        vehicle_model: vehicleModel,
        license_plate: iitrPlate
      });
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Failed to save vehicle details:', err);
      setSaveStatus('Failed to save.');
    }
  }

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm z-[90] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-[#faf9f6] border-l border-slate-200 shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
            <span className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-sm shadow-sm">👤</span>
            My Account
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 font-bold">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin w-8 h-8 text-teal-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : error ? (
            <div className="text-rose-500 text-center bg-rose-50 p-4 rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          ) : (
            <>
              {/* Profile Summary Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl -z-10" />
                <img 
                  src={profile?.profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-md object-cover mb-4 relative z-10"
                />
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{profile?.full_name}</h3>
                <p className="text-slate-500 text-sm mt-1 font-medium">{profile?.email}</p>
                
                <div className="flex items-center justify-center gap-3 mt-4">
                  <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-slate-200">
                    {profile?.role}
                  </span>
                  {profile?.phone_number && (
                    <span className="bg-teal-50 text-teal-700 text-xs px-3 py-1 rounded-full font-bold tracking-wider border border-teal-200">
                      📞 {profile.phone_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Driver Details Form */}
              {profile?.role === 'driver' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h4 className="text-slate-800 font-bold tracking-tight">Driver & Vehicle Info</h4>
                  </div>
                  <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Vehicle Model</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Mayur E-Rickshaw"
                        value={vehicleModel}
                        onChange={e => setVehicleModel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder-slate-400 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">IITR Security Plate</label>
                      <input 
                        type="text" 
                        placeholder="e.g. IITR-ER-405"
                        value={iitrPlate}
                        onChange={e => setIitrPlate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder-slate-400 font-medium"
                      />
                    </div>
                    <div className="pt-2">
                      <button 
                        type="submit"
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-teal-500/20 active:translate-y-px"
                      >
                        Save Vehicle Data
                      </button>
                      {saveStatus && (
                        <p className={`text-center text-sm font-semibold mt-3 ${saveStatus.includes('Failed') ? 'text-rose-500' : 'text-teal-600'}`}>
                          {saveStatus}
                        </p>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* Upcoming Scheduled Rides */}
              {profile?.role === 'rider' && upcomingRides.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-slate-800 font-bold text-lg tracking-tight px-1">Upcoming Bookings</h4>
                  <div className="space-y-3">
                    {upcomingRides.map(ride => (
                      <div key={ride.id} className="bg-white border border-teal-200 rounded-2xl p-4 flex justify-between items-center shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                        <div className="flex-1 min-w-0 pr-4 pl-2">
                          <p className="text-slate-800 font-bold truncate text-sm">
                            {ride.pickup_location.split(':')[1] || ride.pickup_location} <span className="text-slate-300 font-normal">→</span> {ride.dropoff_location.split(':')[1] || ride.dropoff_location}
                          </p>
                          <p className="text-teal-600 text-xs mt-1 font-bold flex items-center gap-1">
                            🕒 {new Date(ride.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border bg-teal-50 text-teal-700 border-teal-200">
                          {ride.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ride History */}
              <div className="space-y-4">
                <h4 className="text-slate-800 font-bold text-lg tracking-tight px-1">Past Ride History</h4>
                {rideHistory.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                    <span className="text-3xl mb-2 block opacity-50">🛤️</span>
                    <p className="text-slate-500 font-medium">No previous rides found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rideHistory.map(ride => (
                      <div key={ride.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-slate-800 font-bold truncate text-sm">
                            {ride.pickup_location.split(':')[1] || ride.pickup_location} <span className="text-slate-300 font-normal">→</span> {ride.dropoff_location.split(':')[1] || ride.dropoff_location}
                          </p>
                          <p className="text-slate-500 text-xs mt-1 font-medium flex items-center gap-2">
                            <span>{new Date(ride.requested_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            <span>•</span>
                            <span className="text-slate-700 font-bold">₹{ride.base_fare}</span>
                            {ride.payment_method && (
                              <>
                                <span>•</span>
                                <span className="uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {ride.payment_method}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                          ride.status === 'completed' 
                            ? 'bg-teal-50 text-teal-700 border-teal-200' 
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {ride.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
