
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { ChevronLeft, CreditCard, Shield, Bell, Globe, Moon, LogOut, User, Check, Smartphone, Mail, MapPin, Zap, Edit2, Save, X, ExternalLink, AlertTriangle, CheckCircle, Camera, UploadCloud, Star, Sun, Monitor, Lock, Loader2 } from 'lucide-react';
import { ClinicTimezoneCard } from '../components/settings/ClinicTimezoneCard';
import { SubscriptionModal } from '../components/settings/SubscriptionModal';
import { SubscriptionSummaryCard } from '../components/settings/SubscriptionSummaryCard';

interface SettingsViewProps {
  user: UserProfile | null;
  onBack: () => void;
  onUpdateUser: (user: UserProfile) => Promise<void>;
  toggleTheme: () => void;
  isDarkMode: boolean;
  onLogout: () => void;
}

const PLANS = [
  { 
    id: 'basic', 
    name: 'MamaSafe Basic', 
    price: 'Free', 
    period: 'Forever', 
    features: ['Health Tracking', 'AI Symptom Checker', 'Community Access'],
    color: 'bg-slate-100 dark:bg-slate-800'
  },
  { 
    id: 'pro', 
    name: 'Professional', 
    price: 'KES 2,000', 
    period: '/month', 
    features: ['Inventory Management', 'Prescription Routing', 'Sales Reports', 'Priority Support'],
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900'
  },
  { 
    id: 'enterprise', 
    name: 'Enterprise', 
    price: 'KES 5,000', 
    period: '/month', 
    features: ['Unlimited Patients', 'AI Triage Integration', 'Advanced Analytics', 'Dedicated Account Manager'],
    color: 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-900'
  }
];

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onBack, onUpdateUser, toggleTheme, isDarkMode, onLogout }) => {
  const [notifications, setNotifications] = useState(() => localStorage.getItem('mamasafe_pref_notifications') === 'true');
  const [language, setLanguage] = useState(() => localStorage.getItem('mamasafe_pref_language') || 'English');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingTimeZone, setSavingTimeZone] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isPatient = user?.role === 'patient';
  const isSuperadmin = user?.role === 'superadmin';
  const canManageSubscription = !isPatient && !isSuperadmin;

  const [formData, setFormData] = useState({
      name: user?.name || '',
      phone: user?.phone || '',
      location: user?.location || '',
      avatar: user?.avatar || '',
      timeZone: user?.facilityData?.timeZone || ''
  });

  useEffect(() => {
    localStorage.setItem('mamasafe_pref_notifications', notifications.toString());
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('mamasafe_pref_language', language);
  }, [language]);

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
      if (user) {
          setIsSaving(true);
          try {
              await onUpdateUser({
                  ...user,
                  name: formData.name,
                  // Phone and location are read-only
                  avatar: formData.avatar,
                  facilityData: user.facilityData
                    ? {
                        ...user.facilityData,
                        ...(formData.timeZone ? { timeZone: formData.timeZone } : {}),
                      }
                    : user.role !== 'patient'
                      ? {
                          managerName: user.name,
                          ...(formData.timeZone ? { timeZone: formData.timeZone } : {}),
                        }
                      : undefined,
              });
              setIsEditing(false);
              showToast('Profile Updated Successfully');
          } catch (error) {
              showToast('Failed to update profile');
          } finally {
              setIsSaving(false);
          }
      }
  };

  const handleSaveTimeZone = async (nextTz: string) => {
    if (!user || user.role === 'patient' || user.role === 'superadmin') return;
    setSavingTimeZone(true);
    try {
      await onUpdateUser({
        ...user,
        facilityData: user.facilityData
          ? { ...user.facilityData, ...(nextTz ? { timeZone: nextTz } : { timeZone: undefined }) }
          : { managerName: user.name, ...(nextTz ? { timeZone: nextTz } : {}) },
      });
      setFormData((p) => ({ ...p, timeZone: nextTz }));
      showToast('Clinic timezone updated');
    } catch (e) {
      showToast('Failed to update clinic timezone');
    } finally {
      setSavingTimeZone(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image size too large. Max 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
         setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlanChange = async (planId: string) => {
      if (!canManageSubscription) return;
      if (user) {
          const selectedPlan = PLANS.find(p => p.id === planId);
          try {
              await onUpdateUser({
                  ...user,
                  subscriptionPlan: planId
              });
              setShowSubscriptionModal(false);
              showToast(`Switched to ${selectedPlan?.name}`);
          } catch (error) {
              showToast('Failed to update plan');
          }
      }
  };

  // Determine current plan
  const getCurrentPlan = () => {
     if (user?.subscriptionPlan) {
        return PLANS.find(p => p.id === user.subscriptionPlan) || PLANS[0];
     }
     if (user?.role === 'clinic') return PLANS[2];
     if (user?.role === 'pharmacy') return PLANS[1];
     return PLANS[0];
  };

  const currentPlan = getCurrentPlan();

  const SettingItem = ({ icon: Icon, title, value, type = 'arrow', onClick, destructive = false }: any) => (
    <div onClick={onClick} className="flex items-center justify-between p-4 bg-white dark:bg-[#1c1c1e] border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-[#2c2c2e] transition-colors cursor-pointer first:rounded-t-2xl last:rounded-b-2xl group">
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${destructive ? 'bg-red-50 text-red-500 dark:bg-red-900/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                <Icon size={20} />
            </div>
            <span className={`font-medium ${destructive ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{value}</span>
            {type === 'arrow' && <ChevronLeft size={16} className={`rotate-180 ${destructive ? 'text-red-300' : 'text-slate-400'}`} />}
            {type === 'toggle' && (
                <div className={`w-11 h-6 rounded-full relative transition-colors ${value ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${value ? 'translate-x-5' : ''}`} />
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up pb-12 relative">
      
      {/* Toast */}
      {toastMessage && (
         <div className="fixed top-24 right-6 bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-4 rounded-2xl shadow-xl z-[100] animate-slide-in-right flex items-center gap-3 font-semibold">
            <CheckCircle size={20} className="text-brand-500" />
            {toastMessage}
         </div>
      )}

      {/* Subscription Modal */}
      {canManageSubscription ? (
        <SubscriptionModal
          open={showSubscriptionModal}
          plans={PLANS}
          currentPlanId={currentPlan.id}
          onClose={() => setShowSubscriptionModal(false)}
          onSelectPlan={handlePlanChange}
        />
      ) : null}

      {/* Facility timezone (clinics/pharmacies) */}
      {!isPatient && user?.role !== 'superadmin' ? (
        <ClinicTimezoneCard
          value={formData.timeZone}
          saving={savingTimeZone}
          onChange={handleSaveTimeZone}
        />
      ) : null}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-3 rounded-full bg-white dark:bg-[#1c1c1e] text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-sm border border-slate-100 dark:border-slate-800 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
      </div>

      <div className={`grid grid-cols-1 ${canManageSubscription ? 'md:grid-cols-3' : ''} gap-6`}>
          
          {/* Left Col: Profile & Menu */}
          <div className={`${canManageSubscription ? 'md:col-span-2' : ''} space-y-6`}>
              
              {/* Profile Card */}
              <div className="bg-white dark:bg-[#1c1c1e] rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-all group">
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-slate-800 flex items-center justify-center text-3xl font-bold text-brand-700 dark:text-brand-300 shadow-inner overflow-hidden border-4 border-white dark:border-[#1c1c1e] group-hover:scale-105 transition-transform duration-500">
                            {formData.avatar ? (
                                <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                formData.name.charAt(0)
                            )}
                        </div>
                        {isEditing && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-[2px]"
                            >
                                <Camera size={20} className="text-white mb-1" />
                                <span className="text-[10px] font-bold text-white">CHANGE</span>
                            </button>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarChange}
                        />
                    </div>
                    
                    <div className="flex-1 w-full">
                        {isEditing ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={formData.name} 
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full p-3 bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Phone <span className="text-[10px] font-normal text-slate-400 lowercase">(read-only)</span></label>
                                        <div className="relative">
                                            <input 
                                                type="tel" 
                                                value={formData.phone} 
                                                readOnly
                                                className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-sm text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed font-medium"
                                                placeholder="Phone"
                                            />
                                            <Lock size={14} className="absolute right-3 top-3.5 text-slate-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Location <span className="text-[10px] font-normal text-slate-400 lowercase">(read-only)</span></label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={formData.location} 
                                                readOnly
                                                className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-sm text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed font-medium"
                                                placeholder="Location"
                                            />
                                            <Lock size={14} className="absolute right-3 top-3.5 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save Changes</>}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setIsEditing(false);
                                            setFormData({ 
                                                name: user?.name || '', 
                                                phone: user?.phone || '', 
                                                location: user?.location || '',
                                                avatar: user?.avatar || '',
                                                timeZone: user?.facilityData?.timeZone || ''
                                            });
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            <span className="capitalize px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-bold">{user?.role}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {user?.location}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-brand-50 dark:bg-brand-900/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none transition-opacity duration-500 opacity-50 group-hover:opacity-100" />
              </div>

              {/* Preferences Group */}
              <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Account & Preferences</h3>
                  <div className="rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <SettingItem 
                        icon={Smartphone} 
                        title="Phone Number" 
                        value={formData.phone} 
                        onClick={() => showToast('Contact support to change phone number')} 
                    />
                    <SettingItem 
                        icon={Bell} 
                        title="Notifications" 
                        value={notifications} 
                        type="toggle" 
                        onClick={() => {
                            setNotifications(!notifications);
                            showToast(`Notifications ${!notifications ? 'Enabled' : 'Disabled'}`);
                        }} 
                    />
                    <SettingItem 
                        icon={Globe} 
                        title="Language" 
                        value={language} 
                        onClick={() => {
                            const newLang = language === 'English' ? 'Swahili' : 'English';
                            setLanguage(newLang);
                            showToast(`Language changed to ${newLang}`);
                        }} 
                    />
                    <SettingItem 
                        icon={isDarkMode ? Moon : Sun} 
                        title="Appearance" 
                        value={isDarkMode ? "Dark Mode" : "Light Mode"}
                        type="toggle"
                        onClick={toggleTheme}
                    />
                    <SettingItem 
                        icon={Shield} 
                        title="Privacy & Security" 
                        value="" 
                        onClick={() => showToast('All data is encrypted & HIPAA compliant')} 
                    />
                  </div>
              </div>

              <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                    {isSuperadmin ? 'Account' : 'Support & Actions'}
                  </h3>
                  {isSuperadmin && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 px-2 leading-relaxed">
                      Incoming support from facilities is handled in <strong className="text-slate-700 dark:text-slate-300">System Overview → Support</strong>.
                    </p>
                  )}
                  {!isSuperadmin && (
                  <div className="rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-6">
                    <a href="mailto:support@mamasafe.ai" className="block">
                        <SettingItem icon={Mail} title="Contact Support" value="support@mamasafe.ai" />
                    </a>
                    <SettingItem 
                        icon={Zap} 
                        title="Feature Request" 
                        value="" 
                        onClick={() => showToast('Feature request submitted to dev team')} 
                    />
                  </div>
                  )}

                  <div className="rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden">
                    <SettingItem 
                        icon={LogOut} 
                        title="Sign Out" 
                        value="" 
                        destructive={true}
                        onClick={onLogout} 
                    />
                  </div>
              </div>

          </div>

          {/* Right Col: Subscription - hidden for patients and superadmin */}
          {canManageSubscription ? (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-0 px-2 md:hidden">
                Subscription
              </h3>
              <SubscriptionSummaryCard
                plan={currentPlan}
                onManage={() => setShowSubscriptionModal(true)}
              />
            </div>
          ) : null}
      </div>
    </div>
  );
};
