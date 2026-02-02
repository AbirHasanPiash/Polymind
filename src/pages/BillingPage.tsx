import { useState } from "react";
import useSWR from "swr";
import {
  CreditCardIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";

// Types

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  is_featured: boolean;
  is_active: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  credits_added: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
  stripe_session_id: string;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function BillingPage() {
  const { user } = useAuth();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // Data Fetching
  const { data: packages, isLoading: loadingPackages } = useSWR<Package[]>(
    "/packages/",
    fetcher
  );
  const { data: transactions, isLoading: loadingHistory } = useSWR<
    Transaction[]
  >("/payments/history", fetcher);

  // Handle Purchase
  const handlePurchase = async (pkg: Package) => {
    setPurchasingId(pkg.id);
    try {
      const response = await api.post(
        `/payments/create-checkout-session/${pkg.id}`
      );
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error("Purchase failed", error);
      alert("Failed to initiate checkout. Please try again.");
      setPurchasingId(null);
    }
  };

  const rawCredits = user?.wallet?.credits ? Number(user.wallet.credits) : 0;

  const displayCredits = rawCredits.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!user) return <Loading />;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0a0b0f] via-[#0d0e14] to-[#0a0b0f] relative overflow-hidden overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-24">
        {/* Header & Wallet Section */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Left: Title & Intro */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
              <CreditCardIcon className="w-8 h-8 text-blue-500" />
              Billing & Credits
            </h1>
            <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
              Manage your subscription and credit balance. Purchase more credits
              to generate high-fidelity AI avatars and voices.
            </p>

            <div className="flex items-center gap-4 mt-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                <span>Secure Payment via Stripe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-purple-500" />
                <span>Instant Credit Delivery</span>
              </div>
            </div>
          </div>

          {/* Right: Digital Wallet Card */}
          <div className="w-full lg:w-96">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-white/10 p-6 shadow-2xl backdrop-blur-md group">
              {/* Background Decor */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-700"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all duration-700"></div>

              <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">
                      Current Balance
                    </p>
                    <h2 className="text-4xl font-bold text-white mt-1 font-mono tracking-tight">
                      {displayCredits}
                    </h2>
                  </div>
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                    <BoltIcon className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Account Status</span>
                    <span className="text-green-400 font-medium">Active</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 w-full animate-pulse"></div>
                  </div>
                  <p className="text-[10px] text-gray-400 text-right mt-1">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="mb-16">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-yellow-500" />
            Available Packages
          </h3>

          {loadingPackages ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <SkeletonPackage key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {packages
                ?.filter((p) => p.is_active)
                .map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 group
                                ${
                                  pkg.is_featured
                                    ? "bg-[#0f1117] border-blue-500/50 shadow-lg shadow-blue-900/10 scale-[1.02] hover:scale-[1.03]"
                                    : "bg-[#0f1117]/60 border-slate-800 hover:border-slate-600 hover:bg-[#0f1117]"
                                }
                            `}
                  >
                    {pkg.is_featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                        Most Popular
                      </div>
                    )}

                    <div className="mb-4">
                      <h4 className="text-lg font-bold text-white">
                        {pkg.name}
                      </h4>
                      <p className="text-sm text-gray-400 h-10 line-clamp-2 mt-1">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-bold text-white">
                        ${pkg.price}
                      </span>
                      <span className="text-sm text-gray-500">USD</span>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="p-1 rounded-full bg-blue-500/10 text-blue-400">
                          <BoltIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-white">
                          {Number(pkg.credits ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} credits
                        </span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="p-1 rounded-full bg-green-500/10 text-green-400">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                        </div>
                        <span>Instant delivery</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="p-1 rounded-full bg-purple-500/10 text-purple-400">
                          <SparklesIcon className="w-3.5 h-3.5" />
                        </div>
                        {/* Calculate cost per credit for display */}
                        <span>
                          ${(pkg.price / pkg.credits).toFixed(2)} per credit
                        </span>
                      </li>
                    </ul>

                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={!!purchasingId}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                    ${
                                      pkg.is_featured
                                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                                        : "bg-white text-black hover:bg-gray-200"
                                    }
                                    ${
                                      purchasingId && purchasingId !== pkg.id
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }
                                `}
                    >
                      {purchasingId === pkg.id ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Get Started
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="relative">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            Transaction History
          </h3>

          <div className="bg-[#0f1117] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-slate-900/50 text-xs uppercase font-medium text-gray-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loadingHistory ? (
                    // Skeleton Rows
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-4 w-24 bg-slate-800 rounded"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-16 bg-slate-800 rounded"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 bg-slate-800 rounded"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 bg-slate-800 rounded ml-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : transactions?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions?.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4 text-white font-mono">
                          {new Date(tx.created_at).toLocaleDateString()}
                          <span className="text-gray-600 text-xs ml-2">
                            {new Date(tx.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                                ${
                                                  tx.status === "completed"
                                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                    : tx.status === "pending"
                                                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                                }
                                            `}
                          >
                            {tx.status === "completed" && (
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                            )}
                            {tx.status === "pending" && (
                              <ClockIcon className="w-3.5 h-3.5" />
                            )}
                            {tx.status === "failed" && (
                              <XCircleIcon className="w-3.5 h-3.5" />
                            )}
                            {tx.status.charAt(0).toUpperCase() +
                              tx.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white">
                          ${Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-purple-400 font-mono font-medium">
                            +{Number(tx.credits_added).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub Components

function SkeletonPackage() {
  return (
    <div className="bg-[#0f1117]/60 border border-slate-800 rounded-2xl p-6 animate-pulse">
      <div className="h-6 w-3/4 bg-slate-800 rounded mb-4"></div>
      <div className="h-4 w-full bg-slate-800 rounded mb-2"></div>
      <div className="h-4 w-2/3 bg-slate-800 rounded mb-6"></div>
      <div className="h-8 w-1/3 bg-slate-800 rounded mb-8"></div>
      <div className="space-y-3 mb-8">
        <div className="h-4 w-full bg-slate-800 rounded"></div>
        <div className="h-4 w-full bg-slate-800 rounded"></div>
        <div className="h-4 w-full bg-slate-800 rounded"></div>
      </div>
      <div className="h-12 w-full bg-slate-800 rounded-xl"></div>
    </div>
  );
}
