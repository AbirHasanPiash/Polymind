import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import api, { getErrorMessage } from "../api/client";
import AuthCard from "../components/auth/AuthCard";
import PasswordField from "../components/auth/PasswordField";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";

/** Matches the backend's MIN_PASSWORD_LENGTH so both sides agree. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Choose a new password from an emailed reset link.
 *
 * A successful reset also signs the user in: the API returns a session token,
 * so there is no second form to fill in.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);

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
      const { data } = await api.post<{ access_token: string }>("/auth/reset-password", {
        token,
        new_password: password,
      });
      login(data.access_token);
      toast.success("Password updated — you are signed in");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not reset your password"));
      setExpired(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const missingToken = !token;

  return (
    <AuthCard
      title="Choose a new password"
      subtitle={
        missingToken
          ? "This page needs the link from your reset email."
          : "Pick something you have not used elsewhere. You will be signed in straight away."
      }
      error={error}
      showGoogle={false}
      footer={
        <>
          Back to{" "}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            sign in
          </Link>
        </>
      }
    >
      {missingToken ? (
        <div className="surface-card rounded-2xl p-5 text-center">
          <p className="text-sm text-fg-muted">
            The reset link is missing or incomplete. Request a fresh one and open it from the email.
          </p>
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            id="new_password"
            value={password}
            onChange={setPassword}
            placeholder={`New password (${MIN_PASSWORD_LENGTH}+ characters)`}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
          />
          <PasswordField
            id="confirm_password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {isSubmitting ? "Saving…" : "Set new password"}
          </Button>

          {expired && (
            <p className="text-center text-xs text-fg-muted">
              Link not working?{" "}
              <Link to="/forgot-password" className="font-medium text-accent hover:underline">
                Request a new one
              </Link>
            </p>
          )}
        </form>
      )}
    </AuthCard>
  );
}
