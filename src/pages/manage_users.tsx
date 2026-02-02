import { useState, useEffect } from 'react';
import useSWR from 'swr';
import api from '../api/client';
import { 
  MagnifyingGlassIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import EditUserModal from '../components/EditUserModal';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function ManageUsersPage() {
  // State Management
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const size = 10;

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Data Fetching
  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== 'all' && { is_active: (statusFilter === 'active').toString() }),
    ...(roleFilter !== 'all' && { is_superuser: (roleFilter === 'admin').toString() }),
  });

  const { data, mutate, isLoading, error } = useSWR(
    `/admin/users?${queryParams.toString()}`, 
    fetcher,
    { keepPreviousData: true }
  );

  const totalPages = Math.ceil((data?.total_count || 0) / size);

  // Handlers
  const openEditModal = (user: any) => {
    setUserToEdit(user);
    setEditModalOpen(true);
  };

  const saveUserChanges = async (userId: string, updatePayload: any) => {
    try {
      await api.patch(`/admin/users/${userId}`, updatePayload);
      await mutate();
    } catch (err) {
      alert("Failed to update user.");
      throw err;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0b0f] text-gray-100 overflow-hidden font-sans">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Area */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/50 pb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <UserGroupIcon className="w-8 h-8 text-blue-500" />
                User Management
              </h1>
              <p className="text-sm text-gray-400 mt-2">Monitor access levels and manage user wallet balances.</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-sm">
            {/* Search */}
            <div className="relative md:col-span-3 group">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-white placeholder-gray-600"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select 
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-gray-300 cursor-pointer hover:bg-slate-900/80 transition-colors"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="user">Regular Users</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden overflow-x-auto shadow-2xl relative min-h-[400px]">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800/80 text-gray-400">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">User Details</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Status & Role</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Wallet</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading && !data ? (
                  <TableSkeleton rows={5} />
                ) : error ? (
                   <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-red-400">
                        <XCircleIcon className="w-8 h-8" />
                        <span className="font-medium">Failed to load users</span>
                      </div>
                    </td>
                  </tr>
                ) : data?.users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500 italic">
                      No users found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  data?.users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors group">
                      
                      {/* Name/Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-slate-800 ${u.is_superuser ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'}`}>
                            {u.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white truncate max-w-[150px] lg:max-w-[200px]">{u.full_name || 'No Name'}</p>
                            <p className="text-xs text-gray-500 font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                            u.is_active 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {u.is_active ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                            {u.is_active ? 'Active' : 'Banned'}
                          </span>
                          {u.is_superuser && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-orange-400 uppercase tracking-widest pl-1">
                              <ShieldCheckIcon className="w-3 h-3" /> Admin
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Wallet */}
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-500/10 rounded-lg">
                              <CreditCardIcon className="w-4 h-4 text-purple-400" />
                            </div>
                            <span className="text-sm font-mono font-medium text-gray-200">
                               {Number(u.wallet?.credits || 0).toLocaleString()} Credits
                            </span>
                         </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                        {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end">
                          <button 
                            onClick={() => openEditModal(u)}
                            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all" 
                            title="Edit User"
                          >
                            <PencilSquareIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-12">
            <p className="text-sm text-gray-500">
              Showing <span className="text-white font-medium">{(page - 1) * size + 1}</span> to <span className="text-white font-medium">{Math.min(page * size, data?.total_count || 0)}</span> of <span className="text-white font-medium">{data?.total_count || 0}</span>
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1 || isLoading}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-gray-400 disabled:opacity-30 hover:text-white hover:border-slate-700 transition-all"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Prev
              </button>
              
              <div className="flex items-center px-4 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs font-bold text-blue-400">
                {page} / {totalPages || 1}
              </div>

              <button 
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-gray-400 disabled:opacity-30 hover:text-white hover:border-slate-700 transition-all"
              >
                Next
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={saveUserChanges}
        user={userToEdit}
      />

    </div>
  );
}

// Minimal loading skeleton for table rows
function TableSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-800/50">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-800 rounded"></div>
                <div className="h-3 w-24 bg-slate-800 rounded"></div>
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="space-y-2">
              <div className="h-5 w-16 bg-slate-800 rounded-full"></div>
              <div className="h-3 w-12 bg-slate-800 rounded pl-1"></div>
            </div>
          </td>
          <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-800 rounded"></div></td>
          <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-800 rounded"></div></td>
          <td className="px-6 py-4"><div className="flex justify-end gap-2"><div className="h-8 w-8 bg-slate-800 rounded-lg"></div></div></td>
        </tr>
      ))}
    </>
  );
}