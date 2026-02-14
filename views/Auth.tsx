
import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { UserRole, UserProfile } from '../types';
import { backend } from '../services/backend';
import { 
  Loader2, AlertCircle, ArrowRight, Eye, EyeOff, Globe, Check, ChevronDown, ChevronLeft, Mail, Building2, Pill, User
} from 'lucide-react';

// Data: List of African Countries with ISO Codes and Dial Codes
const AFRICAN_COUNTRIES = [
  { name: 'Kenya', code: 'KE', dial: '+254', flag: '🇰🇪' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', dial: '+27', flag: '🇿🇦' },
  { name: 'Uganda', code: 'UG', dial: '+256', flag: '🇺🇬' },
  { name: 'Tanzania', code: 'TZ', dial: '+255', flag: '🇹🇿' },
  { name: 'Rwanda', code: 'RW', dial: '+250', flag: '🇷🇼' },
  { name: 'Ethiopia', code: 'ET', dial: '+251', flag: '🇪🇹' },
  { name: 'Ghana', code: 'GH', dial: '+233', flag: '🇬🇭' },
].sort((a, b) => a.name.localeCompare(b.name));

interface InputFieldProps {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  icon?: React.ReactNode;
}

const InputField = ({ 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  required = true,
  icon 
}: InputFieldProps) => (
  <div className="relative group">
      <input 
          type={type} 
          required={required}
          className="w-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-900 dark:text-white h-[52px] px-4 rounded-xl border border-transparent focus:bg-white dark:focus:bg-black focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-[15px]"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
      />
      {icon && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
  </div>
);

// Google Button Component
const GoogleButton = ({ onClick, loading }: { onClick: () => void, loading: boolean }) => (
  <button 
    type="button"
    onClick={onClick}
    disabled={loading}
    className="w-full h-[52px] bg-white dark:bg-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#3a3a3c] text-slate-700 dark:text-white rounded-full font-bold text-[15px] transition-all shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] mb-4"
  >
    {loading ? (
      <Loader2 className="animate-spin text-slate-400" size={20} />
    ) : (
      <>
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Continue with Google</span>
      </>
    )}
  </button>
);

interface AuthProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthView: React.FC<AuthProps> = ({ onSuccess }) => {
  const [view, setView] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [role, setRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Login State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regData, setRegData] = useState({
      name: '',
      email: '',
      phone: '',
      password: '',
      country: 'Kenya',
      location: '',
      managerName: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const { user } = await backend.auth.login(identifier.trim(), password.trim());
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Incorrect ID or Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    
    try {
      // Pass the currently selected role (useful if this triggers registration)
      // Default to patient if in welcome view, otherwise use selected role
      const targetRole = view === 'welcome' ? 'patient' : role;
      const { user } = await backend.auth.loginWithProvider(targetRole);
      onSuccess(user);
    } catch (err: any) {
      // If it's a redirect message, that's expected - don't show as error
      if (err.message?.includes('Redirecting')) {
        // The redirect will happen automatically
        // User will be redirected back after Google auth
        return;
      }
      setError(err.message || 'Google Login failed. Please make sure Google OAuth is configured in Supabase.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const newUser = {
        id: Date.now().toString(),
        role: role,
        name: regData.name,
        email: regData.email,
        phone: regData.phone,
        location: regData.location,
        countryCode: AFRICAN_COUNTRIES.find(c => c.name === regData.country)?.code || 'KE',
        pin: regData.password, // Backend expects 'pin' field but treats as password
        facilityData: role !== 'patient' ? { managerName: regData.managerName } : undefined
      };
      const { user } = await backend.auth.register(newUser as any);
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#F5F5F7] dark:bg-black font-sans">
        
        {/* Apple-style Animated Mesh Gradient Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-brand-400/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
             <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-blue-400/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
        </div>

        {/* Central Card */}
        <div className="relative z-10 w-full max-w-[440px] px-6">
            <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/50 dark:border-white/10 transition-all duration-500 relative">
                
                {/* Back Button (Professional Top Left Position) */}
                {view !== 'welcome' && (
                    <button 
                        onClick={() => {
                            setView('welcome');
                            setError('');
                        }}
                        className="absolute top-8 left-8 p-2 -ml-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                        title="Back"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {/* Logo Area */}
                <div className="flex flex-col items-center mb-8">
                    <Logo size={48} className="mb-6 scale-110" />
                    
                    {view === 'welcome' && (
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Sign In</h1>
                    )}
                    {view === 'login' && (
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Sign In</h1>
                    )}
                    {view === 'register' && (
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create {role === 'clinic' ? 'Clinic' : role === 'pharmacy' ? 'Pharmacy' : 'Patient'} ID</h1>
                    )}
                </div>

                {/* --- VIEWS --- */}

                {/* 1. Welcome View */}
                {view === 'welcome' && (
                    <div className="space-y-4 animate-fade-in">
                        <p className="text-center text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-[17px] font-medium">
                            to continue to MamaSafe
                        </p>

                        <button 
                            onClick={() => setView('login')}
                            className="w-full h-[52px] bg-slate-900 dark:bg-white text-white dark:text-black rounded-full font-bold text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg mb-2"
                        >
                            Sign In
                        </button>
                        
                        <GoogleButton onClick={handleGoogleLogin} loading={loading} />

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                            <div className="relative flex justify-center text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-transparent px-3 bg-white/0 backdrop-blur-xl">Create Account</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => { setRole('clinic'); setView('register'); }}
                                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] hover:bg-slate-100 dark:hover:bg-[#3a3a3c] transition-colors gap-2 group"
                            >
                                <Building2 size={24} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Clinic</span>
                            </button>
                            <button 
                                onClick={() => { setRole('pharmacy'); setView('register'); }}
                                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] hover:bg-slate-100 dark:hover:bg-[#3a3a3c] transition-colors gap-2 group"
                            >
                                <Pill size={24} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pharmacy</span>
                            </button>
                        </div>
                        
                        <button 
                             onClick={() => { setRole('patient'); setView('register'); }}
                             className="w-full py-3 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                        >
                            Register as Patient
                        </button>
                    </div>
                )}

                {/* 2. Login View */}
                {view === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4 animate-slide-in-right">
                        <div className="space-y-3">
                            <InputField 
                                placeholder="Email, Phone or Username" 
                                value={identifier} 
                                onChange={(e: any) => { setIdentifier(e.target.value); setError(''); }} 
                            />
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    className="w-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-900 dark:text-white h-[52px] px-4 rounded-xl border border-transparent focus:bg-white dark:focus:bg-black focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-[15px]"
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(''); }}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl flex items-center gap-2 justify-center animate-pulse">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="pt-2 space-y-3">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full h-[52px] bg-brand-600 hover:bg-brand-700 text-white rounded-full font-bold text-[15px] transition-all shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Sign In'} <ArrowRight size={18} />
                            </button>
                            
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OR</span>
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                            </div>
                            
                            <GoogleButton onClick={handleGoogleLogin} loading={loading} />
                        </div>
                    </form>
                )}

                {/* 3. Register View */}
                {view === 'register' && (
                    <form onSubmit={handleRegister} className="space-y-3 animate-slide-in-right">
                        <InputField 
                            placeholder={role === 'patient' ? "Full Name" : "Facility Name"} 
                            value={regData.name} 
                            onChange={(e: any) => { setRegData({...regData, name: e.target.value}); setError(''); }} 
                        />
                        
                        {role !== 'patient' && (
                            <InputField 
                                placeholder="Manager Name" 
                                value={regData.managerName} 
                                onChange={(e: any) => setRegData({...regData, managerName: e.target.value})} 
                            />
                        )}

                        <InputField 
                            type="tel"
                            placeholder="Phone Number (+254...)" 
                            value={regData.phone} 
                            onChange={(e: any) => { setRegData({...regData, phone: e.target.value}); setError(''); }} 
                        />
                        
                        <InputField 
                            type="email"
                            placeholder="Email Address" 
                            required={false}
                            value={regData.email} 
                            onChange={(e: any) => setRegData({...regData, email: e.target.value})} 
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <InputField 
                                placeholder="City/Location" 
                                value={regData.location} 
                                onChange={(e: any) => setRegData({...regData, location: e.target.value})} 
                            />
                            <div className="relative">
                                <select 
                                    className="w-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-900 dark:text-white h-[52px] px-4 pr-8 rounded-xl border border-transparent focus:bg-white dark:focus:bg-black focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all appearance-none font-medium text-[15px]"
                                    value={regData.country}
                                    onChange={(e) => setRegData({...regData, country: e.target.value})}
                                >
                                    {AFRICAN_COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="relative pt-2">
                             <input 
                                type={showPassword ? "text" : "password"} 
                                required
                                className="w-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-900 dark:text-white h-[52px] px-4 rounded-xl border border-transparent focus:bg-white dark:focus:bg-black focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-[15px]"
                                placeholder="Create Password"
                                value={regData.password}
                                onChange={e => { setRegData({...regData, password: e.target.value}); setError(''); }}
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-[10%] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl flex items-center gap-2 justify-center animate-pulse">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="pt-4 space-y-3">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full h-[52px] bg-brand-600 hover:bg-brand-700 text-white rounded-full font-bold text-[15px] transition-all shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
                            </button>
                            
                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OR</span>
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                            </div>
                            
                            <GoogleButton onClick={handleGoogleLogin} loading={loading} />
                        </div>
                    </form>
                )}

            </div>
            
            <p className="text-center text-slate-400 text-xs font-medium mt-8">
                &copy; {new Date().getFullYear()} MamaSafe AI Inc. <br/> HIPAA Compliant & Secure.
            </p>
        </div>

    </div>
  );
};
