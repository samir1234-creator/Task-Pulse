import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Filter, 
  LayoutDashboard,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronRight,
  Search,
  MoreVertical,
  Calendar,
  Loader2,
  Menu,
  X,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SortAsc,
  SortDesc,
  History,
  Bell,
  BellDot,
  Check
} from 'lucide-react';
import { Task, TaskNotification } from './types';
import { taskService } from './services/taskService';
import { cn, formatDate } from './lib/utils';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Profile from './components/Profile';
import ActivityLog from './components/ActivityLog';

export default function App() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile' | 'history'>('dashboard');
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: new Date().toISOString().split('T')[0],
    reminderTime: 'none' as Task['reminderTime']
  });

  useEffect(() => {
    if (user) {
      setTasks(taskService.getTasks(user.id));
      setNotifications(taskService.getNotifications(user.id));
    }
  }, [user]);

  // Reminder Checker Effect
  useEffect(() => {
    if (!user || tasks.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentNotifs = taskService.getNotifications(user.id);
      
      tasks.forEach(task => {
        if (task.status === 'completed' || !task.reminderTime || task.reminderTime === 'none') return;
        
        // Don't notify if already notified for this task in the last few hours
        const alreadyNotified = currentNotifs.some(n => 
          n.taskId === task.id && 
          (now.getTime() - new Date(n.timestamp).getTime()) < 1000 * 60 * 60 * 6 // 6 hours threshold
        );
        if (alreadyNotified) return;

        const due = new Date(task.dueDate);
        let reminderThreshold = 0;
        
        switch (task.reminderTime) {
          case '1h': reminderThreshold = 1000 * 60 * 60; break;
          case '3h': reminderThreshold = 1000 * 60 * 60 * 3; break;
          case '1d': reminderThreshold = 1000 * 60 * 60 * 24; break;
          case '2d': reminderThreshold = 1000 * 60 * 60 * 24 * 2; break;
        }

        const diff = due.getTime() - now.getTime();
        
        if (diff > 0 && diff <= reminderThreshold) {
          const newNotif = taskService.addNotification(
            user.id,
            task.id,
            'Upcoming Deadline',
            `Reminder: "${task.title}" is due in less than ${task.reminderTime}.`
          );
          setNotifications(prev => [newNotif, ...prev]);
        }
      });
    };

    const interval = setInterval(checkReminders, 1000 * 60); // Check every minute
    checkReminders(); // Initial check

    return () => clearInterval(interval);
  }, [user, tasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !user) return;

    const added = taskService.addTask({
      userId: user.id,
      title: newTask.title,
      description: newTask.description,
      status: 'todo',
      priority: newTask.priority,
      dueDate: newTask.dueDate,
      reminderTime: newTask.reminderTime,
    }, user.displayName);

    setTasks([added, ...tasks]);
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: new Date().toISOString().split('T')[0], reminderTime: 'none' });
    setIsAddingTask(false);
  };

  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim() || !user) return;

    const updated = taskService.updateTask(editingTask.id, {
      title: editingTask.title,
      description: editingTask.description,
      priority: editingTask.priority,
      dueDate: editingTask.dueDate,
      reminderTime: editingTask.reminderTime,
    }, user.displayName, user.id);

    setTasks(tasks.map(t => t.id === editingTask.id ? updated : t));
    setEditingTask(null);
  };

  const toggleStatus = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !user) return;

    const newStatus: Task['status'] = task.status === 'completed' ? 'todo' : 
                                   task.status === 'todo' ? 'in-progress' : 'completed';
    
    const updated = taskService.updateTask(id, { status: newStatus }, user.displayName, user.id);
    setTasks(tasks.map(t => t.id === id ? updated : t));
  };

  const deleteTask = (id: string) => {
    if (user) {
      taskService.deleteTask(id, user.displayName, user.id);
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const filteredTasks = tasks
    .filter(t => {
      const matchesFilter = filter === 'all' || t.status === filter;
      const lowerSearch = searchQuery.toLowerCase();
      const matchesSearch = t.title.toLowerCase().includes(lowerSearch) || 
                            t.description.toLowerCase().includes(lowerSearch) ||
                            t.priority.toLowerCase().includes(lowerSearch) ||
                            t.status.toLowerCase().includes(lowerSearch);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'dueDate') {
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'priority') {
        const priorityMap = { low: 1, medium: 2, high: 3 };
        comparison = priorityMap[a.priority] - priorityMap[b.priority];
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 border-red-100';
      case 'medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'low': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      default: return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (currentView === 'profile') {
    return <Profile onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'history') {
    return <ActivityLog onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Responsive Design */}
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 w-72 bg-indigo-700 md:flex flex-col z-50 text-white transition-transform duration-300 transform",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="absolute right-4 top-6 p-2 bg-white/10 rounded-xl md:hidden text-white hover:bg-white/20"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 flex items-center gap-3 mb-10">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner shadow-white/10">T</div>
          <span className="text-2xl font-black tracking-tight text-white uppercase">TaskPulse</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => {
              setCurrentView('dashboard');
              setFilter('all');
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all group",
              currentView === 'dashboard' && filter === 'all'
                ? "bg-white/20 text-white shadow-lg shadow-indigo-800/50" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <LayoutDashboard className={cn("w-5 h-5", currentView === 'dashboard' && filter === 'all' ? "text-white" : "text-white/40 group-hover:text-white/60")} />
            Dashboard
          </button>

          <button
            onClick={() => {
              setCurrentView('profile');
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all group",
              currentView === 'profile'
                ? "bg-white/20 text-white shadow-lg shadow-indigo-800/50" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <UserIcon className={cn("w-5 h-5", currentView === 'profile' ? "text-white" : "text-white/40 group-hover:text-white/60")} />
            My Profile
          </button>

          <button
            onClick={() => {
              setCurrentView('history');
              setIsSidebarOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all group",
              currentView === 'history'
                ? "bg-white/20 text-white shadow-lg shadow-indigo-800/50" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <History className={cn("w-5 h-5", currentView === 'history' ? "text-white" : "text-white/40 group-hover:text-white/60")} />
            Activity Log
          </button>

          <div className="pt-6 pb-2 px-4">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Filters</span>
          </div>

          {[
            { id: 'todo', label: 'To Do', icon: Circle },
            { id: 'in-progress', label: 'In Progress', icon: Clock },
            { id: 'completed', label: 'Completed', icon: CheckCircle2 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView('dashboard');
                setFilter(item.id as any);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all group",
                currentView === 'dashboard' && filter === item.id 
                  ? "bg-white/20 text-white shadow-lg shadow-indigo-800/50" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", currentView === 'dashboard' && filter === item.id ? "text-white" : "text-white/40 group-hover:text-white/60")} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-5 bg-white/10 rounded-3xl border border-white/10 mb-6 backdrop-blur-md">
            <p className="text-[10px] text-white/60 mb-3 uppercase font-black tracking-widest leading-none">Global Progress</p>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden mb-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${tasks.length ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0}%` }}
                className="h-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
              />
            </div>
            <div className="flex justify-between items-center">
               <span className="text-[11px] font-bold text-white/90">Personal Workspace</span>
               <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,1)]" />
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 text-sm font-black text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10"
          >
            <LogOut className="w-5 h-5" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 flex flex-col min-h-screen min-w-0">
        <header className="min-h-[5rem] lg:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-0 shrink-0 sticky top-0 z-30 gap-4 md:gap-0">
          <div className="flex items-center justify-between w-full md:w-auto gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 bg-slate-100 rounded-xl md:hidden text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors shrink-0"
              >
                <Menu className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <h1 className="text-lg md:text-2xl font-black text-slate-900 truncate">Workspace</h1>
            </div>
            
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 md:ml-2">
              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-indigo-600 shadow-sm shrink-0"
                title="Toggle Sort Direction"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />}
              </button>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-wider px-1 md:px-2 py-1 outline-none cursor-pointer text-slate-600 focus:text-indigo-600 max-w-[80px] md:max-w-none"
              >
                <option value="createdAt">Date</option>
                <option value="dueDate">Due</option>
                <option value="priority">Rank</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48 lg:w-64 transition-all font-bold"
              />
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors relative"
                >
                  {notifications.some(n => !n.read) ? (
                    <BellDot className="w-5 h-5 animate-bounce" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowNotifications(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                      >
                        <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Notifications</h3>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black">
                            {notifications.filter(n => !n.read).length} NEW
                          </span>
                        </div>
                        <div className="max-h-96 overflow-y-auto no-scrollbar">
                          {notifications.length > 0 ? (
                            notifications.map(n => (
                              <div 
                                key={n.id}
                                onClick={() => {
                                  taskService.markNotificationAsRead(n.id);
                                  setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                                }}
                                className={cn(
                                  "p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 flex gap-4",
                                  !n.read && "bg-indigo-50/30"
                                )}
                              >
                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                  <Clock className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-900 mb-0.5">{n.title}</p>
                                  <p className="text-[11px] font-bold text-slate-500 leading-tight mb-1">{n.message}</p>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                    {formatDate(n.timestamp)}
                                  </p>
                                </div>
                                {!n.read && (
                                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-10 text-center">
                              <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                              <p className="text-xs font-bold text-slate-400">No new notifications</p>
                            </div>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <button 
                            onClick={() => {
                              notifications.forEach(n => taskService.markNotificationAsRead(n.id));
                              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            }}
                            className="w-full py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                          >
                            Mark all as read
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setIsAddingTask(true)}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white w-10 h-10 md:w-auto md:px-5 md:py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-5 h-5 md:w-4 md:h-4" />
                <span className="hidden md:inline">New Task</span>
              </button>
              <div 
                onClick={() => setCurrentView('profile')}
                className="w-10 h-10 rounded-full bg-amber-400 border-2 border-white shadow-sm flex items-center justify-center text-white font-bold cursor-pointer uppercase hover:scale-105 active:scale-95 transition-transform shrink-0"
              >
                {user.displayName[0]}
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          <div className="max-w-6xl mx-auto space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredTasks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {filteredTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group relative transition-all",
                        task.status === 'in-progress' && "border-l-4 border-l-amber-400 ring-2 ring-amber-50/50",
                        task.status === 'completed' && "bg-slate-100/50 border-dashed border-slate-300"
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-2">
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider",
                            task.priority === 'high' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                            task.priority === 'medium' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          )}>
                            {task.priority}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">
                            {task.status.replace('-', ' ')}
                          </span>
                        </div>
                        <button 
                          onClick={() => toggleStatus(task.id)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            task.status === 'completed' 
                              ? "bg-emerald-500 border-emerald-500 text-white" 
                              : "border-slate-200 hover:border-indigo-400 text-transparent"
                          )}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className={cn(
                        "font-bold text-slate-800 leading-tight mb-2 text-lg",
                        task.status === 'completed' && "text-slate-400 line-through"
                      )}>
                        {task.title}
                      </h3>
                      <p className={cn(
                        "text-slate-500 text-sm line-clamp-2 mb-4 font-medium",
                        task.status === 'completed' && "text-slate-400/70"
                      )}>
                        {task.description || "No description provided."}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(task.dueDate)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingTask(task)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteTask(task.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-32 flex flex-col items-center justify-center text-center px-4"
                >
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 rotate-3">
                    <LayoutDashboard className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">No tasks to track</h3>
                  <p className="text-slate-500 max-w-xs mx-auto font-medium">
                    {searchQuery ? `We couldn't find any tasks matching "${searchQuery}"` : "Your dashboard is clear. Time to plan something new!"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info Footer Overlay - Responsive */}
        <div className="px-4 md:px-8 py-6 bg-white border-t border-slate-200 flex flex-wrap items-center gap-8 md:gap-16 shrink-0 mt-auto">
          <div className="flex flex-col min-w-[120px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 leading-none">Health Score</span>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-indigo-600 leading-none">
                {tasks.length ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0}%
              </span>
              <span className="text-[10px] text-emerald-500 font-black mb-0.5 uppercase tracking-tighter">Peak</span>
            </div>
          </div>
          <div className="flex flex-col sm:border-l sm:border-slate-100 sm:pl-8 md:pl-12 min-w-[100px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 leading-none">Task Load</span>
            <div className="flex items-end gap-2 text-2xl font-black text-slate-800 leading-none">
              {tasks.length}
            </div>
          </div>
          <div className="flex flex-col border-l border-slate-100 pl-8 md:pl-12 hidden sm:flex">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 leading-none">Network</span>
            <div className="flex items-center gap-2.5 mt-1">
              <div className="flex -space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={cn("w-7 h-7 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100", i === 0 ? "bg-indigo-300" : i === 1 ? "bg-rose-300" : "bg-amber-300")} />
                ))}
              </div>
              <span className="text-[11px] text-slate-500 font-bold">L-Live Active</span>
            </div>
          </div>
        </div>
      </main>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingTask(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Create New Task</h2>
                  <button 
                    onClick={() => setIsAddingTask(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <Trash2 className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleAddTask} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Task Title</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
                      placeholder="e.g. Design landing page hero section"
                      value={newTask.title}
                      onChange={e => setNewTask({...newTask, title: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Description</label>
                    <textarea 
                      placeholder="Added details about the task..."
                      value={newTask.description}
                      onChange={e => setNewTask({...newTask, description: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-900 min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Priority Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'low', color: 'emerald' },
                          { id: 'medium', color: 'amber' },
                          { id: 'high', color: 'rose' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNewTask({...newTask, priority: p.id as any})}
                            className={cn(
                              "py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                              newTask.priority === p.id 
                                ? p.id === 'low' ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200" :
                                  p.id === 'medium' ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200" :
                                  "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200"
                                : p.id === 'low' ? "bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200" :
                                  p.id === 'medium' ? "bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200" :
                                  "bg-slate-50 border-slate-100 text-slate-400 hover:border-rose-200"
                            )}
                          >
                            {p.id}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Due Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="date" 
                          value={newTask.dueDate}
                          onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Reminder</label>
                    <div className="flex flex-wrap gap-2">
                       {[
                         { id: 'none', label: 'Off' },
                         { id: '1h', label: '1 Hr' },
                         { id: '3h', label: '3 Hrs' },
                         { id: '1d', label: '1 Day' },
                         { id: '2d', label: '2 Days' }
                       ].map(rem => (
                         <button
                           key={rem.id}
                           type="button"
                           onClick={() => setNewTask({...newTask, reminderTime: rem.id as any})}
                           className={cn(
                             "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                             newTask.reminderTime === rem.id 
                               ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                               : "bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200"
                           )}
                         >
                           {rem.label}
                         </button>
                       ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    Create Task
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Edit Task</h2>
                  <button 
                    onClick={() => setEditingTask(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateTask} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Task Title</label>
                    <input 
                      autoFocus
                      required
                      type="text" 
                      placeholder="e.g. Design landing page hero section"
                      value={editingTask.title}
                      onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Description</label>
                    <textarea 
                      placeholder="Added details about the task..."
                      value={editingTask.description}
                      onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-medium text-slate-900 min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Priority Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'low', color: 'emerald' },
                          { id: 'medium', color: 'amber' },
                          { id: 'high', color: 'rose' }
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setEditingTask({...editingTask, priority: p.id as any})}
                            className={cn(
                              "py-3 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                              editingTask.priority === p.id 
                                ? p.id === 'low' ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200" :
                                  p.id === 'medium' ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200" :
                                  "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200"
                                : p.id === 'low' ? "bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200" :
                                  p.id === 'medium' ? "bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200" :
                                  "bg-slate-50 border-slate-100 text-slate-400 hover:border-rose-200"
                            )}
                          >
                            {p.id}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Due Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="date" 
                          value={editingTask.dueDate}
                          onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Reminder</label>
                    <div className="flex flex-wrap gap-2">
                       {[
                         { id: 'none', label: 'Off' },
                         { id: '1h', label: '1 Hr' },
                         { id: '3h', label: '3 Hrs' },
                         { id: '1d', label: '1 Day' },
                         { id: '2d', label: '2 Days' }
                       ].map(rem => (
                         <button
                           key={rem.id}
                           type="button"
                           onClick={() => setEditingTask({...editingTask, reminderTime: rem.id as any})}
                           className={cn(
                             "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                             editingTask.reminderTime === rem.id 
                               ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                               : "bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200"
                           )}
                         >
                           {rem.label}
                         </button>
                       ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
