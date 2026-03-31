import React, { useContext } from 'react';
import { GlobalContext } from '../App';
import { Clock, Activity, AlertCircle, Bed, User, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LogsPage = () => {
  const { logs } = useContext(GlobalContext);

  const getLogIcon = (msg) => {
    if (msg.includes('Alert')) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (msg.includes('Bed')) return <Bed className="w-5 h-5 text-blue-500" />;
    if (msg.includes('Patient')) return <User className="w-5 h-5 text-emerald-500" />;
    return <Info className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Real-Time Event Logs</h1>
          <p className="text-slate-500">System-wide actions and synchronized updates.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-slate-600">
            {logs.length} Total Events Tracked
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center p-12 text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No events recorded yet since the session started.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <AnimatePresence>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                    {getLogIcon(log.message)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{log.message}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPage;
