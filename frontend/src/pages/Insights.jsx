import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Insights() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState({ peakHours: [], popularPickups: [], popularDropoffs: [] });
  const [forecastData, setForecastData] = useState({ targetHour: 0, targetDay: 1, hotspots: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    async function fetchData() {
      try {
        const [analyticsRes, forecastRes] = await Promise.all([
          api.get('/analytics/demand'),
          api.get('/forecasting/hotspots')
        ]);
        setAnalyticsData(analyticsRes.data);
        setForecastData(forecastRes.data);
      } catch (err) {
        console.error('Error fetching insights data:', err);
        setError('Failed to load insights and forecasting data.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-teal-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-4 border-t-teal-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
      </div>
    );
  }

  // ── Prepare data for Peak Hours Bar Chart ────────────────────────────────
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const peakCounts = new Array(24).fill(0);
  analyticsData.peakHours.forEach(item => {
    peakCounts[item.hour] = item.count;
  });

  const barChartData = {
    labels: hours.map(h => `${h}:00`),
    datasets: [
      {
        label: 'Historical Rides',
        data: peakCounts,
        backgroundColor: 'rgba(45, 212, 191, 0.45)', // Pastel teal-400
        borderColor: '#2dd4bf',
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { weight: 'bold' } }
      },
    },
    scales: {
      x: {
        grid: { color: '#334155/30' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        grid: { color: '#334155/30' },
        ticks: { color: '#94a3b8', stepSize: 1 },
        beginAtZero: true
      }
    }
  };

  // ── Prepare data for Popular Pickups Doughnut Chart ──────────────────────
  const pickupLabels = analyticsData.popularPickups.map(item => item.location.split(':')[1] || item.location);
  const pickupCounts = analyticsData.popularPickups.map(item => item.count);

  const doughnutChartData = {
    labels: pickupLabels.length > 0 ? pickupLabels : ['No Data'],
    datasets: [
      {
        label: 'Pickups',
        data: pickupCounts.length > 0 ? pickupCounts : [1],
        backgroundColor: [
          'rgba(45, 212, 191, 0.65)',  // Pastel Teal
          'rgba(129, 140, 248, 0.65)', // Pastel Indigo
          'rgba(244, 114, 182, 0.65)', // Pastel Pink
          'rgba(251, 191, 36, 0.65)',  // Pastel Amber
          'rgba(167, 139, 250, 0.65)', // Pastel Purple
        ],
        borderColor: '#1e293b',
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11, weight: '500' } }
      }
    }
  };

  // ── Prepare data for Forecasting Bar Chart ────────────────────────────────
  // Take top 5 predicted locations
  const topForecast = forecastData.hotspots.slice(0, 5);
  const forecastLabels = topForecast.map(h => h.location);
  const forecastCounts = topForecast.map(h => h.predictedCount);

  const forecastChartData = {
    labels: forecastLabels,
    datasets: [
      {
        label: 'Predicted Ride Score',
        data: forecastCounts,
        backgroundColor: 'rgba(99, 102, 241, 0.55)', // Pastel Indigo-500
        borderColor: '#818cf8',
        borderWidth: 1.5,
        borderRadius: 6,
      }
    ]
  };

  const forecastChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { weight: 'bold' } }
      }
    },
    scales: {
      x: {
        grid: { color: '#334155/30' },
        ticks: { color: '#94a3b8' },
        beginAtZero: true
      },
      y: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-hidden">
          {/* Subtle neon gradient background orb */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -z-10" />
          
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span className="w-12 h-12 bg-slate-800 border border-slate-700 text-teal-400 rounded-2xl flex items-center justify-center text-2xl shadow-[0_4px_20px_rgba(45,212,191,0.15)]">
                🔮
              </span>
              Campus Insights & Forecasts
            </h1>
            <p className="text-slate-400 font-medium mt-2">
              Demand predictions & historical analytics for IITR campus.
            </p>
          </div>
          <button
            onClick={() => navigate(user?.role === 'driver' ? '/driver-dashboard' : '/passenger-dashboard')}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 text-center"
          >
            ← Back Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 px-6 py-4 rounded-2xl font-bold flex items-center gap-3">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── SECTION: 1-Hour Demand Forecast 🔮 ── */}
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
          {/* 3D Glass Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500/20 via-indigo-500/20 to-pink-500/20" />
          
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-teal-400 font-bold text-sm tracking-widest uppercase">AI Predictive Analytics</span>
                <span className="bg-teal-500/10 text-teal-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-teal-500/20 animate-pulse">
                  Live Forecast
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
                Predicted Hotspots (Hour: {forecastData.targetHour}:00)
              </h2>
            </div>
            <p className="text-slate-400 text-sm">
              Weight: 40% Recent Activity + 60% Weekday Average
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Forecast Chart */}
            <div className="lg:col-span-5 bg-slate-950/40 border border-slate-800 p-5 rounded-2xl h-80 flex flex-col justify-between">
              <span className="text-sm font-bold text-slate-300">Top Predicted Hotspots</span>
              <div className="flex-1 min-h-0 mt-4 relative">
                <Bar data={forecastChartData} options={forecastChartOptions} />
              </div>
            </div>

            {/* Hotspots Recommendation List */}
            <div className="lg:col-span-7 space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {forecastData.hotspots.map((item, index) => {
                const isHigh = item.demandLevel === 'High';
                const isMed = item.demandLevel === 'Medium';
                
                return (
                  <div
                    key={item.location}
                    className="bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-400">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-sm sm:text-base">{item.location}</h4>
                        <p className="text-slate-400 text-xs mt-0.5">{item.recommendation}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-slate-400">
                        {item.predictedCount} score
                      </span>
                      <span className={`text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-full border ${
                        isHigh ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]' :
                        isMed ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                        'bg-blue-500/10 text-blue-300 border-blue-500/20'
                      }`}>
                        {item.demandLevel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* ── SECTION: Historical Analytics 📊 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Peak Hours Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl h-96 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl -z-10" />
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Peak Activity Hours</h3>
              <p className="text-slate-400 text-xs mt-0.5">Aggregated completed rides count by hour of day.</p>
            </div>
            <div className="flex-1 min-h-0 mt-4">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>

          {/* Popular Pickups Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl h-96 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -z-10" />
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Hot Pickup Zones</h3>
              <p className="text-slate-400 text-xs mt-0.5">Top pickup hubs historical share.</p>
            </div>
            <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
              <Doughnut data={doughnutChartData} options={doughnutOptions} />
            </div>
          </div>

        </div>

        {/* Insights Summary Footer */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -z-10" />
          <h2 className="text-lg font-bold tracking-tight mb-2 flex items-center gap-2 text-white">
            💡 AI Optimization Advice
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Forecasting indicates that drivers should position themselves near{' '}
            <span className="text-teal-300 font-bold">
              {forecastData.hotspots[0]?.location || pickupLabels[0] || 'high-demand zones'}
            </span>{' '}
            during the upcoming hour. Historically, the campus experiences its peak requests around{' '}
            <span className="text-teal-300 font-bold">
              {analyticsData.peakHours.length > 0
                ? `${analyticsData.peakHours.reduce((max, h) => (h.count > max.count ? h : max), { count: 0, hour: 0 }).hour}:00`
                : 'mid-day'}
            </span>
            . Position near these hotspots in advance to reduce pick-up times and maximize earnings.
          </p>
        </div>

      </div>
    </div>
  );
}
