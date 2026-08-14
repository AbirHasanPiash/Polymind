import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/auth-context";
import Loading from "./Loading";

/**
 * Gate for signed-in areas.
 *
 * Waits for the session check to finish before deciding, and remembers where
 * the user was heading so they land there after signing in.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Loading label="Checking your session" />;

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
}
