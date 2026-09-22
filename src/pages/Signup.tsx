import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, UserRound } from "lucide-react";

import api, { getErrorMessage } from "../api/client";
import AuthCard from "../components/auth/AuthCard";
import PasswordField from "../components/auth/PasswordField";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";

/** Matches the backend's MIN_PASSWORD_LENGTH so both sides agree. */
const MIN_PASSWORD_LENGTH = 8;

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
      subtitle="Start with 10 free credits — no card required."
      error={error}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-accent hover:underline">
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
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5">
            <UserRound className="h-4 w-4 text-fg-subtle" />
          </div>
          <Input
            id="full_name"
            name="full_name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name (optional)"
            autoComplete="name"
            maxLength={120}
            className="h-11 pl-10"
          />
        </div>

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

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-xs text-fg-subtle">
          By continuing you agree to use Polymind responsibly. Credits are only spent on what you generate.
        </p>
      </form>
    </AuthCard>
  );
}
