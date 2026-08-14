import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/auth-context";
import Loading from "./Loading";

/**
 * Gate for admin areas.
 *
 * The backend enforces this as well; hiding the pages here just keeps users out
 * of screens whose data they could not load anyway.
 */
export default function AdminRoute() {
  const { user, isLoading } = useAuth();

  // Rendered inside the dashboard shell, so it uses the inline variant rather
  // than a full-screen spinner over the layout.
  if (isLoading) return <Loading variant="inline" label="Checking permissions" />;

  if (!user?.is_superuser) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
