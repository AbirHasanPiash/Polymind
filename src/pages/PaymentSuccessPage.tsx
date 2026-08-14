import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/auth-context';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Credits are granted by Stripe's webhook, which can land a moment after the
    // browser is redirected here. Re-checking on each tick means the balance
    // appears as soon as it settles, rather than looking unpaid until a reload.
    const timer = setInterval(() => {
      void refreshProfile();
      setCountdown((remaining) => {
        if (remaining <= 1) {
          clearInterval(timer);
          navigate('/dashboard/billing', { replace: true });
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // refreshProfile is memoised in AuthContext. As an unstable function it
    // restarted this effect on every render and refetched the profile in a loop.
  }, [navigate, refreshProfile]);

  return (
    <div className="relative flex h-full items-center justify-center overflow-y-auto app-surface px-4 py-8 sm:px-6 lg:px-8 custom-scrollbar">
      
      {/* Subtle gradient orb - Green tint for success context */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-green-500/5 dark:bg-green-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Card container */}
        <div className="bg-white dark:bg-[#11131a] backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-green-900/5 dark:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Success icon with animation */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-green-100 dark:bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
              {/* Icon container */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-green-50 dark:bg-green-500/10 border-2 border-green-100 dark:border-green-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-500 animate-in zoom-in duration-500 delay-150" />
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 tracking-tight">
              Payment Successful!
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 leading-relaxed px-2">
              Your credits have been added to your wallet.
            </p>
          </div>

          {/* Transaction ID */}
          <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-2 text-center">
              Transaction ID
            </p>
            <p className="text-xs sm:text-sm font-mono text-slate-700 dark:text-gray-300 text-center break-all px-2">
              {searchParams.get('session_id') || 'Processing...'}
            </p>
          </div>

          {/* Action button */}
          <button 
            onClick={() => navigate('/dashboard/billing')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 flex items-center justify-center gap-2 group text-sm sm:text-base"
          >
            Go to Billing
            <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>

          {/* Countdown */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-500">
              Redirecting in{' '}
              <span className="inline-flex items-center justify-center min-w-[2ch] font-mono text-slate-900 dark:text-white font-semibold">
                {countdown}
              </span>
              {' '}second{countdown !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}