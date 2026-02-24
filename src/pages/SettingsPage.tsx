import { useState, useEffect } from 'react';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  CreditCardIcon, 
  ShieldCheckIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Initialize form state from Context
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
    }
  }, [user]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // Send Update to Backend
      await api.patch('/users/me', { 
        full_name: fullName 
      });

      await refreshProfile();
      
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      console.error("Update failed", error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <div className="p-8 text-center text-slate-500 dark:text-gray-500">Loading profile...</div>;

  return (
    <div className="flex flex-col h-full bg-blue-50 dark:bg-gradient-to-br dark:from-[#0a0b0f] dark:via-[#0d0e14] dark:to-[#0a0b0f] text-slate-900 dark:text-gray-100 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] transition-colors duration-300">
      <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <UserCircleIcon className="w-8 h-8 text-blue-600 dark:text-blue-500" />
            Account Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">Manage your personal information and view account status.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Identity Card & Wallet */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Identity Card */}
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 opacity-50" />
              
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg mb-4 ring-4 ring-slate-100 dark:ring-slate-800/50 ${
                  user.is_superuser 
                    ? 'bg-gradient-to-tr from-red-500 to-orange-500 text-white' 
                    : 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white'
                }`}>
                  {user.email[0].toUpperCase()}
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  {user.full_name || 'Anonymous User'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 font-mono mb-4">{user.email}</p>

                {/* Role Badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  user.is_superuser 
                    ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' 
                    : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                }`}>
                  {user.is_superuser ? (
                    <><ShieldCheckIcon className="w-3 h-3" /> Administrator</>
                  ) : (
                    <><UserCircleIcon className="w-3 h-3" /> Standard User</>
                  )}
                </div>
              </div>
            </div>

            {/* Wallet Summary Card */}
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500 mb-1">Current Balance</p>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white font-mono">
                    {Number(user.wallet?.credits || 0).toLocaleString()}
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Available Credits</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-500/10 rounded-xl">
                  <CreditCardIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                Personal Information
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                {/* Email Field (Read Only) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-gray-400">Email Address</label>
                  <div className="relative">
                    <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-600" />
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-slate-100 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-500 dark:text-gray-500 cursor-not-allowed select-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-gray-600 italic">
                      Cannot be changed
                    </div>
                  </div>
                </div>

                {/* Full Name Field (Editable) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-gray-300">Full Name</label>
                  <div className="relative group">
                    <UserCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600"
                    />
                  </div>
                </div>

                {/* Status Message Area */}
                <div className="h-6">
                  {message && (
                    <div className={`flex items-center gap-2 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300 ${message.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-red-400'}`}>
                      {message.type === 'success' ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationCircleIcon className="w-4 h-4" />}
                      {message.text}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800/50">
                  <button
                    type="submit"
                    disabled={isSaving || fullName === user.full_name}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    {isSaving ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Account Status Indicator */}
            <div className="mt-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${user.is_active ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-rose-100 dark:bg-red-500/10'}`}>
                   {user.is_active 
                    ? <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" /> 
                    : <ExclamationCircleIcon className="w-5 h-5 text-rose-600 dark:text-red-500" />
                   }
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Account Status</h4>
                  <p className="text-xs text-slate-500 dark:text-gray-400">{user.is_active ? 'Your account is fully active.' : 'Your account is restricted.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}