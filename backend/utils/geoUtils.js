const LOCATIONS = {
  // 🏫 Campus Hubs
  'Main Building': { lat: 29.8649, lng: 77.8966, onCampus: true },
  'MGCL Library': { lat: 29.8657, lng: 77.8938, onCampus: true },
  'Student Activity Centre (SAC)': { lat: 29.8660, lng: 77.8950, onCampus: true },
  'Multi Activity Centre (MAC)': { lat: 29.8655, lng: 77.8945, onCampus: true },
  'Lecture Hall Complex (LHC)': { lat: 29.8638, lng: 77.8950, onCampus: true },

  // 🛏️ Bhawans / Hostels
  'Rajendra Bhawan': { lat: 29.8662, lng: 77.8980, onCampus: true },
  'Cautley Bhawan': { lat: 29.8665, lng: 77.8992, onCampus: true },
  'Jawahar Bhawan': { lat: 29.8670, lng: 77.8995, onCampus: true },
  'Himalaya Bhawan': { lat: 29.8650, lng: 77.9010, onCampus: true },
  'Kasturba Bhawan': { lat: 29.8630, lng: 77.9000, onCampus: true },
  'Sarojini Bhawan': { lat: 29.8625, lng: 77.8985, onCampus: true },
  'Govind Bhawan': { lat: 29.8640, lng: 77.8990, onCampus: true },
  'Radhakrishnan Bhawan': { lat: 29.8655, lng: 77.9005, onCampus: true },
  'Rajiv Bhawan': { lat: 29.8675, lng: 77.8975, onCampus: true },
  'Vivekananda Bhawan': { lat: 29.8680, lng: 77.8960, onCampus: true },

  // 🚪 Campus Gates
  'Main Gate / Century Gate': { lat: 29.8618, lng: 77.8961, onCampus: true },
  'JD Gate': { lat: 29.8610, lng: 77.8970, onCampus: true },
  'Gate No. 5': { lat: 29.8685, lng: 77.8950, onCampus: true },
  'Gate No. 7': { lat: 29.8690, lng: 77.8980, onCampus: true },

  // 🔬 Academic Departments
  'Architecture and Planning': { lat: 29.8640, lng: 77.8960, onCampus: true },
  'Biosciences and Bioengineering': { lat: 29.8642, lng: 77.8955, onCampus: true },
  'Chemical Engineering': { lat: 29.8638, lng: 77.8965, onCampus: true },
  'Chemistry': { lat: 29.8645, lng: 77.8970, onCampus: true },
  'Civil Engineering': { lat: 29.8650, lng: 77.8930, onCampus: true },
  'CSE Department': { lat: 29.8635, lng: 77.8945, onCampus: true },
  'Earthquake Engineering': { lat: 29.8648, lng: 77.8940, onCampus: true },
  'Earth Sciences': { lat: 29.8640, lng: 77.8950, onCampus: true },
  'Electrical Engineering': { lat: 29.8632, lng: 77.8935, onCampus: true },
  'ECE Department': { lat: 29.8630, lng: 77.8940, onCampus: true },
  'Humanities and Social Sciences': { lat: 29.8655, lng: 77.8965, onCampus: true },
  'Hydrology': { lat: 29.8652, lng: 77.8975, onCampus: true },
  'Management Studies (DoMS)': { lat: 29.8660, lng: 77.8960, onCampus: true },
  'Mathematics': { lat: 29.8645, lng: 77.8955, onCampus: true },
  'Mechanical Department': { lat: 29.8645, lng: 77.8935, onCampus: true },
  'Metallurgical and Materials Engineering': { lat: 29.8635, lng: 77.8960, onCampus: true },
  'Physics': { lat: 29.8650, lng: 77.8950, onCampus: true },
  'Water Resources Development and Management': { lat: 29.8658, lng: 77.8980, onCampus: true },

  // 🚆 Outside Roorkee City
  'CBRI (Off-Campus)': { lat: 29.8730, lng: 77.9050, onCampus: false },
  'Roorkee Railway Station (Off-Campus)': { lat: 29.8710, lng: 77.8821, onCampus: false },
  'Roorkee Bus Stand (Off-Campus)': { lat: 29.8532, lng: 77.8885, onCampus: false },
  'Civil Lines Market (Off-Campus)': { lat: 29.8512, lng: 77.8924, onCampus: false },
};

/**
 * Calculates the absolute distance between two coordinates in kilometers 
 * using the mathematical Haversine formula.
 */
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Looks up the provided keys in the registry and calculates distance.
 */
function calculateDistance(pickupKey, destinationKey) {
  const pickup = LOCATIONS[pickupKey];
  const dest = LOCATIONS[destinationKey];
  
  if (!pickup || !dest) return null;
  
  return getHaversineDistance(pickup.lat, pickup.lng, dest.lat, dest.lng);
}

/**
 * Checks if a ride crosses off-campus boundaries.
 */
function isRideOutsideCampus(pickupKey, destinationKey) {
  const pickup = LOCATIONS[pickupKey];
  const dest = LOCATIONS[destinationKey];
  
  // If we don't recognize the location, safely assume it might be off-campus
  if (!pickup || !dest) return true;
  
  return !(pickup.onCampus && dest.onCampus);
}

/**
 * Validates if raw coordinates fall strictly inside the IIT Roorkee bounding box.
 */
function isCoordinateOnCampus(lat, lng) {
  return lat >= 29.8580 && lat <= 29.8720 && lng >= 77.8880 && lng <= 77.9050;
}

module.exports = { 
  LOCATIONS, 
  getHaversineDistance,
  calculateDistance, 
  isRideOutsideCampus,
  isCoordinateOnCampus
};
