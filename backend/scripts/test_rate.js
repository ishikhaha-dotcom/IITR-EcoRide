const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:5000/api' + path);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(chunks) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  try {
    const login = await request('POST', '/auth/login', { email: 'alice_1781097450870@campus.edu', password: 'password123' });
    const riderToken = login.data.token;
    console.log('Login status:', login.status);
    
    // Test the rate endpoint with a random UUID
    const res = await request('POST', '/rides/rate', {
      ride_id: 'aae91b56-e429-488e-ab4b-c4edfc93d548',
      rating: 5,
      feedback_text: 'Test'
    }, riderToken);
    console.log('Rate response:', res);
  } catch (err) {
    console.error(err);
  }
}
run();
