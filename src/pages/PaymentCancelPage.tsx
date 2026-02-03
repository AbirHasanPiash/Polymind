import { useNavigate } from 'react-router-dom';
import { XCircleIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      {/* Subtle gradient orb */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card container */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Cancel icon with animation */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-red-500/10 rounded-full blur-2xl"></div>
              {/* Icon container */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-red-500/10 border-2 border-red-500/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                <XCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 animate-in zoom-in duration-500 delay-150" />
              </div>
            </div>
          </div>

          {/* Title and description */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 tracking-tight">
              Payment Cancelled
            </h1>
            <p className="text-sm sm:text-base text-gray-400 leading-relaxed px-2">
              No charges were made. The transaction was cancelled during checkout.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 mb-6 sm:mb-8">
            <button 
              onClick={() => navigate('/dashboard/billing')}
              className="w-full bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-semibold py-3 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group text-sm sm:text-base"
            >
              <ArrowUturnLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-200" />
              Return to Billing
            </button>
            
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-800/30 hover:bg-gray-800/50 active:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600/50 text-gray-300 hover:text-white font-medium py-3 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl transition-all duration-200 text-sm sm:text-base"
            >
              Go to Dashboard
            </button>
          </div>

          {/* Security notice */}
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500 bg-gray-800/30 border border-gray-700/30 px-4 py-3 rounded-xl sm:rounded-2xl">
            <ShieldCheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
            <span className="leading-tight">Your payment data is secure and was not saved.</span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>
    </div>
  );
}