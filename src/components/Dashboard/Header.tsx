import { Link } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { ModeToggle } from '../mode-toggle';

type HeaderProps = {
  toggleSidebar: () => void;
  isMobile: boolean;
};

export default function Header({ toggleSidebar, isMobile }: HeaderProps) {
  const { user } = useAuth();

  const rawCredits = user?.wallet?.credits ? Number(user.wallet.credits) : 0;
  
  const displayCredits = rawCredits.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-blue-200 dark:border-gray-800 bg-blue-50 dark:bg-[#0a0b0f]/80 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300">
      
      {/* Mobile Toggle & Title */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {isMobile && (
          <button 
            onClick={toggleSidebar}
            className="p-2 text-blue-700 dark:text-gray-400 hover:text-blue-900 dark:hover:text-white rounded-md hover:bg-blue-200 dark:hover:bg-gray-800 transition-colors"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        )}
        
        {/* Brand Name */}
        <Link 
          to="/" 
          className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 dark:from-blue-400 dark:to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity whitespace-nowrap"
        >
           MultiAiModel
        </Link>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        
        {/* Credits Badge */}
        <div className="flex flex-row items-center gap-2 bg-white dark:bg-[#1a1d26] border border-blue-200 dark:border-gray-700/50 rounded-full px-3 sm:px-4 py-1.5 shadow-sm transition-colors duration-300 whitespace-nowrap shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0"></div>
            <span className="text-xs font-mono text-blue-900 dark:text-gray-300">
              {displayCredits} <span className="hidden sm:inline text-blue-500 dark:text-gray-500">credits</span>
            </span>
        </div>

        {/* Dark/Light Mode Toggle */}
        <ModeToggle />

      </div>
    </header>
  );
}