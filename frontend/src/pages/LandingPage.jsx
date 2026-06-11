import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function LandingPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect them to their dashboard
  useEffect(() => {
    if (token && user) {
      navigate(user.role === 'driver' ? '/driver' : '/passenger');
    }
  }, [token, user, navigate]);

  const features = [
    {
      icon: '⚡',
      title: 'Real-Time Ride Matching',
      desc: 'No more waiting at gates. Match with available campus e-rickshaws instantly with live location mapping.'
    },
    {
      icon: '💰',
      title: 'Fair Bidding & Proportional Fare',
      desc: 'Transparent pricing. Pay proportionally based on passenger count (₹10/rider) or negotiate using our driver bidding system.'
    },
    {
      icon: '🔮',
      title: 'AI Demand Forecasting',
      desc: 'Advanced statistical hotspots prediction helps drivers position themselves before request peaks, ensuring minimal wait times.'
    },
    {
      icon: '📅',
      title: 'Smart Scheduled Rides',
      desc: 'Plan your day. Schedule campus trips in advance and receive proactive alert reminders on the day of your ride.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500/30 overflow-x-hidden relative">
      
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse duration-[6000ms]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-xl flex items-center justify-center text-lg shadow-md shadow-teal-500/10">
              🛺
            </span>
            <span className="text-xl font-black text-white tracking-tight">
              IITR <span className="text-teal-400">EcoRide</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-md active:scale-95"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center relative">
        <div className="space-y-6">
          <span className="inline-block bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-wider">
            For IITR Students, By IITR Students
          </span>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Seamless Campus Mobility <br />
            <span className="bg-gradient-to-r from-teal-400 via-indigo-400 to-teal-300 bg-clip-text text-transparent">
              Made Simple.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-400 text-base sm:text-lg font-medium leading-relaxed">
            A sustainable, community-driven e-rickshaw booking platform designed specifically for the IIT Roorkee campus. Connect passengers and drivers instantly.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-teal-500/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-center"
            >
              Get Started Now
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-extrabold px-8 py-4 rounded-2xl transition-all shadow-md active:translate-y-0 text-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Unique Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-900 relative">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white">How We Make Campus Life Easy</h2>
          <p className="text-slate-500 text-sm mt-2">Tailored features built directly for our unique IITR student needs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feat, i) => (
            <div 
              key={i} 
              className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 p-6 sm:p-8 rounded-3xl transition-all duration-300 transform hover:-translate-y-1 shadow-xl flex gap-5"
            >
              <span className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0 shadow-md">
                {feat.icon}
              </span>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-lg">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community Footer */}
      <footer className="border-t border-slate-900 py-12 text-center relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-4">
          <p className="text-slate-500 text-sm font-bold tracking-wide">
            IITR ECORIDE PLATFORM
          </p>
          <p className="text-slate-600 text-xs font-semibold">
            Made with 💙 for the IITR community
          </p>
        </div>
      </footer>

    </div>
  );
}
