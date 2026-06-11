import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChatBox from '../components/ChatBox';
import AccountDrawer from '../components/AccountDrawer';
import MapPicker from '../components/MapPicker';
import PermissionModal from '../components/PermissionModal';
import LocationSearch from '../components/LocationSearch';
import LiveMap from '../components/LiveMap';

// ── Ride status step definitions ──────────────────────────────────────
const STATUS_STEPS = [
  { key: 'requested',   label: 'Requested',   icon: '📍', color: 'indigo' },
  { key: 'accepted',    label: 'Driver Found', icon: '🤝', color: 'blue'   },
  { key: 'in_progress', label: 'In Progress',  icon: '▶️', color: 'amber'  },
  { key: 'completed',   label: 'Completed',    icon: '🏁', color: 'teal'},
];

const colorMap = {
  indigo:  { bg: 'bg-indigo-400',  ring: 'ring-indigo-300',  text: 'text-indigo-600'  },
  blue:    { bg: 'bg-blue-400',    ring: 'ring-blue-300',    text: 'text-blue-600'    },
  amber:   { bg: 'bg-amber-400',   ring: 'ring-amber-300',   text: 'text-amber-600'   },
  teal:    { bg: 'bg-teal-400',    ring: 'ring-teal-300',    text: 'text-teal-600'    },
};

