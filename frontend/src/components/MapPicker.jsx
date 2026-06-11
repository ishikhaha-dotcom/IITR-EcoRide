import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEvents({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return null;
}

export default function MapPicker({ isOpen, onClose, onConfirm, type }) {
  const [position, setPosition] = useState(null);
  const [customName, setCustomName] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setPosition(null);
      setCustomName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Center on IIT Roorkee by default
  const defaultCenter = [29.8649, 77.8966];

  const handleConfirm = () => {
    if (position && customName.trim()) {
      onConfirm({
        name: customName,
        lat: position.lat,
        lng: position.lng
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-950">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📍</span> Select {type === 'pickup' ? 'Pickup' : 'Destination'} on Map
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800">✕</button>
        </div>

        {/* Map Container */}
        <div className="h-[400px] w-full bg-gray-800 relative z-0">
          <MapContainer center={defaultCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapEvents setPosition={setPosition} />
            {position && <Marker position={position} />}
          </MapContainer>
          
          {!position && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur border border-emerald-500/50 text-emerald-400 font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none z-[400]">
              Click anywhere to drop a pin
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 bg-gray-950 space-y-4">
          <p className="text-sm font-medium text-emerald-400/80 uppercase tracking-wider">
            {position ? `📌 Coordinates Captured: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}` : 'Awaiting Map Input...'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              placeholder="Custom Label (e.g. 'Back of Library')"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={!position}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-all shadow-inner"
            />
            <button 
              onClick={handleConfirm}
              disabled={!position || !customName.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:translate-y-px"
            >
              Confirm Pin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
