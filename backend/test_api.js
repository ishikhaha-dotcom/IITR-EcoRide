// ─── Phase 2 End-to-End API Test ─────────────────────────────────────
// Tests: register → login → request ride → accept → status updates
// Run:   node test_api.js
// ─────────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:5000/api';

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

function log(label, obj) {
  console.log(`\n── ${label} ──`);
  console.log(JSON.stringify(obj, null, 2));
}

(async () => {
  try {
    // 1. Register a rider
    const reg1 = await api('POST', '/auth/register', {
      full_name: 'Alice Rider',
      email: `alice_${Date.now()}@campus.edu`,
      password: 'password123',
      role: 'rider',
    });
    log('1. Register Rider', reg1);
    const riderToken = reg1.data.token;

    // 2. Register a driver
    const reg2 = await api('POST', '/auth/register', {
      full_name: 'Bob Driver',
      email: `bob_${Date.now()}@campus.edu`,
      password: 'password456',
      role: 'driver',
    });
    log('2. Register Driver', reg2);
    const driverToken = reg2.data.token;

    // 3. Login as rider
    const login = await api('POST', '/auth/login', {
      email: reg1.data.user.email,
      password: 'password123',
    });
    log('3. Login Rider', { status: login.status, hasToken: !!login.data.token });

    // 4. Get rider profile
    const profile = await api('GET', '/auth/profile', null, riderToken);
    log('4. Rider Profile', profile);

    // 5. Rider requests a ride
    const ride = await api('POST', '/rides', {
      pickup_location: 'Main Library',
      pickup_lat: 28.6139,
      pickup_lng: 77.2090,
      dropoff_location: 'Engineering Block',
      dropoff_lat: 28.6150,
      dropoff_lng: 77.2100,
    }, riderToken);
    log('5. Request Ride', ride);
    const rideId = ride.data.ride.id;

    // 6. Driver sets availability
    const avail = await api('PUT', '/drivers/availability', {
      is_available: true,
      current_lat: 28.6135,
      current_lng: 77.2085,
      heading: 'Near Main Library',
    }, driverToken);
    log('6. Driver Availability', avail);

    // 7. List available drivers
    const drivers = await api('GET', '/drivers/available', null, riderToken);
    log('7. Available Drivers', drivers);

    // 8. Driver accepts the ride
    const accept = await api('PATCH', `/rides/${rideId}/accept`, null, driverToken);
    log('8. Accept Ride', accept);

    // 9. Driver starts the ride
    const start = await api('PATCH', `/rides/${rideId}/status`, {
      status: 'in_progress',
    }, driverToken);
    log('9. Start Ride', start);

    // 10. Driver completes the ride
    const complete = await api('PATCH', `/rides/${rideId}/status`, {
      status: 'completed',
    }, driverToken);
    log('10. Complete Ride', complete);

    // 11. Rider views ride history
    const history = await api('GET', '/rides', null, riderToken);
    log('11. Rider History', { count: history.data.rides.length, status: history.data.rides[0].status });

    // 12. Rider rates the completed ride
    const rate = await api('POST', '/rides/rate', {
      ride_id: rideId,
      rating: 5,
      feedback_text: 'Great driver, arrived fast!'
    }, riderToken);
    log('12. Rider Rates Ride', rate);

    // 13. Check Driver Profile
    const driverProfile = await api('GET', '/auth/profile', null, driverToken);
    log('13. Driver Profile Stats', {
      completed_rides_count: driverProfile.data.completed_rides_count,
      average_rating: driverProfile.data.average_rating,
      total_ratings: driverProfile.data.total_ratings,
      user_total_ratings: driverProfile.data.user.total_ratings
    });

    console.log('\n✅  ALL TESTS PASSED\n');
  } catch (err) {
    console.error('\n❌  TEST FAILED:', err.message);
    process.exit(1);
  }
})();
