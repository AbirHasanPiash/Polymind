import { useNavigate } from 'react-router-dom';
import { XCircleIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0a0b0f] relative overflow-hidden">
      
      <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
        
        {/* Icon */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl"></div>
          <div className="w-20 h-20 bg-[#0f1117] border border-red-500/30 rounded-full flex items-center justify-center relative">
             <XCircleIcon className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Payment Cancelled</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          No charges were made to your card. The transaction was cancelled during the checkout process.
        </p>

        <div className="space-y-3 w-full">
            <button 
                onClick={() => navigate('/dashboard/billing')}
                className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                Return to Billing
            </button>
            
            <button 
                onClick={() => navigate('/dashboard')}
                className="w-full bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-medium py-3.5 rounded-xl transition-colors"
            >
                Go to Dashboard
            </button>
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-gray-500 bg-white/5 px-4 py-2 rounded-full">
            <ShieldCheckIcon className="w-3 h-3" />
            <span>Your payment data is secure and was not saved.</span>
        </div>
      </div>
    </div>
  );
}