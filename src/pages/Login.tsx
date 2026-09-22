import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

import api, { getErrorMessage } from "../api/client";
import AuthCard from "../components/auth/AuthCard";
import PasswordField from "../components/auth/PasswordField";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/primitives";
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
      const { data } = await api.post<{ access_token: string }>("/auth/login", { email, password });
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
      subtitle="Sign in to your Polymind workspace."
      error={error}
      redirectTo={redirectTo}
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5">
            <Mail className="h-4 w-4 text-fg-subtle" />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            autoComplete="email"
            required
            className="h-11 pl-10"
          />
        </div>

        <div className="space-y-2">
          <PasswordField id="password" value={password} onChange={setPassword} />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
