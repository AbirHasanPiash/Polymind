import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/AdminRoute";
import Loading from "./components/Loading";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./context/AuthContext";
import { ChatResetProvider } from "./context/ChatResetContext";
import { ToastProvider } from "./context/ToastProvider";
import DashboardLayout from "./layouts/DashboardLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

/*
 * Everything past the landing and auth screens is code-split. The markdown +
 * KaTeX + syntax-highlighting stack that chat needs, and recharts on the admin
 * dashboard, are by far the largest dependencies here; shipping them in the
 * first bundle makes a visitor who only wants to sign in wait for code they
 * will never run.
 */
const ChatPage = lazy(() => import("./pages/ChatPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const TTSPage = lazy(() => import("./pages/TTSPage"));
const ImagePage = lazy(() => import("./pages/ImagePage"));
const AvatarPage = lazy(() => import("./pages/AvatarPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentCancelPage = lazy(() => import("./pages/PaymentCancelPage"));
const ManageUsersPage = lazy(() => import("./pages/manage_users"));
const ManagePackagesPage = lazy(() => import("./pages/ManagePackagesPage"));
const AdminStatsPage = lazy(() => import("./pages/admin_stats"));

/**
 * Suspense boundary for the lazy dashboard pages.
 *
 * It sits inside the layout, so the sidebar and header stay on screen while a
 * chunk loads instead of the whole app flashing to a full-page spinner.
 */
function LazyRoutes() {
  return (
    <Suspense fallback={<Loading variant="inline" label="Loading page" />}>
      <Outlet />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <AuthProvider>
            <ChatResetProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route element={<LazyRoutes />}>
                    <Route index element={<ChatPage />} />
                    <Route path="chat/:chatId" element={<ChatPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="tts" element={<TTSPage />} />
                    <Route path="images" element={<ImagePage />} />
                    <Route path="avatar" element={<AvatarPage />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="payment/success" element={<PaymentSuccessPage />} />
                    <Route path="payment/cancel" element={<PaymentCancelPage />} />

                    <Route element={<AdminRoute />}>
                      <Route path="admin/users" element={<ManageUsersPage />} />
                      <Route path="admin/packages" element={<ManagePackagesPage />} />
                      <Route path="admin/stats" element={<AdminStatsPage />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ChatResetProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
