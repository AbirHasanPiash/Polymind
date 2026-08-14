import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowPathIcon, UserIcon } from "@heroicons/react/24/outline";

import api, { getErrorMessage } from "../api/client";
import AuthCard from "../components/auth/AuthCard";
import PasswordField from "../components/auth/PasswordField";
import { useAuth } from "../context/auth-context";

type LocationState = { from?: { pathname: string } };

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Return the user to whatever they were trying to open before signing in.
  const redirectTo = (location.state as LocationState)?.from?.pathname ?? "/dashboard";

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await api.post<{ access_token: string }>("/auth/login", {
        email,
        password,
      });
      login(data.access_token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Show what the backend actually said ("account deactivated", "service
      // unavailable"), instead of always claiming the credentials were wrong.
      setError(getErrorMessage(err, "Incorrect email or password"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to access your AI workspace"
      error={error}
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
        <div className="relative">
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <UserIcon className="h-5 w-5 text-slate-400 dark:text-gray-500" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            autoComplete="email"
            required
            // text-base on mobile keeps iOS Safari from zooming in on focus.
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-10 text-base text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none sm:text-sm dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-600"
          />
        </div>

        <PasswordField id="password" value={password} onChange={setPassword} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3.5 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Signing in…" : "Sign in with email"}
        </button>
      </form>
    </AuthCard>
  );
}
