import { useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";

import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { GOOGLE_CLIENT_ID } from "../lib/env";
import { useTheme } from "./theme-context";

export default function GoogleAuthBtn() {
  const { login } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const [isExchanging, setIsExchanging] = useState(false);

  // Rendering the widget without a client id produces a broken iframe, so the
  // button is simply omitted when Google sign-in is not configured.
  if (!GOOGLE_CLIENT_ID) return null;

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;
    if (!credential) {
      toast.error("Google did not return a credential. Please try again.");
      return;
    }

    setIsExchanging(true);
    try {
      const { data } = await api.post<{ access_token: string }>("/auth/google", {
        token: credential,
      });
      login(data.access_token);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, "Google sign-in failed"));
    } finally {
      setIsExchanging(false);
    }
  };

  return (
    <div className="flex w-full justify-center" aria-busy={isExchanging}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error("Google sign-in was cancelled or blocked")}
        // Matching the app theme stops the widget from flashing a white pill
        // inside a dark card.
        theme={resolvedTheme === "dark" ? "filled_blue" : "outline"}
        shape="pill"
        width="260"
        text="continue_with"
        logo_alignment="left"
      />
    </div>
  );
}
