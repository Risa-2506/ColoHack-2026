import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  ArrowUpRight,
  Info,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchForecast } from '../services/api';

// ─────────────────────────────────────────────
//  Helper: color class for capacity percentage
// ─────────────────────────────────────────────
const barColor = (pct) => {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 75) return 'bg-amber-500';
  return 'bg-hospital-500';
};

const ForecastPage = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadForecast = () => {
    setLoading(true);
    setError('');
    fetchForecast()
      .then(res => {
        setForecast(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load forecast. Make sure the backend is running.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadForecast();
    // Re-fetch every 30 seconds for live updates
    const interval = setInterval(loadForecast, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-hospital-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium">Crunching capacity data...</p>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="p-10 flex flex-col items-center gap-4">
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 max-w-xl w-full">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{error || 'Unknown error'}</p>
            <button onClick={loadForecast} className="text-xs underline mt-1">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  // Backend returns: totalBeds, currentOccupied, expectedOccupancy, dischargesNext4h, incomingPatients, capacityPercentage
  const currentPct = forecast.totalBeds
    ? Math.round((forecast.currentOccupied / forecast.totalBeds) * 100)
    : 0;
  const expectedPct = parseFloat(forecast.capacityPercentage) || 0;

  // Generate hourly chart from current & expected data
  const chartData = [
    { time: 'Now',    load: currentPct },
    { time: '+1h',    load: Math.min(100, currentPct + Math.round(forecast.incomingPatients * 5)) },
    { time: '+2h',    load: Math.min(100, Math.round(expectedPct * 0.9)) },
    { time: '+4h',    load: Math.min(100, Math.round(expectedPct)) },
    { time: '+6h',    load: Math.max(0, Math.round(expectedPct - forecast.dischargesNext4h * 5)) },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 leading-tight">Capacity Analytics</h1>
          <p className="text-slate-500 mt-2">Predictive analytics for hospital-wide bed occupancy.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadForecast}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:bg-slate-50 shadow-sm text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="px-5 py-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Predictive Mode: Active</span>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Occupancy Card */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-slate-100 shadow-lg relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Hospital-wide occupancy
                </h3>
                <div className="flex items-end gap-3">
                  <p className="text-7xl font-black text-slate-900">{currentPct}%</p>
                  <div className={`flex items-center font-bold mb-3 ${currentPct > 80 ? 'text-red-500' : 'text-emerald-600'}`}>
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    <span>{currentPct > 80 ? 'High Load' : 'Optimal'}</span>
                  </div>
                </div>
                <p className="text-slate-500 text-sm mt-1">
                  {forecast.currentOccupied} of {forecast.totalBeds} beds occupied
                </p>
              </div>
              <div className="p-4 bg-hospital-50 rounded-2xl text-hospital-600 group-hover:bg-hospital-500 group-hover:text-white transition-all duration-500">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <p className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${expectedPct > 90 ? 'text-red-500' : 'text-slate-400'}`} />
                  {expectedPct > 90 ? 'Critical Load Expected' : 'Optimal Capacity Analytics'}
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {expectedPct}% <span className="text-sm text-slate-400 font-normal">in 4h</span>
                </p>
              </div>

              <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${currentPct}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${barColor(currentPct)}`}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                <span>0% Empty</span><span>50%</span><span>100% Full</span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-hospital-100/50 rounded-full blur-[100px] -mr-32 -mt-32" />
        </div>

        {/* Side Cards */}
        <div className="flex flex-col gap-6">
          <div className="flex-1 bg-hospital-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
            <h4 className="text-xs font-bold text-hospital-300 uppercase tracking-widest mb-4">Discharge Pipeline</h4>
            <p className="text-5xl font-black text-white mb-2">{forecast.dischargesNext4h}</p>
            <p className="text-hospital-300 text-sm font-medium mb-2">discharges expected in next 4h</p>
            <p className="text-hospital-400 text-xs">
              {forecast.incomingPatients} incoming from queue
            </p>
            <div className="absolute top-4 right-4 text-hospital-700 group-hover:text-hospital-300 transition-colors">
              <Info className="w-6 h-6" />
            </div>
          </div>

          <div className="flex-1 bg-white border border-slate-100 rounded-[32px] p-8 shadow-lg group">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Patient Flow</h4>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 transition-colors duration-500 group-hover:bg-emerald-500 group-hover:text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">
                  {forecast.incomingPatients > 0 ? 'Queue Active' : 'Queue Clear'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {forecast.incomingPatients} patient{forecast.incomingPatients !== 1 ? 's' : ''} currently in waiting queue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Load Chart */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 ml-1">
        Projected Load Distribution
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {chartData.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col items-center shadow-sm hover:shadow-lg transition-all group"
          >
            <span className="text-xs font-bold text-slate-400 mb-4">{item.time}</span>
            <div className="w-full flex items-end justify-center gap-1.5 h-20 mb-4 overflow-hidden relative">
              <div className="w-full bg-slate-100 rounded-t-lg h-full absolute top-0 left-0 opacity-20" />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${item.load}%` }}
                transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                className={`w-10 rounded-t-lg ${barColor(item.load)}`}
              />
            </div>
            <span className={`text-xl font-black ${item.load > 90 ? 'text-red-500' : 'text-slate-800'}`}>
              {item.load}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ForecastPage;
