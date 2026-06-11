import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChatBox from '../components/ChatBox';
import AccountDrawer from '../components/AccountDrawer';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user, logout }                  = useAuth();
  const { socket, isConnected, connectWithToken } = useSocket();

  const [isOnline,     setIsOnline]     = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [incomingRide, setIncomingRide] = useState(null);
  const [activeRide,   setActiveRide]   = useState(null);
  const [ridePhase,    setRidePhase]    = useState(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [waitingForPassenger, setWaitingForPassenger] = useState(false);
  const [isChatOpen, setIsChatOpen]   = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [customBid, setCustomBid]     = useState('');
  const [error,         setError]        = useState('');
  const [stats, setStats] = useState({ completedRides: 0, avgRating: 0, totalRatings: 0, walletEarnings: 0 });
  const [pastRides, setPastRides] = useState([]);
  const [scheduledRides, setScheduledRides] = useState([]);
  const [myUpcomingRides, setMyUpcomingRides] = useState([]);
  const [remindedRides, setRemindedRides] = useState(new Set());
  const [ratingToast, setRatingToast] = useState(null);
  const [showDriverCancelModal, setShowDriverCancelModal] = useState(false);
  const toastTimerRef = useRef(null);

  // Simulator for streaming driver location
  useEffect(() => {
    let interval;
    if (isOnline && socket) {
      // Simulate moving rickshaw on campus
      interval = setInterval(() => {
        // Base campus coordinates
        const lat = 29.8644 + (Math.random() - 0.5) * 0.005;
        const lng = 77.8964 + (Math.random() - 0.5) * 0.005;
        
        socket.emit('update_driver_location', {
          lat,
          lng,
          active_rider_id: activeRide ? activeRide.riderId : null
        });
      }, 5000); // Pulse every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isOnline, socket, activeRide]);

  const fetchDriverStats = async () => {
    try {
      const { data: pData } = await api.get('/auth/profile');

      // Check for onboarding completion
      if (!pData.user?.vehicle_model || !pData.user?.license_plate) {
        navigate('/driver-onboarding');
        return;
      }

      let completedCount = 0;
      let earnings = 0;
      if (pData.ride_history && Array.isArray(pData.ride_history)) {
        setPastRides(pData.ride_history);
        pData.ride_history.forEach(r => {
          if (r.status === 'completed') {
            completedCount++;
            earnings += Number(r.base_fare || 0) + Number(r.tip || 0);
          }
        });
      }

      // Use the SQL-aggregated rating if available, otherwise use user object
      const avg = Number(pData.average_rating) 
        || Number(pData.user?.average_rating) 
        || 0;

      const totalRatings = Number(pData.total_ratings)
        || Number(pData.user?.total_ratings)
        || 0;

      setStats({
        completedRides: completedCount,
        avgRating: avg,
        totalRatings: totalRatings,
        walletEarnings: earnings
      });
    } catch (err) {
      console.error('Failed to fetch driver stats:', err.message);
    }
  };

  const fetchScheduledRides = async () => {
    try {
      const { data } = await api.get('/rides/scheduled');
      setScheduledRides(data.rides || []);
      
      const upcomingRes = await api.get('/rides/upcoming');
      setMyUpcomingRides(upcomingRes.data.rides || []);
    } catch (err) {
      console.error('Failed to load scheduled rides:', err.message);
    }
  };

  const loadInitialData = async () => {
    try {
      const availRes = await api.get('/drivers/availability/me');
      if (availRes.data.availability) {
        setIsOnline(availRes.data.availability.is_available);
      }
    } catch (err) {
      console.error('Failed to load availability:', err.message);
    }
    await fetchDriverStats();
    await fetchScheduledRides();
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reminders for accepted scheduled rides
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      myUpcomingRides.forEach(ride => {
        if (ride.status === 'accepted' && ride.scheduled_for && !remindedRides.has(ride.id)) {
          const scheduledTime = new Date(ride.scheduled_for).getTime();
          const timeDiffMinutes = (scheduledTime - now) / 1000 / 60;
          
          if (timeDiffMinutes > 0 && timeDiffMinutes <= 15) {
            alert(`Reminder: You have a scheduled ride from ${ride.pickup_location.split(':')[1] || ride.pickup_location} in ${Math.round(timeDiffMinutes)} minutes!`);
            setRemindedRides(prev => new Set(prev).add(ride.id));
          }
        }
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [myUpcomingRides, remindedRides]);

  useEffect(() => {
    if (!socket) return;

    function onNewRequest(payload) {
      if (!isOnline || activeRide) return;
      setIncomingRide(payload);
    }

    function onCounterOfferWon(data) {
      setWaitingForPassenger(false);
      setRidePhase('accepted');
      setActiveRide({
        rideId: data.rideId,
        riderId: data.riderId,
        pickup: incomingRide?.pickup || 'Pickup Location',
        destination: incomingRide?.destination || 'Drop-off Location',
        passengerPhone: incomingRide?.passengerPhone
      });
      setIncomingRide(null);
    }

    function onChatUnlocked() {
      setIsChatOpen(true);
    }

    function onStatsUpdated() {
      fetchDriverStats();
    }

    function onRatingNotification(data) {
      setRatingToast({ rating: data.rating, feedback_text: data.feedback_text });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setRatingToast(null), 8000);
      
      if (data.total_ratings !== undefined) {
        setStats(prev => ({
          ...prev,
          avgRating: data.average_rating,
          totalRatings: data.total_ratings,
          completedRides: data.total_rides || prev.completedRides
        }));
      } else {
        fetchDriverStats();
      }
    }

    function onRideCancelled({ ride_id }) {
      setIncomingRide(prev => {
        if (prev && prev.rideId === ride_id) {
          setWaitingForPassenger(false);
          return null;
        }
        return prev;
      });
    }

    function onRideTaken({ rideId }) {
      setIncomingRide(prev => {
        if (prev && prev.rideId === rideId) {
          setWaitingForPassenger(false);
          return null; // Remove the incoming ride modal/card instantly!
        }
        return prev;
      });
      // Also filter out of scheduled/upcoming lists
      setScheduledRides(prev => prev.filter(r => r.id !== rideId));
    }

    socket.on('new_ride_request', onNewRequest);
    socket.on('counter_offer_won', onCounterOfferWon);
    socket.on('chat_unlocked', onChatUnlocked);
    socket.on('stats_updated', onStatsUpdated);
    socket.on('driver_rating_received', onRatingNotification);
    socket.on('ride_cancelled_by_passenger', onRideCancelled);
    socket.on('ride_taken', onRideTaken);
    
    return () => {
      socket.off('new_ride_request', onNewRequest);
      socket.off('counter_offer_won', onCounterOfferWon);
      socket.off('chat_unlocked', onChatUnlocked);
      socket.off('stats_updated', onStatsUpdated);
      socket.off('driver_rating_received', onRatingNotification);
      socket.off('ride_cancelled_by_passenger', onRideCancelled);
      socket.off('ride_taken', onRideTaken);
    };
  }, [socket, isOnline, activeRide, incomingRide]);

  async function toggleOnline() {
    setTogglingOnline(true);
    setError('');
    try {
      await api.put('/drivers/availability', {
        is_available: !isOnline,
      });
      setIsOnline((prev) => !prev);
      if (isOnline) setIncomingRide(null);
    } catch (err) {
      console.error('Availability toggle failed:', err.message);
      setError(err.response?.data?.error || 'Failed to update availability.');
    } finally {
      setTogglingOnline(false);
    }
  }

  async function handleAcceptScheduledRide(rideId) {
    if (!isOnline) {
      setError('You must be online to accept scheduled rides.');
      return;
    }

    setAcceptLoading(true);
    setError('');
    try {
      await api.patch(`/rides/${rideId}/accept`);
      
      // Remove from list
      setScheduledRides(prev => prev.filter(r => r.id !== rideId));
      
      // Fetch stats again so the completed/accepted ride is recorded or we can just fetch it again
      fetchScheduledRides();

      alert('Scheduled ride claimed successfully!');
    } catch (err) {
      console.error('Accept scheduled ride error:', err);
      setError(err.response?.data?.error || 'Failed to claim scheduled ride.');
      fetchScheduledRides(); // Refresh the list just in case
    } finally {
      setAcceptLoading(false);
    }
  }

  async function handleAcceptRide(rideId, driverId) {
    if (!rideId) {
      setError('Error: rideId is missing.');
      return;
    }
    setAcceptLoading(true);
    setError('');
    try {
      await api.patch(`/rides/${rideId}/accept`);

      socket?.emit('ride_accepted', {
        rideId:     rideId,
        riderId:    incomingRide.riderId,
        driverId:   driverId,
        driverName: user?.full_name,
      });

      setActiveRide({
        ...incomingRide,
        passengerPhone: incomingRide.passengerPhone
      });
      setRidePhase('accepted');
      setIncomingRide(null);
    } catch (err) {
      console.error('Accept ride failed:', err.message);
      setError(err.response?.data?.error || 'Failed to accept ride.');
    } finally {
      setAcceptLoading(false);
    }
  }

  function handleDecline() {
    setIncomingRide(null);
    setWaitingForPassenger(false);
  }

  function handleCounterOffer(amount) {
    if (!incomingRide) return;
    socket?.emit('driver_counter_offer', {
      rideId: incomingRide.rideId,
      riderId: incomingRide.riderId,
      counterFare: amount
    });
    setWaitingForPassenger(true);
  }

  async function handleStartTrip(rideId, riderId) {
    setError('');
    try {
      await api.patch(`/rides/${rideId}/status`, { status: 'in_progress' });
      socket?.emit('ride_started', {
        rideId:  rideId,
        riderId: riderId,
      });
      setRidePhase('in_progress');
    } catch (err) {
      console.error('Start trip failed:', err.message);
      setError(err.response?.data?.error || 'Failed to start trip.');
    }
  }

  function handleCancelTripClick() {
    setShowDriverCancelModal(true);
  }

  function submitCancelTrip(reason) {
    if (socket && activeRide) {
      socket.emit('driver_cancel_ride', { 
        ride_id: activeRide.rideId, 
        reason,
        riderId: activeRide.riderId
      });
    }
    setShowDriverCancelModal(false);
    setActiveRide(null);
    setRidePhase(null);
    setIsChatOpen(false);
    setIncomingRide(null);
    setWaitingForPassenger(false);
  }

  async function handleEndTrip(rideId, riderId) {
    setError('');
    try {
      await api.patch(`/rides/${rideId}/status`, { status: 'completed' });
      socket?.emit('ride_ended', {
        rideId:  rideId,
        riderId: riderId,
      });
      setActiveRide(null);
      setRidePhase(null);
      // Immediately refresh stats cards after completing a ride
      fetchDriverStats();
    } catch (err) {
      console.error('End trip failed:', err.message);
      setError(err.response?.data?.error || 'Failed to end trip.');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-slate-800 font-sans selection:bg-indigo-200">
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
              Driver
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.6)]' : 'bg-slate-500'}`} />
              {isConnected ? 'Live' : 'Offline'}
            </div>
            <button
              onClick={() => navigate('/insights')}
              className="hidden sm:flex bg-slate-800 hover:bg-slate-700 text-slate-200 items-center justify-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all border border-slate-700 shadow-sm active:scale-95 text-xs"
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
            <span className="text-slate-300 text-sm font-medium hidden sm:block">{user?.full_name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-rose-400 transition-colors font-medium px-2 py-1"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Driver Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* Completed Rides */}
          <div className="bg-sky-50 border border-sky-100 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md hover:-translate-y-1">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-md border border-sky-100">
              <span style={{filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))', transform: 'translateY(-1px)', display: 'inline-block'}}>🏁</span>
            </div>
            <p className="text-sky-600 text-sm font-bold uppercase tracking-wider mb-1">Completed Rides</p>
            <p className="text-sky-900 text-3xl font-black tracking-tight">{stats.completedRides}</p>
          </div>
          {/* Average Rating */}
          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md hover:-translate-y-1">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-md border border-amber-100">
              <span style={{filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))', transform: 'translateY(-1px)', display: 'inline-block'}}>🌟</span>
            </div>
            <p className="text-amber-600 text-sm font-bold uppercase tracking-wider mb-1">Average Rating</p>
            <p className="text-amber-900 text-3xl font-black tracking-tight">
              {stats.totalRatings > 0 ? `${stats.avgRating} / 5` : 'Nil / 5'}
            </p>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              Based on {stats.totalRatings || 0} reviews
            </p>
          </div>
          {/* Wallet Earnings */}
          <div className="bg-teal-50 border border-teal-100 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:shadow-md hover:-translate-y-1">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-md border border-teal-100">
              <span style={{filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))', transform: 'translateY(-1px)', display: 'inline-block'}}>💰</span>
            </div>
            <p className="text-teal-600 text-sm font-bold uppercase tracking-wider mb-1">Active Wallet</p>
            <p className="text-teal-900 text-3xl font-black tracking-tight">₹{stats.walletEarnings}</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3 relative flex items-center justify-between font-medium shadow-sm">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600 font-bold px-2">✕</button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {isOnline ? '🟢 You are Online' : '⚫ You are Offline'}
              </h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">
                {isOnline
                  ? 'Broadcasting location... Ready to accept incoming ride requests.'
                  : 'Go online to start receiving ride requests.'}
              </p>
            </div>

            <button
              onClick={toggleOnline}
              disabled={togglingOnline}
              className={`relative inline-flex w-20 h-10 rounded-full transition-all duration-300 flex-shrink-0 border-2
                focus:outline-none focus:ring-4 focus:ring-teal-500/30
                ${isOnline
                  ? 'bg-teal-500 border-teal-500 shadow-lg shadow-teal-500/30'
                  : 'bg-slate-200 border-slate-200'}
                ${togglingOnline ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
              `}
              aria-label="Toggle online status"
            >
              <span className={`absolute top-[2px] w-8 h-8 bg-white rounded-full shadow-sm transition-all duration-300
                ${isOnline ? 'left-[42px]' : 'left-[2px]'}`}
              />
            </button>
          </div>
        </div>

        {/* Available Scheduled Rides */}
        {!activeRide && scheduledRides.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Available Scheduled Rides</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">Claim future bookings in advance.</p>
              </div>
              <span className="bg-teal-100 text-teal-700 font-bold px-3 py-1 rounded-full text-sm">
                {scheduledRides.length} Available
              </span>
            </div>
            
            <div className="space-y-4">
              {scheduledRides.map(r => (
                <div key={r.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-teal-300 transition-colors shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                  <div className="flex-1 pl-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded">Rider: {r.passenger_name || 'Passenger'}</span>
                      <span className="text-teal-700 font-bold text-sm bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                        🕒 {new Date(r.scheduled_for).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-800 font-bold text-base truncate">
                      {r.pickup_location.split(':')[1] || r.pickup_location} <span className="text-slate-400 font-normal mx-1">→</span> {r.dropoff_location.split(':')[1] || r.dropoff_location}
                    </p>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                      Est. Fare: <span className="text-slate-700 font-bold">₹{r.base_fare}</span> {Number(r.tip) > 0 && <span className="text-rose-500 font-bold ml-1">+ ₹{r.tip} Tip</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAcceptScheduledRide(r.id)}
                    disabled={acceptLoading || !isOnline}
                    className="w-full sm:w-auto bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md active:translate-y-px whitespace-nowrap"
                  >
                    {acceptLoading ? 'Accepting...' : 'Claim Ride'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {incomingRide && !activeRide && (
          <div className={`rounded-3xl p-8 shadow-xl border animate-in slide-in-from-top-4 duration-300 ${
            incomingRide.tip > 0 
              ? 'bg-white border-rose-200 shadow-rose-100' 
              : 'bg-white border-teal-200 shadow-teal-50'
          }`}>
            <div className="flex items-start gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm ${
                incomingRide.tip > 0 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-teal-50 text-teal-600 border border-teal-100'
              }`}>
                {incomingRide.tip > 0 ? '⚡' : '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                {incomingRide.tip > 0 ? (
                  <p className="text-rose-600 font-bold text-xl tracking-tight animate-pulse">URGENT REQUEST!</p>
                ) : (
                  <p className="text-teal-700 font-bold text-xl tracking-tight">New Ride Request</p>
                )}
                
                <div className="mt-4 space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-lg">📍</span>
                    <span className="font-semibold text-slate-700 truncate">{incomingRide.pickup}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-lg">🎯</span>
                    <span className="font-semibold text-slate-700 truncate">{incomingRide.destination}</span>
                  </div>
                  {incomingRide.passengerCount && (
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-lg">👥</span>
                      <span className="font-semibold text-slate-700">{incomingRide.passengerCount} {incomingRide.passengerCount === 1 ? 'Person' : 'Persons'}</span>
                    </div>
                  )}
                </div>

                <div className={`mt-5 p-5 rounded-2xl border ${
                  incomingRide.tip > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-500">Base Fare:</span>
                    <span className="text-slate-800">₹{incomingRide.baseFare}</span>
                  </div>
                  {incomingRide.tip > 0 && (
                    <div className="flex justify-between items-center text-sm mt-2 font-medium">
                      <span className="text-rose-500">Speed Tip:</span>
                      <span className="font-bold text-rose-600">+₹{incomingRide.tip}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-200 my-3" />
                  <div className="flex justify-between items-center text-base">
                    <span className="font-bold text-slate-700">Total Payout:</span>
                    <span className="font-bold text-teal-600 text-2xl tracking-tight">₹{incomingRide.totalOffer}</span>
                  </div>
                </div>

                {waitingForPassenger ? (
                  <div className="mt-6 p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center gap-3">
                    <svg className="animate-spin w-5 h-5 text-teal-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    <span className="text-teal-700 font-bold tracking-wide animate-pulse">Waiting for Passenger Approval...</span>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col gap-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAcceptRide(incomingRide.rideId, user?.id)}
                        disabled={acceptLoading}
                        className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 disabled:text-slate-500
                                   text-white font-bold py-3.5 rounded-xl transition-all
                                   shadow-lg shadow-teal-500/20 active:translate-y-px
                                   flex items-center justify-center gap-2 text-lg"
                      >
                        {acceptLoading ? 'Accepting…' : `✅ Accept at ₹${incomingRide.totalOffer}`}
                      </button>
                      <button
                        onClick={handleDecline}
                        className="px-6 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-all shadow-sm active:translate-y-px"
                      >
                        ✕ Decline
                      </button>
                    </div>
                    
                    {!incomingRide.isOnCampus && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 font-bold">Quick Counter Bids (Off-Campus Only)</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[10, 20, 25, 30, 40, 50, 100, 120, 150]
                            .filter(amt => amt > incomingRide.baseFare)
                            .map((amt) => (
                            <button
                              key={amt}
                              onClick={() => handleCounterOffer(amt)}
                              className="bg-white hover:bg-teal-50 border border-slate-200 text-teal-600 font-bold py-2.5 rounded-xl transition-all text-sm hover:border-teal-300 shadow-sm active:scale-95"
                            >
                              ₹{amt}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                          <input
                            type="number"
                            placeholder="Custom Offer (₹)"
                            value={customBid}
                            onChange={(e) => setCustomBid(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder-slate-400"
                          />
                          <button
                            onClick={() => {
                              if(customBid) handleCounterOffer(Number(customBid));
                            }}
                            disabled={!customBid}
                            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-3 rounded-xl transition font-bold shadow-md active:translate-y-px"
                          >
                            Send ➤
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeRide && (
          <div className={`rounded-3xl p-8 shadow-xl transition-colors duration-500 border
            ${ridePhase === 'in_progress'
              ? 'bg-amber-50 border-amber-200 shadow-amber-100/50'
              : 'bg-indigo-50 border-indigo-200 shadow-indigo-100/50'}`}>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm bg-white border ${ridePhase === 'in_progress' ? 'border-amber-200' : 'border-indigo-200'}`}>
                  {ridePhase === 'in_progress' ? '▶️' : '🤝'}
                </div>
                <div>
                  <p className={`font-bold text-2xl tracking-tight ${ridePhase === 'in_progress' ? 'text-amber-700' : 'text-indigo-700'}`}>
                    {ridePhase === 'in_progress' ? 'Trip In Progress' : 'Ride Accepted'}
                  </p>
                  <p className="text-slate-500 text-sm mt-1 font-medium">
                    {ridePhase === 'in_progress'
                      ? 'Follow the route to the drop-off location.'
                      : 'Head to the pickup location to collect your passenger.'}
                  </p>
                </div>
              </div>

              {activeRide.passengerPhone && (
                <a 
                  href={`tel:${activeRide.passengerPhone}`}
                  className="bg-white hover:bg-teal-50 text-teal-600 border border-teal-200 p-4 rounded-full transition-all hover:scale-105 active:scale-95 shadow-md flex-shrink-0 flex items-center justify-center"
                  title="Call Passenger"
                >
                  📞
                </a>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 mb-8 shadow-sm">
              <div className="flex items-center gap-4 text-sm font-semibold">
                <span className="text-slate-400 text-lg w-6 text-center">📍</span>
                <span className="text-slate-700 text-base">{activeRide.pickup}</span>
              </div>
              <div className="ml-[17px] w-0.5 h-6 bg-slate-200" />
              <div className="flex items-center gap-4 text-sm font-semibold">
                <span className="text-slate-400 text-lg w-6 text-center">🎯</span>
                <span className="text-slate-700 text-base">{activeRide.destination}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-6">
              {ridePhase === 'accepted' && (
                <button
                  onClick={() => handleStartTrip(activeRide.rideId, activeRide.riderId)}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-lg
                             py-4 rounded-xl transition-all shadow-lg shadow-amber-400/30
                             active:translate-y-px flex items-center justify-center gap-2"
                >
                  ▶️ Start Trip
                </button>
              )}
              {ridePhase === 'in_progress' && (
                <button
                  onClick={() => handleEndTrip(activeRide.rideId, activeRide.riderId)}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold text-lg
                             py-4 rounded-xl transition-all shadow-lg shadow-teal-500/30
                             active:translate-y-px flex items-center justify-center gap-2"
                >
                  🏁 Finish Trip
                </button>
              )}
            </div>

            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-3.5 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
            >
              💬 Open Passenger Chat
            </button>

            <button
              onClick={handleCancelTripClick}
              className="mt-4 w-full text-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              ✕ Cancel Trip
            </button>
          </div>
        )}

        {isOnline && !incomingRide && !activeRide && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-md animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm border border-teal-100">
              🔍
            </div>
            <p className="text-slate-800 font-bold text-xl tracking-tight">Scanning for Requests…</p>
            <p className="text-slate-500 text-sm mt-2 font-medium">You'll be notified the moment a passenger requests a ride nearby.</p>
          </div>
        )}

        {!isOnline && !activeRide && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm opacity-80 grayscale-[0.5]">
            <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border border-slate-200">
              💤
            </div>
            <p className="text-slate-700 font-bold text-xl tracking-tight">You're Offline</p>
            <p className="text-slate-500 text-sm mt-2 font-medium">Toggle the switch above to start accepting rides.</p>
          </div>
        )}
      </main>

      {activeRide && (
        <ChatBox 
          rideId={activeRide.rideId || activeRide.id} 
          currentUserId={user.id} 
          receiverId={activeRide.riderId} 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}

      <AccountDrawer isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />

      {/* Rating Toast Notification */}
      {ratingToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-md animate-in slide-in-from-top-6 fade-in duration-500">
          <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-2xl shadow-teal-200/30 flex items-start gap-4 relative">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-teal-100">
              🎉
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-slate-800 font-bold text-sm tracking-tight">
                New Feedback! A student rated you {ratingToast.rating} Stars
                {ratingToast.feedback_text ? `: '${ratingToast.feedback_text}'` : ''}
              </p>
            </div>
            <button
              onClick={() => { setRatingToast(null); if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }}
              className="text-slate-300 hover:text-slate-500 font-bold text-sm transition-colors flex-shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Driver Cancel Modal */}
      {showDriverCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Cancel Trip</h3>
            <p className="text-slate-500 text-sm mb-6">Please provide a reason for cancelling this active trip:</p>
            
            <div className="space-y-3 mb-6">
              {[
                "Passenger is not responding / cannot locate",
                "Vehicle mechanical issue / flat tire",
                "Too much luggage / overload",
                "Passenger requested to cancel via call"
              ].map((reason, idx) => (
                <button
                  key={idx}
                  onClick={() => submitCancelTrip(reason)}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  {reason}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDriverCancelModal(false)}
              className="text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors w-full text-center py-2"
            >
              Keep My Trip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
