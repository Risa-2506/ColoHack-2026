import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Building2, 
  Menu, 
  X, 
  Bell, 
  Search, 
  UserCircle,
  Stethoscope,
  ChevronRight,
  PlusCircle,
  LogOut,
  AlertTriangle,
  CheckCircle,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

// Pages
import Dashboard from './pages/Dashboard';
import QueuePage from './pages/QueuePage';
import ForecastPage from './pages/ForecastPage';
import WardsPage from './pages/WardsPage';
import LogsPage from './pages/LogsPage';

import { SOCKET_URL } from './services/apiConfig';

import { checkAlerts } from './services/api';

// ─────────────────────────────────────────────
//  Global Contexts
// ─────────────────────────────────────────────
export const SocketContext = createContext(null);
export const GlobalContext = createContext(null);

// ─────────────────────────────────────────────
//  Toast Alert Component
// ─────────────────────────────────────────────
const AlertToast = ({ alerts, onDismiss }) => {
  const severityColor = {
    high: 'bg-red-600',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert._id || alert.id || Math.random()}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex items-start gap-4 p-4"
          >
            <div className={`w-2 self-stretch rounded-full ${severityColor[alert.severity] || 'bg-slate-400'}`} />
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                {alert.type?.replace(/_/g, ' ') || 'Alert'}
              </p>
              <p className="text-sm font-semibold text-slate-800">{alert.message}</p>
            </div>
            <button
              onClick={() => onDismiss(alert._id || alert.id)}
              className="text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, path, active, onClick }) => (
  <Link 
    to={path}
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-hospital-500 text-white shadow-lg shadow-hospital-200' 
        : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400 group-hover:text-hospital-500'}`} />
    <span className="font-medium">{label}</span>
  </Link>
);

// ─────────────────────────────────────────────
//  Admin Layout with real-time socket status
// ─────────────────────────────────────────────
const AdminLayout = ({ children, socketConnected, alertCount }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { searchQuery, setSearchQuery, setIsAdmitOpen } = useContext(GlobalContext);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-hospital-500 rounded-xl flex items-center justify-center">
            <Stethoscope className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">WardWatch</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Clinical Management</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            path="/admin" 
            active={location.pathname === '/admin'} 
          />
          <SidebarItem 
            icon={Users} 
            label="Queue" 
            path="/admin/queue" 
            active={location.pathname === '/admin/queue'} 
          />
          <SidebarItem 
            icon={List} 
            label="Logs" 
            path="/admin/logs" 
            active={location.pathname === '/admin/logs'} 
          />
          <SidebarItem 
            icon={TrendingUp} 
            label="Analytics" 
            path="/admin/analytics" 
            active={location.pathname === '/admin/analytics'} 
          />
          <SidebarItem 
            icon={Building2} 
            label="Wards" 
            path="/admin/wards" 
            active={location.pathname === '/admin/wards'} 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
            <img src="https://ui-avatars.com/api/?name=Aris+Thorne&background=06b6d4&color=fff" alt="User" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">Dr. Aris Thorne</p>
            <p className="text-xs text-slate-500">Chief Resident</p>
          </div>
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <h1 className="text-xl font-bold text-slate-800">WardWatch</h1>
          </div>

          <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-xl w-96">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search by bed number..." 
              className="bg-transparent border-none focus:outline-none text-sm w-full" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-6">
            {/* Real-time socket status indicator */}
            <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
              socketConnected
                ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                : 'text-slate-400 bg-slate-50 border-slate-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              {socketConnected ? 'LIVE' : 'OFFLINE'}
            </div>

            {/* Alert bell */}
            <button className="relative text-slate-400 hover:text-hospital-500 transition-colors">
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsAdmitOpen(true)} className="btn-primary flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              <span>Quick Admit</span>
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          {children}
        </div>
      </main>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Landing Page
