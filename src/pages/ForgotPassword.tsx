import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Mail } from "lucide-react";

import api, { getErrorMessage } from "../api/client";
import AuthCard from "../components/auth/AuthCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/primitives";

/**
 * Request a password-reset link.
 *
 * The API answers the same way whether or not the address is registered, and
 * so does this page — the form cannot be used to check who has an account.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send the reset link. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we will send you a link to choose a new one."
      error={error}
      showGoogle={false}
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div role="status" className="surface-card rounded-2xl p-5 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="text-base font-semibold text-fg">Check your inbox</h2>
          <p className="mt-1.5 text-sm text-fg-muted">
            If that email is registered, a reset link is on its way. It stays valid for a short while,
            so use it soon.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5 w-full"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
          >
            Send to a different address
          </Button>
        </div>
      ) : (
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
              autoFocus
              className="h-11 pl-10"
            />
          </div>

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
