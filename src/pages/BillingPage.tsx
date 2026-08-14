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
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import api, { fetcher, getErrorMessage } from "../api/client";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import Loading from "../components/Loading";

// Types

import type {
  RazorpayFailureResponse,
  RazorpayOptions,
  RazorpaySuccessResponse,
} from "../types/razorpay";

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
  stripe_session_id?: string;
  razorpay_order_id?: string;
}

type PaymentGateway = "stripe" | "razorpay";

// Utility to load Razorpay SDK dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function BillingPage() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentGateway>("stripe");

  // Data Fetching
  const { data: packages, isLoading: loadingPackages } = useSWR<Package[]>(
    "/packages/",
    fetcher
  );
  

  const { 
    data: transactions, 
    isLoading: loadingHistory, 
    mutate: mutateTransactions 
  } = useSWR<Transaction[]>("/payments/history", fetcher);

  // Handle Purchase
  const handlePurchase = async (pkg: Package) => {
    setPurchasingId(pkg.id);
    
    try {
      if (paymentMethod === "stripe") {
        // STRIPE FLOW
        const response = await api.post(
          `/payments/create-checkout-session/${pkg.id}`
        );
        if (response.data.checkout_url) {
          window.location.href = response.data.checkout_url;
        }
      } else {
        // RAZORPAY FLOW
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error("Could not load the Razorpay checkout. Check your connection.");
          setPurchasingId(null);
          return;
        }

        // Create Razorpay Order on Backend
        const { data: orderData } = await api.post(
          `/payments/create-razorpay-order/${pkg.id}`
        );

        // Initialize Razorpay Checkout
        const options: RazorpayOptions = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "MultiAIModel",
          description: `Purchase ${pkg.name}`,
          order_id: orderData.order_id,
          handler: async function (response: RazorpaySuccessResponse) {
            try {
              // Verify Payment on Backend
              await api.post("/payments/verify-razorpay-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              
              toast.success("Payment successful — credits added to your wallet");
              void mutateTransactions();
              await refreshProfile();
            } catch (err) {
              toast.error(getErrorMessage(err, "Payment verification failed. Please contact support."));
            } finally {
              setPurchasingId(null);
            }
          },
          prefill: {
            email: user?.email,
          },
          theme: {
            color: "#2563EB",
          },
          modal: {
            ondismiss: function () {
              setPurchasingId(null);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: RazorpayFailureResponse) => {
          toast.error(`Payment failed: ${response.error.description}`);
          setPurchasingId(null);
        });
        rzp.open();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start checkout. Please try again."));
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
    <div className="flex flex-col h-full bg-blue-50 dark:bg-gradient-to-br dark:from-[#0a0b0f] dark:via-[#0d0e14] dark:to-[#0a0b0f] relative overflow-hidden overflow-y-auto custom-scrollbar transition-colors duration-300">
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-24">
        
        {/* Header & Wallet Section */}
        <div className="flex flex-col lg:flex-row gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
              <CreditCardIcon className="w-8 h-8 text-blue-600 dark:text-blue-500" />
              Billing & Credits
            </h1>
            <p className="text-slate-500 dark:text-gray-400 text-lg max-w-xl leading-relaxed">
              Manage your subscription and credit balance. Purchase more credits
              to generate high-fidelity AI avatars and voices.
            </p>

            <div className="flex items-center gap-4 mt-6 text-sm text-slate-500 dark:text-gray-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
                <span>Secure Payments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4 text-purple-500" />
                <span>Instant Credit Delivery</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 dark:from-blue-900/40 dark:to-purple-900/40 border border-white/20 dark:border-white/10 p-6 shadow-2xl backdrop-blur-md group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 dark:bg-blue-500/20 rounded-full blur-3xl group-hover:bg-white/20 dark:group-hover:bg-blue-500/30 transition-all duration-700"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 dark:bg-purple-500/20 rounded-full blur-3xl group-hover:bg-white/20 dark:group-hover:bg-purple-500/30 transition-all duration-700"></div>

              <div className="relative z-10 flex flex-col h-full justify-between gap-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">
                      Current Balance
                    </p>
                    <h2 className="text-4xl font-bold mt-1 font-mono tracking-tight">
                      {displayCredits}
                    </h2>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                    <BoltIcon className="w-6 h-6 text-yellow-300" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-blue-100">
                    <span>Account Status</span>
                    <span className="text-emerald-300 font-medium">Active</span>
                  </div>
                  <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-white/80 w-full animate-pulse"></div>
                  </div>
                  <p className="text-[10px] text-blue-100/80 text-right mt-1">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Packages Grid & Payment Method Toggle */}
        <div className="mb-16">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-amber-500" />
              Available Packages
            </h3>

            {/* Payment Gateway Toggle */}
            <div className="flex bg-slate-200/50 dark:bg-[#0f1117] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPaymentMethod("stripe")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  paymentMethod === "stripe"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CreditCardIcon className="w-4 h-4" />
                Stripe
              </button>
              <button
                onClick={() => setPaymentMethod("razorpay")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  paymentMethod === "razorpay"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <BuildingLibraryIcon className="w-4 h-4" />
                Razorpay
              </button>
            </div>
          </div>

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
                                    ? "bg-white dark:bg-[#0f1117] border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02] hover:scale-[1.03] z-10"
                                    : "bg-white dark:bg-[#0f1117]/60 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-600 hover:shadow-lg"
                                }
                            `}
                  >
                    {/* Package Content */}
                    {pkg.is_featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                        Most Popular
                      </div>
                    )}

                    <div className="mb-4">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        {pkg.name}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-gray-400 h-10 line-clamp-2 mt-1">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-bold text-slate-900 dark:text-white">
                        ${pkg.price}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-gray-500">USD</span>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-gray-300">
                        <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <BoltIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {Number(pkg.credits ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} credits
                        </span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-gray-300">
                        <div className="p-1 rounded-full bg-emerald-100 dark:bg-green-500/10 text-emerald-600 dark:text-green-400">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                        </div>
                        <span>Instant delivery</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-gray-300">
                        <div className="p-1 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <SparklesIcon className="w-3.5 h-3.5" />
                        </div>
                        <span>
                          ${(pkg.price / pkg.credits).toFixed(2)} per credit
                        </span>
                      </li>
                    </ul>

                    {/* Button to Reflect Payment Method */}
                    <button
                      onClick={() => handlePurchase(pkg)}
                      disabled={!!purchasingId}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                    ${
                                      pkg.is_featured
                                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                                        : "bg-slate-100 dark:bg-white text-slate-900 dark:text-black hover:bg-slate-200 dark:hover:bg-gray-200"
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
                          Pay via {paymentMethod === "stripe" ? "Stripe" : "Razorpay"}
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
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-slate-400 dark:text-gray-400" />
            Transaction History
          </h3>

          <div className="bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-gray-400">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-medium text-slate-500 dark:text-gray-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {loadingHistory ? (
                    // Skeleton Rows
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded ml-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : transactions?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions?.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4 text-slate-900 dark:text-white font-mono">
                          {new Date(tx.created_at).toLocaleDateString()}
                          <span className="text-slate-400 dark:text-gray-600 text-xs ml-2">
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
                                                    ? "bg-emerald-100 dark:bg-green-500/10 text-emerald-600 dark:text-green-400 border-emerald-200 dark:border-green-500/20"
                                                    : tx.status === "pending"
                                                    ? "bg-amber-100 dark:bg-yellow-500/10 text-amber-600 dark:text-yellow-400 border-amber-200 dark:border-yellow-500/20"
                                                    : "bg-rose-100 dark:bg-red-500/10 text-rose-600 dark:text-red-400 border-rose-200 dark:border-red-500/20"
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
                        <td className="px-6 py-4 text-slate-900 dark:text-white">
                          ${Number(tx.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-purple-600 dark:text-purple-400 font-mono font-medium">
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
    <div className="bg-white dark:bg-[#0f1117]/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse">
      <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
      <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded mb-6"></div>
      <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mb-8"></div>
      <div className="space-y-3 mb-8">
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
      <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
    </div>
  );
}