// ─────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-hospital-50 to-white p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-hospital-900 mb-2">WardWatch</h1>
        <p className="text-xl text-hospital-600">Clinical Management & Real-Time Monitoring</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin')}
          className="bg-white p-8 rounded-3xl shadow-premium border-2 border-transparent hover:border-hospital-400 cursor-pointer text-center group transition-all"
        >
          <div className="w-20 h-20 bg-hospital-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-hospital-500 transition-colors">
            <Users className="w-10 h-10 text-hospital-600 group-hover:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Staff Portal</h2>
          <p className="text-slate-500 leading-relaxed">Access ward dashboards, patient queue, and capacity analytics.</p>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/patient/portal')}
          className="bg-white p-8 rounded-3xl shadow-premium border-2 border-transparent hover:border-blue-400 cursor-pointer text-center group transition-all"
        >
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500 transition-colors">
            <UserCircle className="w-10 h-10 text-blue-600 group-hover:text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Patient Portal</h2>
          <p className="text-slate-500 leading-relaxed">Check your clinical status, care team, and scheduled rehab sessions.</p>
        </motion.div>
      </div>
      
      <div className="mt-16 text-slate-400 text-sm">
        SDG 3: Good Health & Well-being
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  Main App – Socket.io setup, alert management
// ─────────────────────────────────────────────
function App() {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('logs')) || [];
    } catch {
      return [];
    }
  });
  const [bedHistory, setBedHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bedHistory')) || {};
    } catch {
      return {};
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);

  const addLog = (message) => {
    setLogs(prev => {
      const newLogs = [{ id: Date.now() + Math.random(), message, time: new Date().toISOString() }, ...prev];
      if (newLogs.length > 5) newLogs.pop();
      localStorage.setItem('logs', JSON.stringify(newLogs));
      return newLogs;
    });
  };

  const addBedHistory = (bedId, action) => {
    setBedHistory(prev => {
      const next = { ...prev };
      if (!next[bedId]) next[bedId] = [];
      next[bedId] = [{ action, time: new Date().toISOString(), id: Date.now() + Math.random() }, ...next[bedId]];
      if (next[bedId].length > 3) next[bedId].pop();
      localStorage.setItem('bedHistory', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    // Initialize Socket.io client, pointing at SOCKET_URL from apiConfig.js
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    s.on('connect', () => {
      setSocketConnected(true);
      console.log('[Socket] Connected:', s.id);
    });

    s.on('disconnect', () => {
      setSocketConnected(false);
      console.log('[Socket] Disconnected');
    });

    // Listen for alert events from backend
    s.on('alertCreated', (alert) => {
      console.log('[Socket] alertCreated:', alert);
      setAlerts((prev) => [...prev, { ...alert, _id: alert._id || Date.now() }]);
      addLog(`Alert triggered: ${alert.message}`);
    });

    s.on('bedUpdated', (bed) => {
      let msg = `Bed ${bed.bedNumber} updated to ${bed.status}.`;
      let action = `Marked as ${bed.status}`;
      
      if (bed.status === 'occupied') {
        msg = `Patient admitted to Bed ${bed.bedNumber}.`;
        action = 'Assigned to patient';
      } else if (bed.status === 'available') {
        msg = `Patient discharged from Bed ${bed.bedNumber}.`;
        action = 'Became available';
      } else if (bed.status === 'cleaning') {
        msg = `Bed ${bed.bedNumber} sent to cleaning.`;
        action = 'Sent to cleaning';
      }
      
      addLog(msg);
      addBedHistory(bed._id, action);
    });

    s.on('queueUpdated', () => {
      addLog(`Patient queue was updated.`);
    });

    // Poll backend every 60 seconds to check for "30 min exceeded" alerts, etc.
    const alertInterval = setInterval(() => {
      checkAlerts().catch(() => {});
    }, 60000);
    // run once on startup
    checkAlerts().catch(() => {});

    setSocket(s);
    return () => {
      s.disconnect();
      clearInterval(alertInterval);
    };
  }, []);

  const dismissAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => (a._id || a.id) !== id));
  };

  return (
    <SocketContext.Provider value={socket}>
      <GlobalContext.Provider value={{ searchQuery, setSearchQuery, isAdmitOpen, setIsAdmitOpen, logs, setLogs, bedHistory, addBedHistory, addLog }}>
        <Router>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin/*" element={
            <AdminLayout 
              socketConnected={socketConnected} 
              alertCount={alerts.length}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/queue" element={<QueuePage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/analytics" element={<ForecastPage />} />
                <Route path="/wards" element={<WardsPage />} />
              </Routes>
            </AdminLayout>
          } />
          <Route path="/patient/:id" element={<div className="p-20 text-center text-slate-500 font-medium">Patient Portal – coming soon</div>} />
        </Routes>

        {/* Global alert toast notifications */}
        <AlertToast alerts={alerts} onDismiss={dismissAlert} />
      </Router>
      </GlobalContext.Provider>
    </SocketContext.Provider>
  );
}

export default App;
