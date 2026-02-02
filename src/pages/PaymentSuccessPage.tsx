import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 1. Refresh User Wallet Balance immediately
    refreshProfile();

    // 2. Countdown timer for auto-redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard/billing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, refreshProfile]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0b0f] relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Animated Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="w-24 h-24 bg-[#0f1117] border-2 border-green-500 rounded-full flex items-center justify-center relative shadow-2xl shadow-green-900/50">
             <CheckCircleIcon className="w-12 h-12 text-green-500" />
          </div>
          {/* Decorative Sparkles */}
          <SparklesIcon className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-bounce" />
          <SparklesIcon className="absolute bottom-0 -left-4 w-6 h-6 text-yellow-400 animate-pulse delay-75" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
        <p className="text-gray-400 mb-8">
          Thank you for your purchase. Your credits have been added to your wallet securely.
        </p>

        <div className="bg-[#13161f] border border-gray-800 rounded-xl p-4 w-full mb-8 flex flex-col items-center">
             <p className="text-xs text-gray-500 uppercase font-medium mb-1">Transaction ID</p>
             <p className="text-sm font-mono text-gray-300 break-all">
                {searchParams.get('session_id') || 'Processing...'}
             </p>
        </div>

        <button 
          onClick={() => navigate('/dashboard/billing')}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 group"
        >
          Go to Billing
          <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="mt-6 text-sm text-gray-500">
          Redirecting in <span className="text-white font-mono">{countdown}</span> seconds...
        </p>
      </div>
    </div>
  );
}