import React, { useState, useEffect, useContext } from 'react';
import { 
  Users, 
  Clock, 
  AlertCircle, 
  ArrowUpRight,
  Filter,
  ChevronRight,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchQueue, addToQueue, admitPatient } from '../services/api';
import { SocketContext } from '../App';

// ─────────────────────────────────────────────
//  Queue Item Row
// ─────────────────────────────────────────────
const QueueItem = ({ entry, index }) => {
  const priority = entry.priority?.toLowerCase() || 'low';
  const patient = entry.patientId; // populated by backend

  const getPriorityStyles = (p) => {
    switch (p) {
      case 'high':   return 'border-red-200 bg-red-50 text-red-700';
      case 'medium': return 'border-orange-200 bg-orange-50 text-orange-700';
      default:       return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'high':   return 'bg-red-600 text-white';
      case 'medium': return 'bg-orange-500 text-white';
      default:       return 'bg-slate-400 text-white';
    }
  };

  const priorityLabel = { high: 'Priority 1', medium: 'Priority 2', low: 'Priority 3' };

  // Wait time: diff between now and createdAt/scheduledTime
  const getWaitInfo = () => {
    const timeRef = entry.createdAt || entry.scheduledTime;
    if (!timeRef) return { text: '—', colorClass: 'text-slate-600' };
    const diff = Date.now() - new Date(timeRef).getTime();
    const mins = Math.max(0, Math.floor(diff / 60000));
    
    let colorClass = 'text-slate-600';
    if (mins >= 60) {
      colorClass = 'text-red-600 font-black';
    } else if (mins >= 30) {
      colorClass = 'text-yellow-600 font-bold';
    } else {
      colorClass = priority === 'high' ? 'text-red-600 font-bold' : 'text-slate-600 font-bold';
    }

    return { text: `Waiting: ${mins} minutes`, colorClass };
  };
  
  const waitInfo = getWaitInfo();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05 }}
      className="group flex items-center p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-lg transition-all cursor-pointer"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-6 ${getPriorityStyles(priority)}`}>
        {priority === 'high' ? <AlertCircle className="w-5 h-5" /> : <Users className="w-5 h-5" />}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Patient Name</p>
          <h3 className="text-lg font-bold text-slate-800">{patient?.name || 'Unknown Patient'}</h3>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Condition</p>
          <p className="text-sm font-medium text-slate-600 truncate pr-4">{patient?.condition || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Time in Queue</p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className={`text-sm ${waitInfo.colorClass} bg-transparent px-1 rounded`}>
              {waitInfo.text}
            </span>
            <span className="text-[10px] text-slate-400 font-medium ml-1 uppercase tracking-tighter">
              {priority === 'high' ? 'CRITICAL' : (priority === 'medium' ? 'STABLE' : 'ROUTINE')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <span className={`badge ${getPriorityBadge(priority)} capitalize`}>
          {priorityLabel[priority] || priority}
        </span>
        <div className="hidden sm:flex p-2 hover:bg-slate-50 rounded-lg text-slate-300 group-hover:text-hospital-500 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
//  Add-to-Queue Modal
// ─────────────────────────────────────────────
const AddPatientModal = ({ isOpen, onClose, onAdded }) => {
  const [tab, setTab] = useState('admit'); // 'admit' = new patient, 'queue' = existing
  const [form, setForm] = useState({ name: '', age: '', condition: '', doctor: '', priority: 'medium', type: 'scheduled' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.condition) return setError('Name and condition are required.');
    setLoading(true);
    setError('');
    try {
      // Admit the patient first (backend auto-adds to queue if no bed using passed priority/type)
      await admitPatient({ 
        name: form.name, 
        age: parseInt(form.age) || 0, 
        condition: form.condition, 
        doctor: form.doctor, 
        rehabType: 'none',
        priority: form.priority,
        type: form.type
      });
      onAdded();
      onClose();
      setForm({ name: '', age: '', condition: '', doctor: '', priority: 'medium', type: 'scheduled' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add patient.');
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
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Add to Queue</h2>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Full Name *</label>
                    <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Age</label>
                    <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                      value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="45" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Condition *</label>
                  <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                    value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} placeholder="Acute Ischemic Stroke" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Doctor</label>
                  <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                    value={form.doctor} onChange={e => setForm({ ...form, doctor: e.target.value })} placeholder="Dr. Helena Vance" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Queue Priority</label>
                    <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-hospital-400 bg-white"
                      value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      <option value="high">High (Priority 1)</option>
                      <option value="medium">Medium (Priority 2)</option>
                      <option value="low">Low (Routine)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Admission Type</label>
                    <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-hospital-400 bg-white"
                      value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="emergency">Emergency</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-hospital-500 hover:bg-hospital-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</> : 'Add Patient'}
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
//  Queue Page
// ─────────────────────────────────────────────
const QueuePage = () => {
  const socket = useContext(SocketContext);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);

  const loadQueue = () => {
    setLoading(true);
    fetchQueue()
      .then(res => {
        setQueue(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load queue. Check backend connection.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Real-time: refresh queue list when backend emits "queueUpdated"
  useEffect(() => {
    if (!socket) return;
    const handler = (updatedQueue) => {
      // Backend may send the full queue array or just a signal
      if (Array.isArray(updatedQueue)) {
        setQueue(updatedQueue);
      } else {
        loadQueue();
      }
    };
    socket.on('queueUpdated', handler);
    return () => socket.off('queueUpdated', handler);
  }, [socket]);

  // Derived stats
  const highPriority = queue.filter(q => q.priority === 'high').length;
  const total = queue.length;

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-bold text-hospital-600 uppercase tracking-widest">Active Waiting List</p>
            <div className="w-1.5 h-1.5 bg-hospital-500 rounded-full animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">Queue Management</h1>
          <p className="text-slate-500 mt-2">Real-time patient triage sorted by medical priority and wait-time.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={loadQueue}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 transition-colors shadow-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-hospital-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg">
            <Plus className="w-4 h-4" /> Add Patient
          </button>
        </div>
      </div>

      {/* Stats Cards — live counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl relative overflow-hidden">
          <h4 className="text-rose-600 font-bold text-sm uppercase tracking-wider mb-4">Total Waiting</h4>
          <p className="text-4xl font-black text-rose-900">{total < 10 ? String(total).padStart(2, '0') : total}</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-600/10 rounded-full blur-2xl" />
        </div>
        <div className="p-6 bg-hospital-900 border border-transparent rounded-3xl relative overflow-hidden">
          <h4 className="text-hospital-300 font-bold text-sm uppercase tracking-wider mb-4">Types</h4>
          <div className="flex gap-4">
            <div>
              <p className="text-4xl font-black text-white">{queue.filter(q => q.type === 'emergency').length}</p>
              <p className="text-hospital-400 text-xs font-bold uppercase mt-1">Emergency</p>
            </div>
            <div>
              <p className="text-4xl font-black text-hospital-300">{queue.filter(q => q.type === 'scheduled').length}</p>
              <p className="text-hospital-400 text-xs font-bold uppercase mt-1">Scheduled</p>
            </div>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-hospital-500/20 rounded-full blur-2xl" />
        </div>
        <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl relative overflow-hidden">
          <h4 className="text-amber-600 font-bold text-sm uppercase tracking-wider mb-4">High Priority</h4>
          <p className="text-4xl font-black text-amber-900">{highPriority < 10 ? String(highPriority).padStart(2, '0') : highPriority}</p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-600/10 rounded-full blur-2xl" />
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-6 pb-2 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Queue List</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sort by: Priority → Time</span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />
          ))
        ) : queue.length === 0 ? (
          <div className="p-16 text-center bg-slate-50 rounded-3xl">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No patients currently in queue.</p>
          </div>
        ) : (
          <AnimatePresence>
            {queue.map((entry, index) => (
              <QueueItem key={entry._id} entry={entry} index={index} />
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="mt-12 p-8 bg-slate-100/50 rounded-[40px] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-100 mb-6 shadow-sm">
          <ArrowUpRight className="w-8 h-8 text-hospital-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Capacity Reached?</h3>
        <p className="text-slate-500 max-w-sm mb-8">
          Redirect patients to Surgical A or Cardiology wards if ICU wait time exceeds 30 minutes for medium priority.
        </p>
        <button 
          onClick={() => setShowProtocol(!showProtocol)}
          className="px-8 py-3 bg-white border border-slate-200 text-slate-800 rounded-2xl font-bold hover:shadow-lg hover:border-red-500 hover:text-red-600 transition-all z-10"
        >
          {showProtocol ? 'Hide Protocols' : 'View Hospital Overload Protocols'}
        </button>

        <AnimatePresence>
          {showProtocol && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="w-full max-w-lg overflow-hidden"
            >
              <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-left shadow-inner">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                     <h4 className="text-xl font-black text-red-700">OVERLOAD PROTOCOL</h4>
                     <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Global Action Required</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-4">
                     <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-red-600 font-bold flex items-center justify-center border border-red-100 shadow-sm">1</span>
                     <p className="text-red-900 font-medium text-sm pt-1">Diverting non-critical ambulances to sister facilities.</p>
                  </div>
                  <div className="flex gap-4">
                     <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-red-600 font-bold flex items-center justify-center border border-red-100 shadow-sm">2</span>
                     <p className="text-red-900 font-medium text-sm pt-1">Expediting discharge reviews for stable ICU patients.</p>
                  </div>
                  <div className="flex gap-4">
                     <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-red-600 font-bold flex items-center justify-center border border-red-100 shadow-sm">3</span>
                     <p className="text-red-900 font-medium text-sm pt-1">Opening temporary overflow corridor in Surgical A.</p>
                  </div>
                  <div className="flex gap-4">
                     <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-red-600 font-bold flex items-center justify-center border border-red-100 shadow-sm">4</span>
                     <p className="text-red-900 font-medium text-sm pt-1">Notifying all on-call staff via SMS overrides.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddPatientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAdded={loadQueue} />
    </div>
  );
};

export default QueuePage;
