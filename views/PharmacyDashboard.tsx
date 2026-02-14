
import React, { useState, useEffect } from 'react';
import { UserProfile, RefillRequest, InventoryItem, Patient } from '../types';
import { backend } from '../services/backend';
import { ActionCard } from '../components/ActionCard';
import { Pill, Users, AlertTriangle, CheckSquare, Search, CheckCircle, Clock, Package, UserPlus, X, Loader2 } from 'lucide-react';

interface PharmacyDashboardProps {
  user: UserProfile;
  onNavigate: (view: string) => void;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ user, onNavigate }) => {
  const [refills, setRefills] = useState<RefillRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dispensingId, setDispensingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [showInventory, setShowInventory] = useState(false);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [refillData, inventoryData, patientData] = await Promise.all([
          backend.pharmacy.getRefills(),
          backend.pharmacy.getInventory(),
          backend.patients.getAll()
        ]);
        setRefills(refillData);
        setInventory(inventoryData);
        setPatients(patientData);
      } catch (e) {
        console.error("Failed to load pharmacy data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const lowStockItems = inventory.filter(item => item.stock <= item.minLevel);
  const pendingCount = refills.filter(r => r.status === 'pending').length;
  
  // Calculate dispensed today (filter by today's date)
  const today = new Date().toISOString().split('T')[0];
  const dispensedToday = refills.filter(r => {
    if (r.status !== 'dispensed') return false;
    // If refill has a dispensed_at date, use it; otherwise check requestTime
    const dispensedDate = (r as any).dispensed_at || r.requestTime;
    if (typeof dispensedDate === 'string') {
      return dispensedDate.startsWith(today);
    }
    return false;
  }).length;

  const handleDispense = async (id: string) => {
    setDispensingId(id);
    try {
      await backend.pharmacy.dispense(id);
      
      // Optimistic update for refills
      setRefills(prev => prev.map(r => r.id === id ? { ...r, status: 'dispensed' } : r));
      
      // Re-fetch inventory to show updated stock
      const updatedInventory = await backend.pharmacy.getInventory();
      setInventory(updatedInventory);

      const patient = refills.find(r => r.id === id);
      setShowSuccess(`Dispensed ${patient?.medication} for ${patient?.patientName}`);
      
      setTimeout(() => setShowSuccess(null), 3000);
    } catch (e) {
      alert("Failed to dispense medication");
    } finally {
      setDispensingId(null);
    }
  };

  const filteredRefills = refills.filter(r => 
    r.status === 'pending' && 
    (r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     r.medication.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in-up relative">
       
       {/* Toast Notification */}
       {showSuccess && (
         <div className="fixed top-24 right-6 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] flex items-center gap-3 z-50 animate-slide-in-right border border-green-500 backdrop-blur-md bg-opacity-90">
           <div className="bg-white/20 p-1.5 rounded-full">
             <CheckCircle size={20} className="text-white" strokeWidth={3} />
           </div>
           <div>
             <p className="font-bold text-sm">Success</p>
             <p className="text-xs text-green-100">{showSuccess}</p>
           </div>
         </div>
       )}

       {/* Inventory Modal */}
       {showInventory && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-800">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory Status</h2>
                  <button onClick={() => setShowInventory(false)} className="p-2 bg-slate-100 dark:bg-[#2c2c2e] rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white">
                     <X size={20} />
                  </button>
               </div>
               
               <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {lowStockItems.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Low Stock Alerts</h4>
                      {lowStockItems.map(item => (
                        <div key={item.id} className="mb-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600">
                              <AlertTriangle size={20} />
                          </div>
                          <div className="flex-1">
                              <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
                              <p className="text-sm text-red-600 dark:text-red-400">{item.stock} {item.unit} remaining</p>
                          </div>
                          <button className="px-3 py-1.5 bg-white dark:bg-black text-xs font-bold rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">Order</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">All Items</h4>
                  {inventory.filter(i => i.stock > i.minLevel).map(item => (
                     <div key={item.id} className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-2xl flex items-center justify-between">
                        <div>
                           <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
                           <p className="text-sm text-slate-500 dark:text-slate-400">{item.stock} {item.unit} in stock</p>
                        </div>
                        <div className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">OK</div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
       )}

       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
          <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{user.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Pharmacy Dashboard</p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={() => onNavigate('enrollment')}
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 active:scale-95"
             >
                <UserPlus size={18} />
                <span className="hidden md:inline">Register Patient</span>
             </button>
             <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-white dark:bg-[#1c1c1e] px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                <Clock size={16} />
                <span>
                   {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
             </div>
          </div>
       </div>

       {loading ? (
         <div className="h-64 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand-600" size={32} />
         </div>
       ) : (
         <>
           {/* Stats Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <ActionCard 
                 title="Pending Refills" 
                 value={pendingCount} 
                 icon={Pill} 
                 variant={pendingCount > 0 ? (pendingCount > 5 ? "alert" : "brand") : "default"}
                 subtitle={pendingCount > 0 ? "Requires attention" : "All cleared"}
                 trend={pendingCount > 5 ? "up" : "down"}
                 trendValue={pendingCount > 5 ? "High" : "Low"}
              />
              <ActionCard 
                 title="Dispensed Today" 
                 value={dispensedToday} 
                 icon={CheckSquare} 
                 variant="default"
                 trend="up"
                 trendValue="12%"
                 subtitle="Since 8:00 AM"
              />
              <ActionCard 
                 title="Assigned Patients" 
                 value={patients.length} 
                 icon={Users} 
                 variant="default"
                 subtitle={patients.length > 0 ? "Active prescriptions" : "No patients enrolled"}
                 onClick={() => onNavigate('patients')}
              />
              <ActionCard 
                 title="Stock Alerts" 
                 value={lowStockItems.length} 
                 icon={AlertTriangle} 
                 variant={lowStockItems.length > 0 ? "alert" : "default"}
                 subtitle="Low inventory items"
                 onClick={() => setShowInventory(true)}
              />
           </div>

           {/* Interactive Refill Queue */}
           <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px]">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                 <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Refill Queue</h3>
                    <p className="text-slate-500 text-sm mt-1">Real-time prescription requests from clinic</p>
                 </div>
                 <div className="relative w-full md:w-auto group">
                    <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search patient or drug..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-72 pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#2c2c2e] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/50 dark:text-white transition-all placeholder-slate-500"
                    />
                 </div>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                 {filteredRefills.length > 0 ? (
                    filteredRefills.map((request) => (
                      <div key={request.id} className="flex flex-col md:flex-row items-start md:items-center justify-between py-5 gap-4 animate-fade-in group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 shrink-0 border border-slate-200 dark:border-slate-700">
                                {request.initials}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-brand-600 transition-colors">{request.patientName}</p>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-0.5">
                                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    <Package size={12} />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{request.medication}</span>
                                  </div>
                                  <span className="text-xs">•</span>
                                  <span>{request.dosage}</span>
                                  <span className="text-xs">•</span>
                                  <span>{request.duration}</span>
                                </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
                              <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-nowrap">
                                Req: {request.requestTime}
                              </span>
                              <button 
                                onClick={() => handleDispense(request.id)}
                                disabled={dispensingId === request.id}
                                className={`
                                  min-w-[140px] px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all flex items-center justify-center gap-2
                                  ${dispensingId === request.id 
                                    ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none text-slate-500' 
                                    : 'bg-brand-600 hover:bg-brand-700 active:scale-95 shadow-brand-500/20 hover:shadow-brand-500/30'}
                                `}
                              >
                                {dispensingId === request.id ? (
                                    <>
                                      <Loader2 className="animate-spin" size={16} />
                                      <span>Processing</span>
                                    </>
                                ) : (
                                    <>Dispense <CheckCircle size={16} /></>
                                )}
                              </button>
                          </div>
                      </div>
                    ))
                 ) : (
                    <div className="py-20 text-center text-slate-400">
                       <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200 dark:border-slate-700">
                          <CheckCircle size={32} className="opacity-20" />
                       </div>
                       <p className="font-bold text-lg text-slate-500 dark:text-slate-400">All Caught Up</p>
                       <p className="text-sm mt-1">No pending refills match your criteria.</p>
                       {searchTerm && (
                         <button 
                            onClick={() => setSearchTerm('')}
                            className="mt-4 text-brand-600 font-bold text-sm hover:underline"
                         >
                           Clear Search
                         </button>
                       )}
                    </div>
                 )}
              </div>
           </div>
         </>
       )}
    </div>
  );
};
