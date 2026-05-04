
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Logo } from './components/Logo';
import { DashboardView } from './views/Dashboard';
import { EnrollmentView } from './views/Enrollment';
import { TriageView } from './views/Triage';
import { PatientsView } from './views/Patients';
import { AuthView } from './views/Auth';
import { PatientDashboard } from './views/PatientDashboard';
import { PharmacyDashboard } from './views/PharmacyDashboard';
import { PharmacyReports } from './views/PharmacyReports';
import { InventoryView } from './views/InventoryView';
import { ExpensesView } from './views/Expenses';
import { EducationView } from './views/Education';
import { ReferralsView } from './views/Referrals';
import { MedicationsView } from './views/Medications';
import { SettingsView } from './views/Settings';
import { SuperadminDashboard } from './views/SuperadminDashboard';
import { ClinicWorkflow } from './views/ClinicWorkflow';
import { FacilityStaffView } from './views/FacilityStaffView';
import { OutreachMonitorView } from './views/OutreachMonitorView';
import { backend } from './services/backend';
import { ViewState, Alert, Patient, UserProfile } from './types';
import { Permissions } from './services/permissions';
import { LayoutDashboard, UserPlus, Stethoscope, Sun, Moon, Bell, LogOut, Users, X, HelpCircle, Book, ExternalLink, MessageSquare, Phone, Clock, FileText, Settings, Loader2, CheckCircle, Workflow, BarChart2, Package, Receipt, UserCog, Radar } from 'lucide-react';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Centralized Patient State via Backend
  const [patients, setPatients] = useState<Patient[]>([]);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const desktopNavRef = useRef<HTMLElement>(null);

  // Scroll the tab strip only enough to keep the active tab visible. Avoid `inline: "center"`
  // — it hides the start of the nav (Overview, Team, …) on narrow / split screens.
  useLayoutEffect(() => {
    const nav = desktopNavRef.current;
    if (!nav) return;
    const active = nav.querySelector('[data-desktop-nav-active="true"]');
    if (!(active instanceof HTMLElement)) return;
    const navRect = nav.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    const pad = 6;
    if (tabRect.left < navRect.left + pad || tabRect.right > navRect.right - pad) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [currentView]);

  useEffect(() => {
    // Initial Theme Check
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }

    // Check existing session
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const user = await backend.auth.getSession();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();

    // Handle clicks outside notification dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Patients when Authenticated (if role allows)
  useEffect(() => {
    const fetchPatients = async () => {
      if (isAuthenticated && (currentUser?.role === 'clinic' || currentUser?.role === 'pharmacy')) {
        const data = await backend.patients.getAll();
        setPatients(data);
      }
    };
    fetchPatients();
  }, [isAuthenticated, currentUser?.role]);

  // Load Real Notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (currentUser) {
        try {
          const realNotifications = await backend.notifications.getNotifications(currentUser);
          setNotifications(realNotifications);
        } catch (error) {
          console.error('Error loading notifications:', error);
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    };

    loadNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await backend.auth.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const handleUpdateUser = async (updatedProfile: UserProfile) => {
    // Optimistic update
    setCurrentUser(updatedProfile);
    // Real update
    await backend.auth.updateProfile(updatedProfile);
  };

  const handleAddPatient = async (patient: Patient) => {
    await backend.patients.add(patient);
    // Refresh list
    const updated = await backend.patients.getAll();
    setPatients(updated);
    setCurrentView('patients');
  };

  const markAllRead = async () => {
    if (currentUser) {
      try {
        await backend.notifications.markAllAsResolved(currentUser);
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, resolved: true })));
    setTimeout(() => setShowNotifications(false), 300);
  };

  const getNavItems = () => {
    if (!currentUser) return [];

    if (currentUser.role === 'superadmin') {
      return [
        { id: 'dashboard', label: 'System Overview', icon: LayoutDashboard },
      ];
    } else if (currentUser.role === 'patient') {
      return [
        { id: 'dashboard', label: 'My Health', icon: LayoutDashboard },
        { id: 'triage', label: 'Check Symptoms', icon: Stethoscope },
        { id: 'education', label: 'Library', icon: Book }
      ];
    } else if (currentUser.role === 'pharmacy') {
      return [
        ...(Permissions.canAccess(currentUser, 'overview')
          ? [{ id: 'dashboard', label: 'Pharmacy', icon: LayoutDashboard }]
          : []),
        ...(Permissions.isOwnerOrAdmin(currentUser)
          ? [{ id: 'facility_staff', label: 'Team', icon: UserCog }]
          : []),
        { id: 'outreach_monitor', label: 'Outreach', icon: Radar },
        { id: 'patients', label: 'Patients', icon: Users },
        ...(Permissions.canAccess(currentUser, 'inventory')
          ? [{ id: 'pharmacy_inventory', label: 'Inventory', icon: Package }]
          : []),
        { id: 'pharmacy_reports', label: 'Reports', icon: BarChart2 },
        ...(Permissions.canAccess(currentUser, 'expenses')
          ? [{ id: 'expenses', label: 'Expenses', icon: Receipt }]
          : []),
        { id: 'enrollment', label: 'Register', icon: UserPlus },
      ];
    } else {
      // Clinic / Default
      return [
        ...(Permissions.canAccess(currentUser, 'overview')
          ? [{ id: 'dashboard', label: 'Overview', icon: LayoutDashboard }]
          : []),
        ...(Permissions.isOwnerOrAdmin(currentUser)
          ? [{ id: 'facility_staff', label: 'Team', icon: UserCog }]
          : []),
        { id: 'outreach_monitor', label: 'Outreach', icon: Radar },
        { id: 'workflow', label: 'Workflow', icon: Workflow },
        { id: 'patients', label: 'Patients', icon: Users },
        ...(Permissions.canAccess(currentUser, 'inventory')
          ? [{ id: 'pharmacy_inventory', label: 'Inventory', icon: Package }]
          : []),
        ...(Permissions.canAccess(currentUser, 'expenses')
          ? [{ id: 'expenses', label: 'Expenses', icon: Receipt }]
          : []),
        { id: 'enrollment', label: 'Enroll', icon: UserPlus },
        { id: 'triage', label: 'Triage', icon: Stethoscope },
        { id: 'referrals', label: 'Referrals', icon: FileText },
      ];
    }
  };

  const getInitials = () => {
    if (!currentUser?.name) return 'MS';
    return currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-black text-brand-600">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <React.StrictMode>
        <AuthView onSuccess={handleLoginSuccess} />
      </React.StrictMode>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-slate-900 dark:text-slate-50 font-sans transition-colors duration-500 relative selection:bg-brand-500/30">

      {/* Help & Resources Modal */}
      {showResources && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#2c2c2e]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400">
                  <Book size={24} />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Resources & Support</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Training toolkit and technical help</p>
                </div>
              </div>
              <button onClick={() => setShowResources(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
              {/* SOPs Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs mb-4">Standard Operating Procedures</h3>
                <div className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400" />
                    <span className="font-semibold text-sm">Enrollment & Consent SOP</span>
                  </div>
                  <ExternalLink size={14} className="opacity-0 group-hover:opacity-50" />
                </div>
                <div className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Stethoscope size={18} className="text-slate-400" />
                    <span className="font-semibold text-sm">High Risk Escalation Protocol</span>
                  </div>
                  <ExternalLink size={14} className="opacity-0 group-hover:opacity-50" />
                </div>
                <div className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-slate-400" />
                    <span className="font-semibold text-sm">Task Resolution Guidelines</span>
                  </div>
                  <ExternalLink size={14} className="opacity-0 group-hover:opacity-50" />
                </div>
              </div>

              {/* Support Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs mb-4">Technical Support</h3>
                <div className="p-5 bg-brand-50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-900/20">
                  <h4 className="font-bold text-brand-700 dark:text-brand-300 mb-2">Helpdesk Hotline</h4>
                  <p className="text-sm text-brand-600/80 dark:text-brand-400/80 mb-4">Available Mon-Fri, 8am - 5pm</p>
                  <a href="tel:+254792356818" className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
                    <Phone size={20} /> +254 792 35 6818
                  </a>
                </div>
                <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <MessageSquare size={18} /> Chat with Support
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <header className="fixed top-0 w-full bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 z-50 saturate-150 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 md:h-20 flex items-center gap-2 sm:gap-3 min-w-0 relative">

          <div
            className="cursor-pointer group flex items-center flex-shrink-0 min-w-0"
            onClick={() => setCurrentView('dashboard')}
          >
            <Logo size={32} className="transition-transform duration-300 group-hover:scale-105 md:scale-100 scale-90" />
            <div className="hidden sm:flex items-center gap-2 ml-3">
              {currentUser?.role === 'patient' && <span className="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-full self-center">Patient Portal</span>}
              {currentUser?.role === 'pharmacy' &&
                (Permissions.isOwnerOrAdmin(currentUser) ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('facility_staff');
                    }}
                    className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 px-2.5 py-0.5 rounded-full self-center hover:opacity-90 transition-opacity"
                    title="View pharmacy team"
                  >
                    Pharmacy
                  </button>
                ) : (
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full self-center">Pharmacy</span>
                ))}
              {currentUser?.role === 'clinic' &&
                (Permissions.isOwnerOrAdmin(currentUser) ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('facility_staff');
                    }}
                    className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2.5 py-0.5 rounded-full self-center hover:opacity-90 transition-opacity"
                    title="View clinic team"
                  >
                    Clinic Portal
                  </button>
                ) : (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full self-center">Clinic Portal</span>
                ))}
              {currentUser?.role === 'superadmin' && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full self-center">Superadmin</span>}
            </div>
          </div>

          <nav
            ref={desktopNavRef}
            className="hidden md:flex flex-1 min-w-0 justify-center overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x py-0.5 [scrollbar-width:thin]"
            aria-label="Primary navigation"
          >
            <div className="flex w-max items-center gap-0.5 sm:gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-full backdrop-blur-sm ring-1 ring-slate-200/40 dark:ring-slate-700/50">
              {getNavItems().map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-desktop-nav-active={currentView === item.id ? 'true' : undefined}
                  onClick={() => setCurrentView(item.id as ViewState)}
                  className={`
                  flex shrink-0 items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-full py-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 ease-out
                  px-3 sm:px-4 lg:px-5
                  ${currentView === item.id
                    ? 'bg-white dark:bg-[#2c2c2e] text-black dark:text-white shadow-sm sm:scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
                  }
                `}
                >
                  <item.icon
                    size={16}
                    strokeWidth={2.5}
                    className={`shrink-0 ${currentView === item.id ? 'text-brand-500' : ''}`}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-4">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-full transition-all active:scale-95 ${showNotifications ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <Bell size={20} strokeWidth={2} />
                {notifications.filter(n => !n.resolved).length > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 md:right-auto mt-4 w-80 md:w-96 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-scale-in origin-top-right transform -translate-x-10 md:translate-x-0">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Notifications <span className="bg-slate-200 dark:bg-slate-700 text-xs px-1.5 py-0.5 rounded-full">{notifications.filter(n => !n.resolved).length}</span>
                    </h3>
                    <button
                      onClick={markAllRead}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => {
                        // Format timestamp for display
                        const formatTimestamp = (timestamp: string): string => {
                          try {
                            const date = new Date(timestamp);
                            const now = new Date();
                            const diffMs = now.getTime() - date.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);

                            if (diffMins < 1) return 'Just now';
                            if (diffMins < 60) return `${diffMins}m ago`;
                            if (diffHours < 24) return `${diffHours}h ago`;
                            if (diffDays < 7) return `${diffDays}d ago`;
                            return date.toLocaleDateString();
                          } catch {
                            return timestamp;
                          }
                        };

                        return (
                          <div
                            key={n.id}
                            className={`p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${n.resolved ? 'opacity-50 grayscale' : 'bg-brand-50/30 dark:bg-brand-900/5'}`}
                            onClick={async () => {
                              if (currentUser?.role === 'patient' && currentUser.id) {
                                await backend.notifications.markAsResolved(n.id, currentUser.id);
                              }
                              setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, resolved: true } : notif));
                            }}
                          >
                            <div className="flex gap-3">
                              <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.severity === 'critical' ? 'bg-red-500 shadow-red-500/50 shadow-sm' : n.severity === 'warning' ? 'bg-orange-500 shadow-orange-500/50 shadow-sm' : 'bg-brand-500 shadow-brand-500/50 shadow-sm'}`} />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{n.message}</p>
                                <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                                  <Clock size={10} /> {formatTimestamp(n.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell size={24} className="opacity-40" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No new notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-brand-500/20 cursor-default ring-2 ring-white dark:ring-black"
                title={currentUser?.name}
              >
                {getInitials()}
              </div>
              <div className="hidden lg:block text-right leading-tight">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser?.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{currentUser?.role}</p>
              </div>

              {/* Settings Button */}
              <button
                onClick={() => setCurrentView('settings')}
                className={`p-2 transition-colors ${currentView === 'settings' ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/10 rounded-lg' : 'text-slate-400 hover:text-brand-600 dark:hover:text-brand-400'}`}
                title="Settings"
              >
                <Settings size={18} />
              </button>

              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Log Out">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-20 pb-28 md:pb-8 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
        {currentView === 'dashboard' && currentUser?.role === 'patient' && (
          <PatientDashboard user={currentUser} onNavigate={setCurrentView} onLogout={handleLogout} />
        )}

        {currentView === 'dashboard' && currentUser?.role === 'pharmacy' && (
          <PharmacyDashboard user={currentUser} onNavigate={setCurrentView} />
        )}

        {currentView === 'pharmacy_reports' && currentUser?.role === 'pharmacy' && currentUser && (
          <PharmacyReports user={currentUser} onBack={() => setCurrentView('dashboard')} />
        )}

        {currentView === 'pharmacy_inventory' &&
          currentUser &&
          (currentUser.role === 'pharmacy' || currentUser.role === 'clinic') && (
            Permissions.canAccess(currentUser, 'inventory') ? (
              <InventoryView user={currentUser} onBack={() => setCurrentView('dashboard')} />
            ) : (
              <div className="p-8 bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="text-lg font-bold text-slate-900 dark:text-white">Access restricted</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  You do not have permission to view Inventory. Ask an Admin/Owner to grant access.
                </div>
              </div>
            )
          )}

        {currentView === 'expenses' && currentUser && (
          Permissions.canAccess(currentUser, 'expenses') ? (
            <ExpensesView
              user={currentUser}
              portal={currentUser.role === 'pharmacy' ? 'pharmacy' : 'clinic'}
              onBack={() => setCurrentView('dashboard')}
            />
          ) : (
            <div className="p-8 bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold text-slate-900 dark:text-white">Access restricted</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                You do not have permission to view Expenses. Ask an Admin/Owner to grant access.
              </div>
            </div>
          )
        )}

        {currentView === 'dashboard' && currentUser?.role === 'superadmin' && (
          <SuperadminDashboard user={currentUser} onNavigate={setCurrentView} />
        )}

        {currentView === 'dashboard' && (!currentUser?.role || currentUser.role === 'clinic') && (
          Permissions.canAccess(currentUser, 'overview') ? (
            <DashboardView user={currentUser} onNavigate={setCurrentView} />
          ) : (
            <div className="p-8 bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold text-slate-900 dark:text-white">Access restricted</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                You do not have permission to view Overview. Ask an Admin/Owner to grant access.
              </div>
            </div>
          )
        )}

        {currentView === 'enrollment' && (
          <EnrollmentView onAddPatient={handleAddPatient} currentFacility={currentUser} />
        )}

        {currentView === 'facility_staff' && currentUser && (
          (currentUser.role === 'clinic' || currentUser.role === 'pharmacy') &&
          Permissions.isOwnerOrAdmin(currentUser) ? (
            <FacilityStaffView user={currentUser} onBack={() => setCurrentView('dashboard')} />
          ) : (
            <div className="p-8 bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold text-slate-900 dark:text-white">Access restricted</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Team management is only available to clinic or pharmacy owners and admins.
              </div>
            </div>
          )
        )}

        {currentView === 'outreach_monitor' && currentUser && (
          (currentUser.role === 'clinic' || currentUser.role === 'pharmacy') ? (
            <OutreachMonitorView user={currentUser} onBack={() => setCurrentView('dashboard')} />
          ) : (
            <div className="p-8 bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold text-slate-900 dark:text-white">Access restricted</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Outreach monitoring is available in clinic and pharmacy portals.
              </div>
            </div>
          )
        )}

        {currentView === 'workflow' && currentUser && (
          <ClinicWorkflow user={currentUser} onNavigate={setCurrentView} />
        )}

        {currentView === 'triage' && <TriageView user={currentUser} />}

        {currentView === 'patients' && (
          <PatientsView
            patients={patients}
            currentUser={currentUser}
            onNavigate={setCurrentView}
            onDeletePatient={async (id: string) => {
              await backend.patients.delete(id);
              const updated = await backend.patients.getAll();
              setPatients(updated);
            }}
          />
        )}

        {currentView === 'education' && (
          <EducationView onBack={() => setCurrentView('dashboard')} />
        )}

        {currentView === 'medications' && (
          <MedicationsView user={currentUser} onBack={() => setCurrentView('dashboard')} onUpdateUser={handleUpdateUser} />
        )}

        {currentView === 'settings' && (
          <SettingsView
            user={currentUser}
            onBack={() => setCurrentView('dashboard')}
            onUpdateUser={handleUpdateUser}
            toggleTheme={() => setDarkMode(!darkMode)}
            isDarkMode={darkMode}
            onLogout={handleLogout}
          />
        )}
        {currentView === 'referrals' && (
          <ReferralsView onBack={() => setCurrentView('dashboard')} currentUser={currentUser} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        <div className="flex h-16 items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth touch-pan-x gap-1 px-2 [scrollbar-width:thin]">
          {getNavItems().map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id as ViewState)}
              className={`
                     flex min-w-[4.25rem] max-w-[5.5rem] shrink-0 snap-start flex-col items-center justify-center gap-0.5 px-1.5 transition-colors
                     ${currentView === item.id
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }
                  `}
            >
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="line-clamp-2 text-center text-[10px] font-bold leading-tight tracking-tight">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Floating Help / Support Button */}
      <div className="fixed bottom-24 md:bottom-6 right-6 z-40">
        <button
          onClick={() => setShowResources(true)}
          className="w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <HelpCircle size={28} />
          <span className="hidden md:block absolute right-full mr-4 bg-white dark:bg-[#1c1c1e] text-slate-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-slate-100 dark:border-slate-800">
            Support & SOPs
          </span>
        </button>
      </div>

    </div>
  );
};
