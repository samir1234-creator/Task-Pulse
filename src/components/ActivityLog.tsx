import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  History, 
  User as UserIcon, 
  PlusCircle, 
  RefreshCw, 
  Trash2, 
  Clock,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../services/taskService';
import { TaskLog } from '../types';
import { cn, formatDate } from '../lib/utils';

interface ActivityLogProps {
  onBack: () => void;
}

export default function ActivityLog({ onBack }: ActivityLogProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TaskLog['changeType'] | 'all'>('all');

  useEffect(() => {
    if (user) {
      setLogs(taskService.getLogs(user.id));
    }
  }, [user]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || log.changeType === filter;
    return matchesSearch && matchesFilter;
  });

  const getLogIcon = (type: TaskLog['changeType']) => {
    switch (type) {
      case 'created': return <PlusCircle className="w-5 h-5 text-emerald-500" />;
      case 'updated': return <RefreshCw className="w-5 h-5 text-indigo-500" />;
      case 'status_changed': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'deleted': return <Trash2 className="w-5 h-5 text-rose-500" />;
      default: return <History className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 z-50 flex items-center justify-between px-4 md:px-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors group flex items-center gap-1"
        >
          <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
          <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-600 transition-colors hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">Activity Stream</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="text-xs font-black text-slate-400">{filteredLogs.length}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-12 px-4 md:px-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search activity details..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none transition-all font-bold text-slate-900 shadow-sm"
            />
          </div>
          <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-100 overflow-x-auto no-scrollbar whitespace-nowrap">
            {['all', 'created', 'updated', 'status_changed', 'deleted'].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type as any)}
                className={cn(
                  "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === type 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <motion.div
                  key={log.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-start gap-5 group hover:border-indigo-200 transition-all"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    log.changeType === 'created' ? "bg-emerald-50" :
                    log.changeType === 'updated' ? "bg-indigo-50" :
                    log.changeType === 'status_changed' ? "bg-amber-50" : "bg-rose-50"
                  )}>
                    {getLogIcon(log.changeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <p className="text-sm font-black text-slate-900 truncate">{log.details}</p>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                         <UserIcon className="w-3 h-3 text-slate-400" />
                       </div>
                       <span className="text-xs font-bold text-slate-500">By {log.userName}</span>
                       <span className="hidden sm:inline text-slate-200 mx-1">•</span>
                       <span className="hidden sm:inline text-[10px] font-black text-slate-300 uppercase tracking-tighter">ID: {log.taskId}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <History className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">No activity found</h3>
                <p className="text-slate-400 font-bold max-w-xs mx-auto text-sm uppercase tracking-tight">Try adjusting your filters or continue working to generate new stream events.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