// ── Registry of System Locations ──────────────────────────────────────
const LOCATION_OPTIONS = [
  { value: '', label: '-- Select a Location --', onCampus: true, group: 'none' },
  
  // 🏫 Campus Hubs
  { value: 'Main Building', label: 'Main Building', onCampus: true, group: '🏫 Campus Hubs' },
  { value: 'MGCL Library', label: 'MGCL Library', onCampus: true, group: '🏫 Campus Hubs' },
  { value: 'Student Activity Centre (SAC)', label: 'Student Activity Centre (SAC)', onCampus: true, group: '🏫 Campus Hubs' },
  { value: 'Multi Activity Centre (MAC)', label: 'Multi Activity Centre (MAC)', onCampus: true, group: '🏫 Campus Hubs' },
  { value: 'Lecture Hall Complex (LHC)', label: 'Lecture Hall Complex (LHC)', onCampus: true, group: '🏫 Campus Hubs' },

  // 🛏️ Bhawans / Hostels
  { value: 'Rajendra Bhawan', label: 'Rajendra Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Cautley Bhawan', label: 'Cautley Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Jawahar Bhawan', label: 'Jawahar Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Himalaya Bhawan', label: 'Himalaya Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Kasturba Bhawan', label: 'Kasturba Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Sarojini Bhawan', label: 'Sarojini Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Govind Bhawan', label: 'Govind Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Radhakrishnan Bhawan', label: 'Radhakrishnan Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Rajiv Bhawan', label: 'Rajiv Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },
  { value: 'Vivekananda Bhawan', label: 'Vivekananda Bhawan', onCampus: true, group: '🛏️ Bhawans / Hostels' },

  // 🚪 Campus Gates
  { value: 'Main Gate / Century Gate', label: 'Main Gate / Century Gate', onCampus: true, group: '🚪 Campus Gates' },
  { value: 'JD Gate', label: 'JD Gate', onCampus: true, group: '🚪 Campus Gates' },
  { value: 'Gate No. 5', label: 'Gate No. 5', onCampus: true, group: '🚪 Campus Gates' },
  { value: 'Gate No. 7', label: 'Gate No. 7', onCampus: true, group: '🚪 Campus Gates' },

  // 🔬 Academic Departments
  { value: 'Architecture and Planning', label: 'Architecture and Planning', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Biosciences and Bioengineering', label: 'Biosciences and Bioengineering', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Chemical Engineering', label: 'Chemical Engineering', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Chemistry', label: 'Chemistry', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Civil Engineering', label: 'Civil Engineering', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'CSE Department', label: 'CSE Department', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Earthquake Engineering', label: 'Earthquake Engineering', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Earth Sciences', label: 'Earth Sciences', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Electrical Engineering', label: 'Electrical Engineering', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'ECE Department', label: 'ECE Department', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Humanities and Social Sciences', label: 'Humanities and Social Sciences', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Hydrology', label: 'Hydrology', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Management Studies (DoMS)', label: 'Management Studies (DoMS)', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Mathematics', label: 'Mathematics', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Mechanical Department', label: 'Mechanical Department', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Metallurgical and Materials Engineering', label: 'Metallurgical and Materials Engineering', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Physics', label: 'Physics', onCampus: true, group: '🔬 Academic Departments' },
  { value: 'Water Resources Development and Management', label: 'Water Resources Development and Management', onCampus: true, group: '🔬 Academic Departments' },

  // 🚆 Outside Roorkee City
  { value: 'CBRI (Off-Campus)', label: 'CBRI (Off-Campus)', onCampus: false, group: '🚆 Outside Roorkee City' },
  { value: 'Roorkee Railway Station', label: 'Roorkee Railway Station (Off-Campus)', onCampus: false, group: '🚆 Outside Roorkee City' },
  { value: 'Bus Stand', label: 'Roorkee Bus Stand (Off-Campus)', onCampus: false, group: '🚆 Outside Roorkee City' },
  { value: 'Civil Lines', label: 'Civil Lines Market (Off-Campus)', onCampus: false, group: '🚆 Outside Roorkee City' },
];

export default function PassengerDashboard() {
  const navigate   = useNavigate();
  const { user, logout }    = useAuth();
  const { socket, isConnected } = useSocket();

  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [pickup,      setPickup]      = useState('');
  const [destination, setDestination] = useState('');
  const [tip,         setTip]         = useState(0);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [ride,        setRide]        = useState(null);
  const [rideStatus,  setRideStatus]  = useState(null);
  const [driverName,  setDriverName]  = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [driverInfo, setDriverInfo] = useState(null);
  const [counterOffers, setCounterOffers] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [pastRides, setPastRides] = useState([]);

  const [customLocations, setCustomLocations] = useState([]);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [passengerCount, setPassengerCount] = useState(1);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [driverCancelledToast, setDriverCancelledToast] = useState(null);

  const allOptions = [...LOCATION_OPTIONS, ...customLocations];

  useEffect(() => {
    if (!socket) return;

    function onStatusUpdate({ status, driverName: dn, driverId: did, driverPhone, driverPic, vehicleModel, iitrPlate }) {
      setRideStatus(status);
      if (dn) setDriverName(dn);
      if (did) setAssignedDriverId(did);
      
      if (driverPhone || driverPic || vehicleModel || iitrPlate) {
        setDriverInfo({
          phone: driverPhone,
          pic: driverPic,
          vehicleModel,
          iitrPlate
        });
      }
    }
    
    function onReceiveCounterOffer(offer) {
      setCounterOffers((prev) => [...prev, offer]);
    }

    function onChatUnlocked() {
      setIsChatOpen(true);
    }

    function onRideCancelledByDriver({ reason }) {
      setDriverCancelledToast(reason || 'Driver cancelled the ride.');
      handleNewRide();
      setTimeout(() => setDriverCancelledToast(null), 8000);
    }

    socket.on('ride_status_update', onStatusUpdate);
    socket.on('receive_counter_offer', onReceiveCounterOffer);
    socket.on('chat_unlocked', onChatUnlocked);
    socket.on('ride_cancelled_by_driver', onRideCancelledByDriver);
    
    return () => {
      socket.off('ride_status_update', onStatusUpdate);
      socket.off('receive_counter_offer', onReceiveCounterOffer);
      socket.off('chat_unlocked', onChatUnlocked);
      socket.off('ride_cancelled_by_driver', onRideCancelledByDriver);
    };
  }, [socket]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await api.get('/auth/profile');
        if (data.ride_history) setPastRides(data.ride_history);
      } catch (err) {
        console.error('Failed to load profile:', err.message);
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    if (rideStatus === 'completed') {
      setShowPaymentModal(true);
    }
  }, [rideStatus]);

  async function handlePayment() {
    if (!ride) return;
    setPaymentLoading(true);
    try {
      await api.post(`/rides/${ride.id}/pay`, { payment_method: paymentMethod });
      alert('Payment successful!');
      setShowPaymentModal(false);
      setShowRatingModal(true);
    } catch (err) {
      console.error('Payment failed:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function submitRating() {
    if (rating < 1) return;
    setRatingSubmitting(true);
    try {
      await api.post(`/rides/rate`, { ride_id: ride.id, rating, feedback_text: feedbackText });
    } catch (err) {
      console.error('Failed to submit rating:', err);
    } finally {
      setRatingSubmitting(false);
      setShowRatingModal(false);
      handleNewRide();
    }
  }

  async function handleRequestRide(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        pickup_location: pickup,
        pickup_lat: pickupCoords?.lat,
        pickup_lng: pickupCoords?.lng,
        dropoff_location: destination,
        dropoff_lat: destCoords?.lat,
        dropoff_lng: destCoords?.lng,
        isOutside: isOffCampusRoute,
        tip,
        passenger_count: passengerCount,
        is_scheduled: isScheduled,
        scheduled_for: isScheduled ? new Date(scheduledFor).toISOString() : null
      };

      const { data } = await api.post('/rides', payload);
      const newRide = data.ride;

      if (isScheduled) {
        alert('Ride scheduled successfully!');
        handleNewRide();
      } else {
        setRide(newRide);
        setRideStatus('requested');
        setDriverName('');
        setCounterOffers([]);

        socket?.emit('ride_request', {
          rideId:      newRide.id,
          riderId:     user.id,
          pickup:      pickup,
          pickup_lat:  pickupCoords?.lat,
          pickup_lng:  pickupCoords?.lng,
          destination: destination,
          dropoff_lat: destCoords?.lat,
          dropoff_lng: destCoords?.lng,
          baseFare:    Number(newRide.base_fare),
          tip:         Number(newRide.tip),
          passengerCount: passengerCount,
          isOnCampus:  !isOffCampusRoute
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request ride.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancelRequestClick() {
    setShowCancelModal(true);
  }

  function submitCancelRequest(reason) {
    if (socket && ride) {
      socket.emit('cancel_ride_request', { ride_id: ride.id, reason });
    }
    setShowCancelModal(false);
    handleNewRide();
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleNewRide() {
    setRide(null);
    setRideStatus(null);
    setPickup('');
    setPickupCoords(null);
    setDestination('');
    setDestCoords(null);
    setDriverName('');
    setAssignedDriverId('');
    setDriverInfo(null);
    setError('');
    setTip(0);
    setCounterOffers([]);
    setIsChatOpen(false);
    setRating(0);
    setFeedbackText('');
    setShowRatingModal(false);
  }

  function handleSearchSelect(target, item) {
    const value = item.name;
    if (!customLocations.find(l => l.value === value)) {
      setCustomLocations(prev => [...prev, { value, label: value, onCampus: false, lat: item.lat, lng: item.lng, group: '🗺️ Custom Locations' }]);
    }
    if (target === 'pickup') {
      setPickup(value);
      setPickupCoords({ lat: item.lat, lng: item.lng });
    } else {
      setDestination(value);
      setDestCoords({ lat: item.lat, lng: item.lng });
    }
  }

  const pickupLoc = allOptions.find(l => l.value === pickup);
  const destLoc = allOptions.find(l => l.value === destination);
  const isOffCampusRoute = pickupLoc && destLoc && pickupLoc.value !== '' && destLoc.value !== '' 
                           && !(pickupLoc.onCampus && destLoc.onCampus);

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === rideStatus);

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-800 font-sans selection:bg-indigo-200">
      <PermissionModal onComplete={() => setPermissionsGranted(true)} />
      <AccountDrawer isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />

      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-900 shadow-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-lg flex items-center justify-center text-sm shadow-md">
                🛺
              </span>
              <span className="text-lg font-black text-white tracking-tight">
                IITR <span className="text-teal-400">EcoRide</span>
              </span>
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-bold uppercase tracking-wider hidden sm:block">
              Passenger
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.6)]' : 'bg-slate-500'}`} />
              {isConnected ? 'Connected' : 'Offline'}
            </div>
            <button
              onClick={() => navigate('/insights')}
              className="hidden sm:flex bg-slate-100 hover:bg-slate-200 text-slate-700 items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all border border-slate-200 shadow-sm active:scale-95 text-xs"
              title="Demand Analytics"
            >
              📊 Insights
            </button>
            <button
              onClick={() => setIsAccountOpen(true)}
              className="text-2xl hover:scale-110 transition-transform focus:outline-none grayscale hover:grayscale-0"
              title="My Account"
            >
              👤
            </button>
            <span className="text-slate-300 text-sm font-medium hidden sm:block">
              {user?.full_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-rose-400 transition-colors font-medium px-2 py-1"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {driverCancelledToast && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl shadow-sm flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="font-bold">Your driver cancelled the ride. Reason: <span className="font-medium">{driverCancelledToast}</span></p>
            </div>
            <button onClick={() => setDriverCancelledToast(null)} className="text-rose-400 hover:text-rose-600 font-bold transition-colors">
              ✕
            </button>
          </div>
        )}

        {/* Live Radar Map */}
        {permissionsGranted && (
          <div className="w-full bg-white p-2 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <LiveMap activeRidePhase={ride ? rideStatus : null} />
          </div>
        )}

        {/* Ride Request Form */}
        {!ride && (
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
            <h2 className="text-2xl font-bold mb-1 tracking-tight">Book a Ride</h2>
            <p className="text-slate-500 text-sm mb-6">Enter your pickup and drop-off locations below</p>

            <form onSubmit={handleRequestRide} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    📍 Pickup Location
                  </label>
                  <LocationSearch 
                    placeholder="Search pickup..." 
                    onSelect={(item) => handleSearchSelect('pickup', item)} 
                  />
                  <div className="mt-2 text-xs text-center text-slate-400 font-medium">— OR —</div>
                  <select
                    value={pickup}
                    onChange={(e) => {
                      setPickup(e.target.value);
                      const sel = allOptions.find(o => o.value === e.target.value);
                      if (sel && sel.lat) setPickupCoords({ lat: sel.lat, lng: sel.lng });
                      else setPickupCoords(null);
                    }}
                    required
                    className="w-full mt-2 bg-slate-50 border border-slate-200 text-slate-700
                               rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50
                               transition-all appearance-none cursor-pointer text-sm font-medium shadow-sm"
                  >
                    {Object.entries(
                      allOptions.reduce((acc, opt) => {
                        const g = opt.group || 'none';
                        if (!acc[g]) acc[g] = [];
                        acc[g].push(opt);
                        return acc;
                      }, {})
                    ).map(([group, opts]) => {
                      if (group === 'none') {
                        return opts.map(opt => (
                          <option key={opt.label} value={opt.value} disabled={opt.value === ''}>{opt.label}</option>
                        ));
                      }
                      return (
                        <optgroup label={group} key={group}>
                          {opts.map(opt => (
                            <option key={opt.label} value={opt.value}>{opt.label}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🎯 Destination
                  </label>
                  <LocationSearch 
                    placeholder="Search destination..." 
                    onSelect={(item) => handleSearchSelect('destination', item)} 
                  />
                  <div className="mt-2 text-xs text-center text-slate-400 font-medium">— OR —</div>
                  <select
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      const sel = allOptions.find(o => o.value === e.target.value);
                      if (sel && sel.lat) setDestCoords({ lat: sel.lat, lng: sel.lng });
                      else setDestCoords(null);
                    }}
                    required
                    className="w-full mt-2 bg-slate-50 border border-slate-200 text-slate-700
                               rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50
                               transition-all appearance-none cursor-pointer text-sm font-medium shadow-sm"
                  >
                    {Object.entries(
                      allOptions.reduce((acc, opt) => {
                        const g = opt.group || 'none';
                        if (!acc[g]) acc[g] = [];
                        acc[g].push(opt);
                        return acc;
                      }, {})
                    ).map(([group, opts]) => {
                      if (group === 'none') {
                        return opts.map(opt => (
                          <option key={opt.label} value={opt.value} disabled={opt.value === ''}>{opt.label}</option>
                        ));
                      }
                      return (
                        <optgroup label={group} key={group}>
                          {opts.map(opt => (
                            <option key={opt.label} value={opt.value}>{opt.label}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Number of Passengers */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  👥 Number of Passengers
                </label>
                <div className="flex gap-3">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPassengerCount(num)}
                      className={`flex-1 py-3 text-sm font-bold border rounded-xl transition-all shadow-sm ${
                        passengerCount === num 
                          ? 'bg-teal-50 border-teal-300 text-teal-700 scale-[1.02]' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-teal-200 hover:bg-teal-50'
                      }`}
                    >
                      {num} {num === 1 ? 'Person' : 'Persons'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Fare Preview */}
              {pickup && destination && pickup !== destination && (
                <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xl shrink-0">
                      💰
                    </div>
                    <div>
                      <p className="text-slate-800 font-bold text-sm tracking-wide">Estimated Fare</p>
                      {isOffCampusRoute ? (
                        <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                          <span className="font-bold text-teal-600">Dynamic Metered Fare (₹12/km) x {passengerCount}</span>. 
                          The final distance will be automatically calculated.
                        </p>
                      ) : (
                        <p className="text-slate-500 text-sm mt-1">
                          <span className="font-bold text-teal-600">Flat ₹{10 * passengerCount}</span> (Standard On-Campus Route for {passengerCount} {passengerCount === 1 ? 'person' : 'persons'}).
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Urgency Speed Tip */}
              <div className="pt-2">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  ⚡ Add a Speed Tip (Optional)
                </label>
                <div className="flex gap-3">
                  {[0, 5, 10, 20].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTip(t)}
                      className={`flex-1 py-3 text-sm font-bold border rounded-xl transition-all shadow-sm ${
                        tip === t 
                          ? 'bg-amber-100 border-amber-300 text-amber-700 scale-[1.02]' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      +₹{t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule for Later */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    📅 Schedule for Later
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={isScheduled}
                      onChange={() => setIsScheduled(!isScheduled)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                  </label>
                </div>
                
                {isScheduled && (
                  <div className="mt-3">
                    <input 
                      type="datetime-local" 
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      required={isScheduled}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700
                                 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50
                                 transition-all text-sm font-medium shadow-sm"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3 font-medium">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || pickup === destination || pickup === '' || destination === '' || (isScheduled && !scheduledFor)}
                className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:text-slate-500
                           text-white font-bold py-4 rounded-xl transition-all duration-200
                           shadow-lg shadow-teal-500/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0
                           flex items-center justify-center gap-2 text-lg"
              >
                {loading ? 'Requesting…' : 'Request Ride Now'}
              </button>
            </form>
          </div>
        )}

        {/* Live Status Tracker */}
        {ride && (
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Ride Status</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium flex items-center gap-2">
                  <span>{pickup.split(':')[1] || pickup}</span>
                  <span className="text-slate-300">→</span>
                  <span>{destination.split(':')[1] || destination}</span>
                </p>
              </div>
              {rideStatus === 'completed' && (
                <button
                  onClick={handleNewRide}
                  className="text-sm bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200 px-5 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  + Book Another Ride
                </button>
              )}
              {rideStatus !== 'requested' && rideStatus !== 'completed' && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="bg-white hover:bg-slate-50 text-teal-600 text-sm font-bold px-5 py-2.5 rounded-xl border border-teal-200 transition-all flex items-center gap-2 shadow-sm"
                >
                  💬 Message Driver
                </button>
              )}
            </div>

            {/* Progress steps */}
            <div className="relative mb-10 px-2">
              <div className="absolute top-5 left-8 right-8 h-1 bg-slate-100 rounded-full" />
              <div
                className="absolute top-5 left-8 h-1 bg-teal-400 transition-all duration-700 rounded-full"
                style={{
                  width: currentStepIdx <= 0 ? '0%' :
                         currentStepIdx === 1 ? '33%' :
                         currentStepIdx === 2 ? '66%' : '100%',
                }}
              />

              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const done    = idx <= currentStepIdx;
                  const current = idx === currentStepIdx;
                  const colors  = colorMap[step.color];

                  return (
                    <div key={step.key} className="flex flex-col items-center gap-3 w-24">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl
                        transition-all duration-500 z-10 shadow-sm
                        ${done
                          ? `${colors.bg} text-white`
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                        }
                        ${current ? `ring-4 ring-offset-4 ring-offset-white ${colors.ring} scale-110` : ''}
                      `}>
                        {step.icon}
                      </div>
                      <span className={`text-xs font-bold text-center leading-tight transition-colors duration-300
                        ${done ? colors.text : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Status Card */}
            {(rideStatus === 'accepted' || rideStatus === 'in_progress') && driverInfo ? (
              <div className="mt-8 bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-md relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">
                      {rideStatus === 'in_progress' ? 'Trip In Progress' : 'Driver En Route'}
                    </span>
                  </div>
                  {driverInfo.phone && (
                    <a 
                      href={`tel:${driverInfo.phone}`}
                      className="bg-white hover:bg-teal-50 text-teal-600 border border-teal-200 p-3 rounded-full transition-all hover:scale-105 active:scale-95 shadow-sm"
                      title="Call Driver"
                    >
                      📞
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-5 relative z-10">
                  <img 
                    src={driverInfo.pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                    alt="Driver" 
                    className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{driverName || 'Your Driver'}</h3>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className="bg-white text-slate-600 text-xs px-2.5 py-1 rounded-md border border-slate-200 font-semibold shadow-sm">
                        {driverInfo.vehicleModel || 'E-Rickshaw'}
                      </span>
                      {driverInfo.iitrPlate && (
                        <span className="bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-md border border-teal-200 font-bold tracking-widest shadow-sm">
                          {driverInfo.iitrPlate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl mx-auto mb-3 shadow-sm border border-slate-100">
                  {rideStatus === 'requested' ? '⏳' : '🏁'}
                </div>
                <p className="text-slate-700 font-semibold text-lg">
                  {rideStatus === 'requested'   && 'Looking for an available driver…'}
                  {rideStatus === 'completed'   && 'You\'ve arrived! Thank you for riding with Campus Ride.'}
                </p>
                {rideStatus === 'requested' && (
                  <>
                    <p className="text-slate-500 text-sm mt-1">Drivers are currently reviewing your request.</p>
                    <button
                      onClick={handleCancelRequestClick}
                      className="mt-6 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-6 py-2.5 rounded-xl border border-rose-200 transition-all shadow-sm active:scale-95"
                    >
                      ✕ Cancel Request
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Counter Offers */}
            {counterOffers.length > 0 && rideStatus === 'requested' && (
              <div className="mt-8 space-y-4">
                <h3 className="text-slate-800 font-bold text-lg tracking-tight border-b border-slate-100 pb-2">Driver Counter Offers</h3>
                {counterOffers.map((offer, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-xl border border-slate-200">
                        👨‍✈️
                      </div>
                      <div>
                        <p className="text-slate-800 font-bold">{offer.driverName}</p>
                        <p className="text-teal-600 font-semibold text-sm">Counter Bid: ₹{offer.counterFare}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          socket?.emit('passenger_accept_counter', {
                            rideId: ride.id,
                            driverId: offer.driverId,
                            driverName: offer.driverName,
                            counterFare: offer.counterFare
                          });
                        }}
                        className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          setCounterOffers(prev => prev.filter(o => o.driverId !== offer.driverId));
                        }}
                        className="bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-sm font-bold px-5 py-2.5 rounded-xl border border-slate-200 transition-all shadow-sm active:scale-95"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      {/* Floating ChatBox */}
      {ride && assignedDriverId && (
        <ChatBox 
          rideId={ride.id} 
          currentUserId={user.id} 
          receiverId={assignedDriverId} 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-3xl mb-4 border border-teal-100">
              💸
            </div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight text-center">Payment Required</h3>
            <p className="text-slate-500 text-sm mt-1 text-center mb-6">Total Fare: <span className="text-slate-800 font-bold text-lg">₹{Number(ride?.base_fare || 0) + Number(ride?.tip || 0)}</span></p>
            
            <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col items-center mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-100 rounded-full blur-2xl -z-10" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Scan to Pay Driver</p>
              <div className="w-40 h-40 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center p-2 mb-3 shadow-sm">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=campusride@iitr&pn=CampusRide&am=10" alt="QR Code" className="w-full h-full object-contain rounded-xl opacity-90" />
              </div>
              
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === 'upi' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                  UPI
                </button>
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === 'cash' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                >
                  Cash
                </button>
              </div>
            </div>
            
            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/20 active:translate-y-px"
            >
              {paymentLoading ? 'Processing...' : 'Simulate Payment Success'}
            </button>
          </div>
        </div>
      )}

      {/* Ratings Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-3xl mb-4 border border-teal-100">
              🎉
            </div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight text-center">You've Arrived!</h3>
            <p className="text-slate-500 text-sm mt-1 text-center mb-6">How was your ride with {driverName || 'your driver'}?</p>
            
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-all duration-200 focus:outline-none hover:scale-110 ${
                    rating >= star ? 'text-amber-400 drop-shadow-sm' : 'text-slate-200 hover:text-amber-200'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            
            <textarea
              placeholder="Leave a compliment or feedback (optional)..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/50 mb-6 resize-none h-24"
            />
            
            <button
              onClick={submitRating}
              disabled={rating === 0 || ratingSubmitting}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-500/20 active:translate-y-px"
            >
              {ratingSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <button
              onClick={() => {
                setShowRatingModal(false);
                handleNewRide();
              }}
              className="mt-3 text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Reason Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Cancel Ride</h3>
            <p className="text-slate-500 text-sm mb-6">Please let us know why you are cancelling:</p>
            
            <div className="space-y-3 mb-6">
              {[
                "Waiting time is longer than expected",
                "Booked by mistake",
                "Changed my mind",
                "Found another e-rickshaw nearby"
              ].map((reason, idx) => (
                <button
                  key={idx}
                  onClick={() => submitCancelRequest(reason)}
                  className="w-full text-left bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-medium px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  {reason}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCancelModal(false)}
              className="text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors w-full text-center py-2"
            >
              Keep My Ride
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
