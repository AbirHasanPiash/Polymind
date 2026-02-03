import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  UserIcon, 
  EnvelopeIcon, 
  CreditCardIcon, 
  ShieldCheckIcon,
  ArrowPathIcon,
  LockClosedIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, data: any) => Promise<void>;
  user: any;
}

export default function EditUserModal({ isOpen, onClose, onSave, user }: EditUserModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    is_active: true,
    is_superuser: false,
    credits: ''
  });

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        is_active: user.is_active,
        is_superuser: user.is_superuser,
        credits: user.wallet?.credits?.toString() || '0'
      });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        // Convert back to number/float when sending to backend
        credits: parseFloat(formData.credits),
        is_superuser: formData.is_superuser
      };
      await onSave(user.id, payload);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget && !isSaving) onClose(); }}
    >
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" />

      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#0f111a] border border-slate-800 shadow-2xl animate-[slideUp_0.3s_ease-out]">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 opacity-80" />

        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/50 bg-slate-900/30">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <UserIcon className="w-5 h-5" />
            </span>
            Edit User Details
          </h3>
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1 flex items-center gap-1">
                Full Name <LockClosedIcon className="w-3 h-3" />
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="text"
                  disabled
                  value={formData.full_name}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-400 cursor-not-allowed focus:outline-none select-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1 flex items-center gap-1">
                Email Address <LockClosedIcon className="w-3 h-3" />
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-400 cursor-not-allowed focus:outline-none select-none"
                />
              </div>
            </div>

             <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1 flex items-center gap-1">
                Account Status <LockClosedIcon className="w-3 h-3" />
              </label>
              <div className={`w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/30 ${formData.is_active ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-red-500'}`}>
                {formData.is_active ? (
                  <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                ) : (
                  <XCircleIcon className="w-6 h-6 text-red-500" />
                )}
                <div>
                   <p className={`text-sm font-bold ${formData.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formData.is_active ? 'Active Account' : 'Suspended Account'}
                   </p>
                </div>
              </div>
            </div>

            {/* Wallet Credits */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-blue-400 ml-1">Wallet Balance (Credits)</label>
              <div className="relative group">
                <CreditCardIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={formData.credits}
                  onChange={(e) => setFormData({...formData, credits: e.target.value})}
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-gray-600 font-mono"
                />
              </div>
            </div>

            <div className="md:col-span-2 p-4 bg-slate-900/30 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    Admin Privileges
                    {formData.is_superuser && <ShieldCheckIcon className="w-4 h-4 text-orange-400" />}
                  </span>
                  <span className="text-xs text-gray-500">Grants full system access and override capabilities</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_superuser: !formData.is_superuser})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${formData.is_superuser ? 'bg-orange-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_superuser ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-slate-800/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
    </div>
  );
}