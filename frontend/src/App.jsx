import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login              from './pages/Login';
import Register           from './pages/Register';
import PassengerDashboard from './pages/PassengerDashboard';
import DriverDashboard    from './pages/DriverDashboard';
import DriverOnboarding   from './pages/DriverOnboarding';
import Insights           from './pages/Insights';
import LandingPage        from './pages/LandingPage';

// ── Protected Route ────────────────────────────────────────────────────
// Redirects to /login if the user is not authenticated.
// If the role doesn't match the required role, redirects to the correct
// dashboard instead of showing a blank page.
function ProtectedRoute({ children, requiredRole }) {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'driver' ? '/driver' : '/passenger'} replace />;
  }
  return children;
}

// ── Root redirect ─────────────────────────────────────────────────────
// Sends authenticated users straight to their dashboard, guests to landing.
function RootRedirect() {
  const { token, user } = useAuth();
  if (!token || !user) return <LandingPage />;
  return <Navigate to={user.role === 'driver' ? '/driver' : '/passenger'} replace />;
}

// ── App Routes ────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected — Passenger */}
      <Route
        path="/passenger"
        element={
          <ProtectedRoute requiredRole="rider">
            <PassengerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected — Driver */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute requiredRole="driver">
            <DriverDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver-onboarding"
        element={
          <ProtectedRoute requiredRole="driver">
            <DriverOnboarding />
          </ProtectedRoute>
        }
      />

      {/* Root → smart redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Protected — Insights */}
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <Insights />
          </ProtectedRoute>
        }
      />

      {/* Default fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

// ── Root App ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
