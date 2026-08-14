import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowPathIcon, UserIcon } from "@heroicons/react/24/outline";

import api, { getErrorMessage } from "../api/client";
import AuthCard from "../components/auth/AuthCard";
import PasswordField from "../components/auth/PasswordField";
import { useAuth } from "../context/auth-context";

/** Matches the backend's MIN_PASSWORD_LENGTH so both sides agree. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Account creation.
 *
 * The backend has exposed POST /auth/signup all along, but the UI had no way to
 * reach it: a new user could only get in through Google.
 */
export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await api.post<{ access_token: string }>("/auth/signup", {
        email,
        password,
        full_name: fullName || undefined,
      });
      login(data.access_token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not create your account"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start with free credits — no card required"
      error={error}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="full_name" className="sr-only">
            Full name
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <UserIcon className="h-5 w-5 text-slate-400 dark:text-gray-500" />
          </div>
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name (optional)"
            autoComplete="name"
            maxLength={120}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-10 text-base text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none sm:text-sm dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-600"
          />
        </div>

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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-10 text-base text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none sm:text-sm dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:placeholder-slate-600"
          />
        </div>

        <PasswordField
          id="new_password"
          value={password}
          onChange={setPassword}
          placeholder={`Password (${MIN_PASSWORD_LENGTH}+ characters)`}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
        />

        <PasswordField
          id="confirm_password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm password"
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3.5 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
