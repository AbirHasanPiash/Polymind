import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import GoogleAuthBtn from "../GoogleAuthBtn";

type AuthCardProps = {
  title: string;
  subtitle: string;
  error?: string | null;
  children: ReactNode;
  footer: ReactNode;
};

/** Shared shell for the sign-in and sign-up screens. */
export default function AuthCard({ title, subtitle, error, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center app-surface px-4 py-10">
      <div className="w-full max-w-md animate-rise-in">
        <Link
          to="/"
          className="mb-6 block bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-center text-2xl font-bold text-transparent dark:from-blue-400 dark:to-pink-500"
        >
          MultiAiModel
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-[#11131a]">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
              {title}
            </h1>
            <p className="text-sm text-slate-500 dark:text-gray-400">{subtitle}</p>
          </div>

          <div className="mb-6">
            <GoogleAuthBtn />
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-white px-2 font-medium text-slate-400 dark:bg-[#11131a] dark:text-gray-500">
                Or continue with email
              </span>
            </div>
          </div>

          {/* role="alert" so screen readers announce the failure immediately. */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            >
              {error}
            </div>
          )}

          {children}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-gray-400">{footer}</p>
      </div>
    </div>
  );
}
