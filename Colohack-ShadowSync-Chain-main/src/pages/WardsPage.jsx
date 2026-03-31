import React, { useState, useEffect } from 'react';
import {
  Building2,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  LayoutGrid,
  Plus,
  RefreshCw,
  FileDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { fetchWards, addBed } from '../services/api';

// ─────────────────────────────────────────────
//  Ward Card
// ─────────────────────────────────────────────
const WardCard = ({ ward, index }) => {
  // Backend returns: name, totalBeds, occupiedBeds, availableBeds, cleaningBeds, percentage
  const occupancyPct = Math.round(ward.percentage || 0);
  const isHighOccupancy = occupancyPct > 90;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`group relative bg-white rounded-[40px] p-8 border ${
        isHighOccupancy ? 'border-red-100' : 'border-slate-100 shadow-lg'
      } overflow-hidden h-full cursor-pointer hover:border-hospital-400 transition-all`}
    >
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className={`p-4 rounded-2xl ${isHighOccupancy ? 'bg-red-50 text-red-600' : 'bg-hospital-50 text-hospital-500'}`}>
          <Building2 className="w-8 h-8" />
        </div>
        <div className="flex -space-x-3">
          {[...Array(Math.min(ward.occupiedBeds, 4))].map((_, i) => (
            <img
              key={i}
              src={`https://ui-avatars.com/api/?name=P+${i + 1}&background=f1f5f9&color=cbd5e1`}
              className="w-8 h-8 rounded-full border-2 border-white"
              alt="Patient"
            />
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{ward.name}</h3>
          {isHighOccupancy && <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />}
        </div>
        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-10">Active Clinical Ward</p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="p-4 bg-rose-50 rounded-3xl">
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1 leading-none">Occupied</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-700">{ward.occupiedBeds}</span>
              <span className="text-sm font-bold text-rose-400">/ {ward.totalBeds}</span>
            </div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-3xl">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 leading-none">Free</p>
            <span className="text-2xl font-black text-emerald-700">{ward.availableBeds}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-3xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Load</p>
            <p className={`text-2xl font-black ${isHighOccupancy ? 'text-red-500' : 'text-slate-800'}`}>
              {occupancyPct}%
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${occupancyPct}%` }}
              transition={{ duration: 1.2, delay: 0.5 + index * 0.1 }}
              className={`h-full rounded-full ${isHighOccupancy ? 'bg-red-500' : 'bg-hospital-500'}`}
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
            Ward Occupancy Distribution
          </p>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between group-hover:bg-hospital-50 transition-all rounded-b-[40px] -mx-8 -mb-8 px-8">
        <span className="text-sm font-bold text-slate-600 transition-colors group-hover:text-hospital-600">Open Dashboard</span>
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 transition-all group-hover:bg-hospital-500 group-hover:text-white group-hover:rotate-[-45deg]">
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>

      {/* Decorative blur */}
      <div className={`absolute -top-10 -right-10 w-48 h-48 ${isHighOccupancy ? 'bg-red-400' : 'bg-hospital-200'} rounded-full blur-[80px] opacity-10`} />
    </motion.div>
  );
};

// ─────────────────────────────────────────────
//  Add Bed Modal
// ─────────────────────────────────────────────
const AddBedModal = ({ isOpen, onClose, onAdded }) => {
  const [form, setForm] = useState({ bedNumber: '', ward: '', status: 'available' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bedNumber || !form.ward) return setError('Bed Number and Ward are required.');
    setLoading(true);
    setError('');
    try {
      await addBed({ ...form, bedNumber: parseInt(form.bedNumber) || form.bedNumber });
      onAdded();
      setForm({ bedNumber: '', ward: '', status: 'available' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to add bed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Add New Bed</h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Bed Number *</label>
                  <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                    value={form.bedNumber} onChange={e => setForm({ ...form, bedNumber: e.target.value })} placeholder="101" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Ward *</label>
                  <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                    value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })} placeholder="ICU" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-hospital-500 hover:bg-hospital-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Adding...</> : 'Add Bed'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────
//  Wards Page
// ─────────────────────────────────────────────
const WardsPage = () => {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isAddBedOpen, setIsAddBedOpen] = useState(false);

  const handleGeneratePDF = () => {
    setGenerating(true);
    const element = document.getElementById('ward-report');
    const opt = {
      margin: 0.5,
      filename: `WardWatch_System_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save().then(() => {
      setGenerating(false);
    });
  };

  const loadWards = () => {
    setLoading(true);
    setError('');
    fetchWards()
      .then(res => {
        setWards(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load wards. Is the backend running?');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadWards();
  }, []);

  // Global summary computed from ward data
  const totalBeds     = wards.reduce((s, w) => s + (w.totalBeds || 0), 0);
  const totalOccupied = wards.reduce((s, w) => s + (w.occupiedBeds || 0), 0);
  const globalPct     = totalBeds ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  // Utilize QuickChart API for visual PDF chart
  const chartConfig = {
    type: 'bar',
    data: {
      labels: wards.map(w => w.name),
      datasets: [
        { label: 'Occupied', data: wards.map(w => w.occupiedBeds), backgroundColor: '#e11d48' },
        { label: 'Available', data: wards.map(w => w.availableBeds), backgroundColor: '#10b981' }
      ]
    },
    options: {
      plugins: {
        title: { display: true, text: 'System Capacity Load across Wards', font: { size: 16 } }
      }
    }
  };
  const chartUrl = `https://quickchart.io/chart?w=700&h=350&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div id="ward-report" className="bg-transparent pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold text-hospital-600 uppercase tracking-widest">Multi-Ward Overview</p>
            <div className="w-2 h-2 bg-hospital-500 rounded-full" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Active Wards</h1>
          <p className="text-slate-500 mt-2 text-lg">System-wide monitoring across all clinical wards.</p>
        </div>

        <div className="flex items-center gap-3" data-html2canvas-ignore>
          <button onClick={() => setIsAddBedOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-hospital-600 hover:bg-hospital-50 shadow-sm text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Add Bed
          </button>
          <button onClick={loadWards}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:bg-slate-50 shadow-sm text-sm font-bold transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button 
            onClick={handleGeneratePDF}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-3 bg-hospital-900 border border-hospital-900 text-white rounded-2xl hover:bg-black shadow-lg shadow-hospital-500/20 text-sm font-bold transition-all disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" /> 
            {generating ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{error}</p>
            <button onClick={loadWards} className="text-xs underline mt-0.5">Try again</button>
          </div>
        </div>
      )}

      {/* Global Capacity Banner — live data */}
      <div className="bg-hospital-900 rounded-[40px] p-12 mb-12 text-white overflow-hidden relative group">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="max-w-md">
            <h2 className="text-4xl font-black mb-4 leading-tight tracking-tight">System Global Capacity</h2>
            <p className="text-hospital-300 font-medium text-lg leading-relaxed">
              Real-time aggregation of all active wards.
              {globalPct > 85
                ? <span className="text-white font-bold mx-1"> High load detected — alert mode active.</span>
                : <span className="text-white font-bold mx-1"> Patient flow is stable.</span>
              }
            </p>
            <div className="mt-6 flex gap-8">
              <div>
                <p className="text-2xl font-black">{totalBeds}</p>
                <p className="text-hospital-400 text-xs font-bold uppercase">Total Beds</p>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-400">{totalOccupied}</p>
                <p className="text-hospital-400 text-xs font-bold uppercase">Occupied</p>
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-400">{totalBeds - totalOccupied}</p>
                <p className="text-hospital-400 text-xs font-bold uppercase">Available</p>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-4 md:text-right">
            <div className="flex flex-col items-end">
              <p className="text-8xl font-black text-white leading-none">{globalPct}%</p>
              <p className="text-hospital-300 font-bold uppercase tracking-widest text-sm mt-2">Total Occupancy</p>
            </div>
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center p-5 text-hospital-400 group-hover:scale-110 transition-transform duration-500">
              <TrendingUp className="w-full h-full" />
            </div>
          </div>
        </div>
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      {/* Analytical QuickChart API Data Visualization */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs font-bold text-hospital-600 uppercase tracking-widest">Global Allocation Model</p>
          <div className="w-2 h-2 bg-hospital-500 rounded-full" />
        </div>
        <img src={chartUrl} alt="Ward Capacity Chart" className="w-full h-auto max-h-[400px] object-contain rounded-3xl border border-slate-200 shadow-md bg-white p-4" crossOrigin="anonymous" />
      </div>

      {/* Wards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-80 bg-slate-100 rounded-[40px] animate-pulse" />
          ))
        ) : wards.length === 0 ? (
          <div className="col-span-full p-16 text-center bg-slate-50 rounded-3xl">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No ward data found.</p>
            <p className="text-slate-400 text-sm mt-1">Make sure beds exist in MongoDB with a "ward" field set.</p>
          </div>
        ) : (
          wards.map((ward, index) => (
            <WardCard key={ward.name} ward={ward} index={index} />
          ))
        )}
      </div>
      
      <AddBedModal isOpen={isAddBedOpen} onClose={() => setIsAddBedOpen(false)} onAdded={loadWards} />
      </div>
    </div>
  );
};

export default WardsPage;
