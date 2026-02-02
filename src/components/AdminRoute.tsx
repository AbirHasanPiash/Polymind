import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';

export default function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  // If user is not logged in OR is not a superuser, redirect to dashboard
  if (!user || !user.is_superuser) {
    return <Navigate to="/dashboard" replace />;
  }

  // If admin, allow access
  return <Outlet />;
}