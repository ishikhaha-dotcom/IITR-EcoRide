import { useState, useEffect } from 'react';

export default function PermissionModal({ onComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoGranted, setGeoGranted] = useState(false);
  const [callConsent, setCallConsent] = useState(true);
  const [smsConsent, setSmsConsent] = useState(true);

  useEffect(() => {
    const permissions = localStorage.getItem('campusRidePermissions');
    if (!permissions) {
      setIsOpen(true);
    } else {
      onComplete(); // Already completed
    }
  }, [onComplete]);

  const handleRequestPermissions = () => {
    setLoading(true);
    
    // Request Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoGranted(true);
          savePermissions(true);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Even if denied, we save so we don't ask again on every reload
          savePermissions(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      savePermissions(false);
    }
  };

  const savePermissions = (geoStatus) => {
    localStorage.setItem('campusRidePermissions', JSON.stringify({
      geo: geoStatus,
      call: callConsent,
      sms: smsConsent
    }));
    setLoading(false);
    setIsOpen(false);
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-800/40 backdrop-blur-sm" />
      
      <div className="relative bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm">
          📍
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2 tracking-tight">
          Enhance Your Experience
        </h2>
        <p className="text-slate-500 text-center text-sm mb-8 leading-relaxed">
          To provide real-time tracking and seamless driver communication, we need a few permissions.
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xl mt-0.5">🗺️</span>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Location Access</p>
              <p className="text-xs text-slate-500 mt-1">Required to show live rickshaws and automatically detect your pickup point.</p>
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input 
                type="checkbox" 
                checked={callConsent}
                onChange={(e) => setCallConsent(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
              />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm group-hover:text-teal-600 transition-colors">Enable Phone Calling</p>
              <p className="text-xs text-slate-500 mt-1">Allow clicking the driver's phone icon to launch your native dialer.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input 
                type="checkbox" 
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
              />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm group-hover:text-teal-600 transition-colors">Enable SMS Gateway</p>
              <p className="text-xs text-slate-500 mt-1">Allow fallback SMS messaging if real-time chat disconnects.</p>
            </div>
          </label>
        </div>

        <button
          onClick={handleRequestPermissions}
          disabled={loading}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/30 transition-all active:translate-y-px"
        >
          {loading ? 'Requesting...' : 'Grant Permissions & Continue'}
        </button>
      </div>
    </div>
  );
}
