import React, { useState, useEffect, useContext } from 'react';
import { 
  Users, 
  Bed, 
  Plus, 
  Clock, 
  Stethoscope,
  Activity,
  Calendar,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchBeds, fetchPatientDetails, dischargePatient, admitPatient, updateBedStatus } from '../services/api';
import { SocketContext, GlobalContext } from '../App';

// ─────────────────────────────────────────────
//  Bed Tile
// ─────────────────────────────────────────────
const BedTile = ({ bed, onClick }) => {
  const getStatusStyles = (status) => {
    switch (status) {
      case 'available': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'occupied':  return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'cleaning':  return 'border-amber-200 bg-amber-50 text-amber-700';
      default:          return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  };

  const getBadgeColor = (status) => {
    switch (status) {
      case 'available': return 'bg-emerald-500';
      case 'occupied':  return 'bg-rose-500';
      case 'cleaning':  return 'bg-amber-500';
      default:          return 'bg-slate-500';
    }
  };

  // patientId is populated by the backend – could be a full object or null
  const patientName = bed.patientId?.name || null;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={() => onClick(bed)}
      className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer shadow-sm group ${getStatusStyles(bed.status)}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">
            BED #{bed.bedNumber}
          </span>
          <h3 className="text-xl font-bold truncate max-w-[150px]">
            {bed.status === 'available' ? 'Vacant' : (patientName || 'Occupied')}
          </h3>
          <p className="text-sm opacity-70">{bed.ward}</p>
        </div>
        <div className={`badge ${getBadgeColor(bed.status)} text-white`}>
          {bed.status}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-black/5">
        <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center">
          {bed.status === 'occupied' ? <Activity className="w-4 h-4" /> : <Bed className="w-4 h-4" />}
        </div>
        <span className="text-xs font-medium opacity-80">
          {bed.status === 'occupied' ? 'Monitoring Active' : (bed.status === 'cleaning' ? 'ETA 10m' : 'Ready')}
        </span>
        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
          {bed.status === 'available'
            ? <Plus className="w-5 h-5" />
            : <ChevronRight className="w-5 h-5" />}
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
//  Quick Admit Modal
// ─────────────────────────────────────────────
const AdmitModal = ({ isOpen, onClose, onAdmitted }) => {
  const [form, setForm] = useState({ name: '', age: '', condition: '', doctor: '', surgeryType: '', rehabType: 'none' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.condition) return setError('Name and condition are required.');
    setLoading(true);
    setError('');
    try {
      const res = await admitPatient({ ...form, age: parseInt(form.age) || 0 });
      onAdmitted(res.data);
      setForm({ name: '', age: '', condition: '', doctor: '', surgeryType: '', rehabType: 'none' });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to admit patient.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Admit Patient</h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Full Name *</label>
                    <input
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Age</label>
                    <input
                      type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                      value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="45"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Condition *</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                    value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} placeholder="Acute Ischemic Stroke"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Doctor</label>
                    <input
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                      value={form.doctor} onChange={e => setForm({ ...form, doctor: e.target.value })} placeholder="Dr. Helena Vance"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Surgery Type</label>
                    <input
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                      value={form.surgeryType} onChange={e => setForm({ ...form, surgeryType: e.target.value })} placeholder="Craniotomy"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Rehab Type</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-400"
                    value={form.rehabType} onChange={e => setForm({ ...form, rehabType: e.target.value })}
                  >
                    <option value="none">None</option>
                    <option value="optional">Optional</option>
                    <option value="mandatory">Mandatory</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-hospital-500 hover:bg-hospital-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Admitting...</> : 'Confirm Admission'}
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
//  Patient Side Panel
// ─────────────────────────────────────────────
const PatientSidePanel = ({ bed, isOpen, onClose, onDischarge, onMakeAvailable, onMakeCleaning, onMakeOccupied }) => {
  const { bedHistory } = useContext(GlobalContext);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDischarge, setConfirmingDischarge] = useState(false);

  // Reset confirmation state when panel opens/closes or bed changes
  useEffect(() => {
    setConfirmingDischarge(false);
  }, [isOpen, bed]);

  useEffect(() => {
    if (isOpen && bed) {
      if ((bed.status === 'occupied' || bed.status === 'cleaning') && bed.patientId) {
        setLoading(true);
        setError('');
        // patientId may be a populated object (has ._id) or just a string id
        const pid = bed.patientId?._id || bed.patientId;
        fetchPatientDetails(pid)
          .then(res => {
            setPatient(res.data);
            setLoading(false);
          })
          .catch(err => {
            setError('Could not load patient records.');
            setLoading(false);
          });
      } else {
        setPatient(null);
        setLoading(false);
        setError('');
      }
    } else {
      setPatient(null);
    }
  }, [isOpen, bed]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Patient Details</h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-10 h-10 border-4 border-hospital-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-slate-400">Fetching records...</p>
                </div>
              ) : error ? (
                <div className="p-6 bg-red-50 rounded-2xl text-red-600 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                </div>
              ) : patient ? (
                <div className="flex flex-col h-full bg-white">
                  <div className="space-y-8 flex-1">
                    <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl">
                      <div className="w-20 h-20 bg-hospital-100 rounded-2xl flex items-center justify-center text-hospital-600">
                        <Users className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">{patient.name}</h3>
                        <p className="text-slate-500">
                          Bed #{bed.bedNumber} • {patient.age ? `Age ${patient.age}` : '—'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Clinical Status</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">{patient.rehabType || 'No Rehab'}</span>
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold capitalize">{patient.status}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Condition</h5>
                        <p className="text-sm font-bold text-slate-700 leading-tight">{patient.condition || '—'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Admitted</h5>
                        <p className="text-sm font-bold text-slate-700 leading-tight">
                          {patient.admissionDate ? new Date(patient.admissionDate).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>

                    {patient.doctor && (
                      <div className="p-6 bg-slate-50 rounded-3xl">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Medical Team</h4>
                        <div className="flex items-center gap-4">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(patient.doctor)}&background=1e293b&color=fff`}
                            className="w-10 h-10 rounded-xl" alt="Doctor"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-800">{patient.doctor}</p>
                            <p className="text-xs text-slate-500">Attending Physician</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Extended Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Admission Date</p>
                        <p className="font-semibold text-slate-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{new Date(patient.admissionDate).toLocaleDateString()}</p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Surgery / Rehab</p>
                        <p className="font-semibold text-slate-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis" title={patient.surgeryType || patient.rehabType}>{patient.surgeryType || patient.rehabType || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Rehab Progress */}
                    {(patient.rehabProgress > 0 || patient.rehabType !== 'none') && (
                      <div className="mt-6 space-y-2 mb-8">
                         <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                           <span className="text-slate-500">Rehab Progress</span>
                           <span className="text-hospital-500">{patient.rehabProgress || 0}%</span>
                         </div>
                         <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-hospital-500 rounded-full" style={{ width: `${patient.rehabProgress || 0}%` }} />
                         </div>
                      </div>
                    )}
                  </div>

                  {/* Sticky Action Footer */}
                  <div className="pt-6 mt-6 border-t border-slate-100 pb-2">
                    {bed.status === 'cleaning' ? (
                      <div className="space-y-3">
                        <button onClick={() => onMakeOccupied(bed._id, patient._id)} className="w-full py-3 bg-hospital-50 text-hospital-600 font-bold hover:bg-hospital-100 rounded-2xl hover:shadow-sm border border-hospital-100 transition-all text-sm">
                          Finish Cleaning (Patient Returned)
                        </button>
                        <button onClick={() => onMakeAvailable(bed._id)} className="w-full py-3 bg-emerald-50 text-emerald-600 font-bold hover:bg-emerald-100 rounded-2xl hover:shadow-sm border border-emerald-100 transition-all text-sm">
                          Finish Cleaning (Mark Vacant)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button
                          onClick={() => onMakeCleaning(bed._id)}
                          className="w-full py-3.5 text-amber-600 font-bold hover:bg-amber-50 rounded-2xl transition-colors border border-amber-100 text-sm"
                        >
                          Mark bed as Cleaning
                        </button>

                        {confirmingDischarge ? (
                          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 animate-in fade-in slide-in-from-top-2">
                            <p className="text-sm font-bold text-rose-800 text-center mb-3">Confirm Patient Discharge?</p>
                            <div className="flex gap-2">
                              <button onClick={() => setConfirmingDischarge(false)} className="flex-1 py-2 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-sm">Cancel</button>
                              <button onClick={() => onDischarge(patient._id)} className="flex-1 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 text-sm shadow-sm border border-rose-600">Discharge</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingDischarge(true)}
                            className="w-full py-3.5 text-rose-600 font-bold hover:bg-rose-50 rounded-2xl transition-colors border border-rose-100 text-sm"
                          >
                            Request Discharge Review
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : bed?.status === 'cleaning' ? (
                <div className="text-center p-12 bg-amber-50 border border-amber-100 rounded-3xl shadow-inner">
                   <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                   <h3 className="text-2xl font-black text-amber-700 tracking-tight mb-2">Bed in Cleaning</h3>
                   <p className="text-amber-600 font-medium mb-1">
                     Cleaning started at: {bed.cleaningStartTime ? new Date(bed.cleaningStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                   </p>
                   {bed.cleaningStartTime && (Date.now() - new Date(bed.cleaningStartTime).getTime() > 30 * 60 * 1000) && (
                     <div className="mt-4 mb-2 p-3 bg-red-100 rounded-xl text-red-600 font-bold flex items-center justify-center gap-2 text-sm">
                       <AlertCircle className="w-4 h-4" /> 30 minutes exceeded!
                     </div>
                   )}
                   <button 
                     onClick={() => onMakeAvailable(bed._id)} 
                     className="mt-8 px-6 py-3 bg-white text-emerald-600 font-bold rounded-xl shadow-sm hover:shadow-lg transition-all border border-emerald-100"
                   >
                     Mark as Available
                   </button>
                </div>
              ) : (
                <div className="text-center p-12 bg-slate-50 rounded-3xl">
                  <Bed className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-6">Select an occupied bed to view patient details.</p>
                  {bed?.status === 'available' && (
                    <button onClick={() => onMakeCleaning(bed._id)} className="w-full py-3.5 text-amber-600 font-bold hover:bg-amber-50 rounded-2xl transition-colors border border-amber-100 text-sm">
                       Mark as Cleaning
                    </button>
                  )}
                </div>
              )}

              {/* Bed History Persistent Log */}
              {!loading && !error && bed && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Bed #{bed.bedNumber} History
                  </h4>
                  {bedHistory[bed._id] && bedHistory[bed._id].length > 0 ? (
                    <div className="space-y-3">
                      {bedHistory[bed._id].map((h) => (
                        <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-sm font-semibold text-slate-700">{h.action}</p>
                          <p className="text-xs text-slate-400 font-medium shrink-0">
                            {new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-sm text-slate-400 font-medium">No recent activity logged.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────
//  Dashboard
// ─────────────────────────────────────────────
const Dashboard = () => {
  const socket = useContext(SocketContext);
  const { searchQuery, isAdmitOpen, setIsAdmitOpen } = useContext(GlobalContext);
  const [beds, setBeds] = useState([]);
  const [selectedBed, setSelectedBed] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBeds = () => {
    setLoading(true);
    fetchBeds()
      .then(res => {
        setBeds(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not connect to backend. Make sure the server is running.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadBeds();
  }, []);

  // Real-time: update a single bed when "bedUpdated" fires from backend
  useEffect(() => {
    if (!socket) return;
    const handler = (updatedBed) => {
      setBeds(prev =>
        prev.map(b => (b._id === updatedBed._id ? { ...b, ...updatedBed } : b))
      );
    };
    socket.on('bedUpdated', handler);
    return () => socket.off('bedUpdated', handler);
  }, [socket]);

  const handleBedClick = (bed) => {
    setSelectedBed(bed);
    setIsPanelOpen(true);
  };

  // Action Handlers
  const handleDischarge = async (patientId) => {
    try {
      await dischargePatient(patientId);
      setIsPanelOpen(false);
      loadBeds();
    } catch (err) {
      setError(err.response?.data?.error || 'Discharge failed.');
    }
  };

  const handleMakeCleaning = async (bedId) => {
    try {
      await updateBedStatus(bedId, { status: 'cleaning' });
      setIsPanelOpen(false);
      loadBeds();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update bed to cleaning.');
    }
  };

  const handleMakeAvailable = async (bedId) => {
    try {
      await updateBedStatus(bedId, { status: 'available' });
      setIsPanelOpen(false);
      loadBeds();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update bed to available.');
    }
  };

  const handleMakeOccupied = async (bedId, patientId) => {
    try {
      await updateBedStatus(bedId, { status: 'occupied', patientId });
      setIsPanelOpen(false);
      loadBeds();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark occupied.');
    }
  };

  const handleAdmitted = () => {
    loadBeds();
  };

  // Summary stats from live bed data
  const totalBeds  = beds.length;
  const occupied   = beds.filter(b => b.status === 'occupied').length;
  const available  = beds.filter(b => b.status === 'available').length;
  const cleaning   = beds.filter(b => b.status === 'cleaning').length;

  const filteredBeds = (searchQuery || '').trim().length > 0 
    ? beds.filter(b => b.bedNumber.toString().includes(searchQuery.trim())) 
    : beds;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Ward Dashboard</h1>
          <p className="text-slate-500">Monitoring real-time occupancy across all wards.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBeds}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl text-slate-500 hover:bg-slate-50 shadow-sm text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{error}</p>
            <button onClick={loadBeds} className="text-xs underline mt-0.5">Try again</button>
          </div>
        </div>
      )}

      {/* Ward Info Card — live stats */}
      <div className="bg-hospital-900 rounded-3xl p-8 mb-10 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <p className="text-xs font-bold text-hospital-300 uppercase tracking-widest mb-2">Live Ward Overview</p>
          <h2 className="text-4xl font-bold mb-6">All Wards</h2>
          <div className="flex flex-wrap gap-10">
            <div>
              <p className="text-5xl font-bold">{totalBeds}</p>
              <p className="text-hospital-300 text-sm font-medium">Total Beds</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-rose-400">{occupied}</p>
              <p className="text-hospital-300 text-sm font-medium">Occupied</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-emerald-400">{available}</p>
              <p className="text-hospital-300 text-sm font-medium">Available</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-amber-400">{cleaning}</p>
              <p className="text-hospital-300 text-sm font-medium">Cleaning</p>
            </div>
            <div className="ml-auto flex items-center gap-4 self-end">
              <button
                onClick={() => setIsAdmitOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-colors border border-white/10"
              >
                <Plus className="w-4 h-4" /> Admit Patient
              </button>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-hospital-500 rounded-full blur-[100px] opacity-20" />
      </div>

      {/* Beds Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[180px] bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBeds.map(bed => (
            <BedTile key={bed._id} bed={bed} onClick={handleBedClick} />
          ))}
          {/* Provision bed placeholder */}
          <div
            onClick={() => setIsAdmitOpen(true)}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-300 h-[180px] cursor-pointer hover:border-hospital-300 hover:text-hospital-400 transition-colors"
          >
            <Plus className="w-8 h-8 mb-2" />
            <span className="text-xs font-bold uppercase tracking-widest">Quick Admit</span>
          </div>
        </div>
      )}

      {/* Patient Side Panel */}
      <PatientSidePanel
        bed={selectedBed}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onDischarge={handleDischarge}
        onMakeAvailable={handleMakeAvailable}
        onMakeCleaning={handleMakeCleaning}
        onMakeOccupied={handleMakeOccupied}
      />

      {/* Admit Modal */}
      <AdmitModal
        isOpen={isAdmitOpen}
        onClose={() => setIsAdmitOpen(false)}
        onAdmitted={handleAdmitted}
      />
    </div>
  );
};

export default Dashboard;

// Inline chevron icon
const ChevronRight = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
