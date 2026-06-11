import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../context/SocketContext';

// Custom Rickshaw Icon (Mint Green)
const rickshawIcon = L.divIcon({
  html: `<div style="background-color: #34d399; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid white; font-size: 16px;">🛺</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Component to recenter map when active driver moves
function RecenterOnActiveDriver({ activeDriver }) {
  const map = useMap();
  useEffect(() => {
    if (activeDriver && activeDriver.lat && activeDriver.lng) {
      map.setView([activeDriver.lat, activeDriver.lng], 16, { animate: true });
    }
  }, [activeDriver, map]);
  return null;
}

export default function LiveMap({ activeRidePhase }) {
  const { socket } = useSocket();
  const [fleet, setFleet] = useState([]);
  const [activeDriver, setActiveDriver] = useState(null);

  // Default IIT Roorkee Center
  const defaultCenter = [29.8644, 77.8964];

  useEffect(() => {
    if (!socket) return;

    function onFleetUpdate(drivers) {
      // Drivers is array of { driver_id, current_lat, current_lng }
      setFleet(drivers || []);
    }

    function onLiveTripSync(data) {
      // Data is { driverId, lat, lng }
      setActiveDriver(data);
    }

    socket.on('nearby_drivers_fleet', onFleetUpdate);
    socket.on('live_trip_coordinate_sync', onLiveTripSync);

    return () => {
      socket.off('nearby_drivers_fleet', onFleetUpdate);
      socket.off('live_trip_coordinate_sync', onLiveTripSync);
    };
  }, [socket]);

  return (
    <div className="relative w-full h-[300px] sm:h-[400px] rounded-2xl overflow-hidden shadow-sm border border-slate-200 z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={15} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* If no active ride, show all nearby drivers */}
        {!activeRidePhase && fleet.map((driver) => (
          <Marker 
            key={driver.driver_id} 
            position={[driver.current_lat, driver.current_lng]}
            icon={rickshawIcon}
          >
            <Popup className="rounded-xl">
              <div className="font-semibold text-slate-800">Available Rickshaw</div>
            </Popup>
          </Marker>
        ))}

        {/* If active ride, show only the assigned driver and auto-pan */}
        {activeRidePhase && activeDriver && (
          <>
            <RecenterOnActiveDriver activeDriver={activeDriver} />
            <Marker 
              position={[activeDriver.lat, activeDriver.lng]}
              icon={rickshawIcon}
            >
              <Popup>
                <div className="font-semibold text-slate-800 text-center">
                  Your Driver <br/> 
                  <span className="text-teal-600 text-xs tracking-widest uppercase">Approaching</span>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
      
      {/* Overlay gradient for aesthetics */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/60 to-transparent pointer-events-none z-[400]" />
    </div>
  );
}
