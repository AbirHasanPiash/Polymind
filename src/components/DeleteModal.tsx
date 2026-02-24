import { useEffect } from 'react';
import { TrashIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isDeleting?: boolean;
}

export default function DeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isDeleting = false 
}: DeleteModalProps) {
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={!isDeleting ? onClose : undefined}
      />
      
      {/* Modal Panel */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-[#1a1d26] border border-slate-200 dark:border-slate-800 shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          onClick={onClose}
          disabled={isDeleting}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            
            {/* Warning Icon */}
            <div className="mx-auto sm:mx-0 flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 ring-8 ring-red-50 dark:ring-red-500/5">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-500" aria-hidden="true" />
              </div>
            </div>

            {/* Text Content */}
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-6" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 dark:bg-[#11131a]/50 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            className="inline-flex w-full justify-center rounded-xl bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-white shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-white/10 hover:bg-slate-50 dark:hover:bg-white/10 sm:w-auto transition-all disabled:opacity-50"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-red-500/20"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}