import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  ArchiveBoxIcon, 
  CurrencyDollarIcon,
  BoltIcon,
  XMarkIcon,
  CalculatorIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../api/client';
import DeleteModal from '../components/DeleteModal';

// Types
interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  credits: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
}

// Logic Helpers
const API_COST_PER_CREDIT = 0.025; 
const STRIPE_FIXED_FEE = 0.30;
const STRIPE_PERCENT_FEE = 0.029;

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function ManagePackagesPage() {
  const { data: packages, error, isLoading } = useSWR<Package[]>('/packages/', fetcher);
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  
  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    credits: '',
    is_featured: false,
    is_active: true
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Sorting & Grouping
  const sortedPackages = useMemo(() => {
    if (!packages) return [];
    return [...packages].sort((a, b) => {
        // Active first
        if (a.is_active === b.is_active) return 0;
        return a.is_active ? -1 : 1;
    });
  }, [packages]);

  // Handlers

  const openCreate = () => {
    setEditingPackage(null);
    setFormError(null);
    setFormData({ name: '', description: '', price: '', credits: '', is_featured: false, is_active: true });
    setIsModalOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormError(null);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price.toString(),
      credits: pkg.credits.toString(),
      is_featured: pkg.is_featured,
      is_active: pkg.is_active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        credits: parseFloat(formData.credits)
      };

      if (editingPackage) {
        await api.put(`/packages/${editingPackage.id}`, payload);
      } else {
        await api.post('/packages/', payload);
      }
      
      mutate('/packages/');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      // specific error handling for duplicate names
      if (err.response?.status === 400 && err.response?.data?.detail?.includes('exists')) {
        setFormError("A package with this name already exists (possibly in the archived list below). Please edit that one instead.");
      } else {
        setFormError("Failed to save package. Please check your inputs.");
      }
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/packages/${itemToDelete}`);
      mutate('/packages/');
      setDeleteModalOpen(false);
    } catch (err) {
      alert("Failed to delete package.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) return (
    <div className="flex items-center justify-center h-full text-red-500 gap-2">
        <ExclamationTriangleIcon className="w-6 h-6" />
        <span>Failed to load packages</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0a0b0f] via-[#0d0e14] to-[#0a0b0f] relative overflow-hidden overflow-y-auto">
      
      {/* Delete Modal */}
      <DeleteModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Archive Package"
        message="Are you sure? This will hide the package from users, but existing transactions remain safe."
        isDeleting={isDeleting}
      />

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <ArchiveBoxIcon className="w-8 h-8 text-blue-500" />
              Package Management
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">Create and manage billing tiers for your users.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95 w-full sm:w-auto justify-center"
          >
            <PlusIcon className="w-5 h-5" />
            Create Package
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Skeleton Loader Grid
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {sortedPackages?.map((pkg) => (
                <PackageCard 
                  key={pkg.id} 
                  pkg={pkg} 
                  onEdit={() => openEdit(pkg)} 
                  onDelete={() => { setItemToDelete(pkg.id); setDeleteModalOpen(true); }} 
                />
              ))}
              
              {/* Empty State Add Button */}
              {sortedPackages?.length === 0 && (
                <button 
                    onClick={openCreate}
                    className="group relative flex flex-col items-center justify-center p-8 h-64 border-2 border-dashed border-slate-800 rounded-2xl hover:border-blue-500/50 hover:bg-slate-900/30 transition-all"
                >
                    <div className="p-4 rounded-full bg-slate-900 group-hover:bg-blue-900/20 mb-4 transition-colors">
                        <PlusIcon className="w-8 h-8 text-slate-600 group-hover:text-blue-400" />
                    </div>
                    <p className="text-slate-500 font-medium">Create your first package</p>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Slide-over Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Panel */}
          <div className="relative w-full max-w-lg h-full bg-[#0f1117] border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editingPackage ? 'Edit Package' : 'New Package'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Error Message */}
              {formError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex gap-2 items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <p>{formError}</p>
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Package Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Creator Pro"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Short description for the pricing card..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all h-20 resize-none"
                  />
                </div>
              </div>

              {/* Economics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Price (USD)</label>
                    <div className="relative">
                        <CurrencyDollarIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                        <input
                            required
                            type="number"
                            step="0.01"
                            min="0.50"
                            value={formData.price}
                            onChange={e => setFormData({...formData, price: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-green-500/50 outline-none transition-all font-mono"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Credits Amount</label>
                    <div className="relative">
                        <BoltIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
                        <input
                            required
                            type="number"
                            step="0.1"
                            min="1"
                            value={formData.credits}
                            onChange={e => setFormData({...formData, credits: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all font-mono"
                        />
                    </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.is_featured ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.is_featured ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input type="checkbox" className="hidden" checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />
                    <span className="text-sm font-medium text-gray-300">Featured</span>
                </label>

                <div className="w-px bg-slate-700 hidden sm:block"></div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.is_active ? 'bg-green-600' : 'bg-slate-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input type="checkbox" className="hidden" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-300">Active Status</span>
                        <span className="text-[10px] text-gray-500">Uncheck to archive</span>
                    </div>
                </label>
              </div>

              {/* PROFITABILITY ANALYZER */}
              <ProfitAnalyzer price={parseFloat(formData.price) || 0} credits={parseFloat(formData.credits) || 0} />

            </form>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50">
              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
              >
                {editingPackage ? 'Save Changes' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub Components

function SkeletonCard() {
  return (
    <div className="relative border border-slate-800 bg-[#0f1117] rounded-2xl p-6 flex flex-col h-full animate-pulse">
      {/* Badges */}
      <div className="absolute top-4 right-4 flex gap-2">
         <div className="h-5 w-16 bg-slate-800 rounded"></div>
      </div>

      {/* Content */}
      <div className="mb-6 flex-1 space-y-3">
        <div className="h-6 w-3/4 bg-slate-800 rounded"></div>
        <div className="space-y-2">
            <div className="h-4 w-full bg-slate-800 rounded"></div>
            <div className="h-4 w-2/3 bg-slate-800 rounded"></div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg p-3 bg-slate-900/50 border border-slate-800 h-16"></div>
        <div className="rounded-lg p-3 bg-slate-900/50 border border-slate-800 h-16"></div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800/50 mt-auto flex gap-2">
        <div className="flex-1 h-9 bg-slate-800 rounded-lg"></div>
        <div className="w-9 h-9 bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  );
}

function PackageCard({ pkg, onEdit, onDelete }: { pkg: Package, onEdit: () => void, onDelete: () => void }) {
    // Styling differentiation for inactive packages
    const isActive = pkg.is_active;

    return (
        <div className={`relative border rounded-2xl p-6 transition-all group overflow-hidden flex flex-col h-full
            ${isActive 
                ? pkg.is_featured 
                    ? 'bg-[#0f1117] border-blue-500/50 shadow-lg shadow-blue-900/10' 
                    : 'bg-[#0f1117] border-slate-800 hover:border-slate-700'
                : 'bg-[#0f1117]/50 border-slate-800/50 border-dashed opacity-75 hover:opacity-100 grayscale-[0.3] hover:grayscale-0'
            }
        `}>
            
            {/* Status Badges */}
            <div className="absolute top-4 right-4 flex gap-2">
                {pkg.is_featured && isActive && (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded border border-blue-500/20">Featured</span>
                )}
                {!isActive && (
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase rounded border border-yellow-500/20 flex items-center gap-1">
                        <ArchiveBoxIcon className="w-3 h-3" /> Archived
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="mb-6 flex-1">
                <h3 className={`text-lg font-bold mb-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {pkg.name}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">{pkg.description || "No description provided."}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className={`rounded-lg p-3 border ${isActive ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-900/30 border-slate-800/50'}`}>
                    <p className="text-xs text-gray-500 uppercase">Price</p>
                    <p className={`text-xl font-mono ${isActive ? 'text-white' : 'text-gray-400'}`}>${pkg.price}</p>
                </div>
                <div className={`rounded-lg p-3 border ${isActive ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-900/30 border-slate-800/50'}`}>
                    <p className="text-xs text-gray-500 uppercase">Credits</p>
                    <p className={`text-xl font-mono ${isActive ? 'text-purple-400' : 'text-purple-400/60'}`}>{pkg.credits}</p>
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-800/50 mt-auto">
                <button 
                    onClick={onEdit} 
                    className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-colors ${
                        isActive 
                        ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                        : 'bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-500 border border-yellow-600/20'
                    }`}
                >
                    {isActive ? (
                        <> <PencilSquareIcon className="w-4 h-4" /> Edit </>
                    ) : (
                        <> <ArrowPathIcon className="w-4 h-4" /> Restore </>
                    )}
                </button>
                
                {/* Only show archive button if active */}
                {isActive && (
                    <button 
                        onClick={onDelete} 
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Archive Package"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

function ProfitAnalyzer({ price, credits }: { price: number, credits: number }) {
    const analysis = useMemo(() => {
        if (!price || !credits) return null;

        // Stripe Fee Calculation
        const stripeFee = (price * STRIPE_PERCENT_FEE) + STRIPE_FIXED_FEE;
        
        // Operational Cost (API Fees)
        const operationalCost = credits * API_COST_PER_CREDIT;

        const totalCost = stripeFee + operationalCost;
        const profit = price - totalCost;
        const margin = (profit / price) * 100;

        return { stripeFee, operationalCost, totalCost, profit, margin };
    }, [price, credits]);

    if (!analysis) return (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex items-center justify-center text-gray-500 text-sm gap-2">
            <CalculatorIcon className="w-5 h-5" />
            Enter Price & Credits to see profit analysis
        </div>
    );

    const isProfitable = analysis.profit > 0;

    return (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Projected Unit Economics</span>
            </div>
            
            <div className="p-4 space-y-3">
                {/* Breakdown */}
                <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-400">
                        <span>Revenue</span>
                        <span className="text-white font-mono">${price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                        <span>Stripe Fees (2.9% + 30¢)</span>
                        <span className="text-red-400 font-mono">-${analysis.stripeFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                        <span className="flex items-center gap-1">
                            Est. API Costs 
                            <span className="text-[10px] bg-slate-800 px-1 rounded text-gray-500">Based on 4x Margin</span>
                        </span>
                        <span className="text-orange-400 font-mono">-${analysis.operationalCost.toFixed(2)}</span>
                    </div>
                </div>

                <div className="h-px bg-slate-800 my-2" />

                {/* Result */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Net Profit</p>
                        <p className={`text-xl font-mono font-bold ${isProfitable ? 'text-green-400' : 'text-red-500'}`}>
                            ${analysis.profit.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold">Margin</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            analysis.margin > 30 ? 'bg-green-500/10 text-green-400' :
                            analysis.margin > 0 ? 'bg-yellow-500/10 text-yellow-400' : 
                            'bg-red-500/10 text-red-400'
                        }`}>
                            {analysis.margin.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}