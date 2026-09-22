import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/AdminRoute";
import Loading from "./components/Loading";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/theme-provider";
import { TooltipProvider } from "./components/ui/overlays";
import { AuthProvider } from "./context/AuthContext";
import { ChatResetProvider } from "./context/ChatResetContext";
import { ToastProvider } from "./context/ToastProvider";
import DashboardLayout from "./layouts/DashboardLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

/*
 * Everything past the landing and auth screens is code-split. The markdown +
 * KaTeX + syntax-highlighting stack that chat needs, and recharts on the
 * dashboards, are by far the largest dependencies here.
 */
const ChatPage = lazy(() => import("./pages/ChatPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const VoicePage = lazy(() => import("./pages/VoicePage"));
const ImagePage = lazy(() => import("./pages/ImagePage"));
const AvatarPage = lazy(() => import("./pages/AvatarPage"));
const UsagePage = lazy(() => import("./pages/UsagePage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const PaymentCancelPage = lazy(() => import("./pages/PaymentCancelPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/UsersPage"));
const AdminPackagesPage = lazy(() => import("./pages/admin/PackagesPage"));
const AdminOverviewPage = lazy(() => import("./pages/admin/OverviewPage"));
const AdminTransactionsPage = lazy(() => import("./pages/admin/TransactionsPage"));
const SharedChatPage = lazy(() => import("./pages/SharedChatPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));

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
      <ThemeProvider defaultTheme="system">
        <TooltipProvider delayDuration={300}>
          <ToastProvider>
            <AuthProvider>
              <ChatResetProvider>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route
                    path="/forgot-password"
                    element={
                      <Suspense fallback={<Loading />}>
                        <ForgotPasswordPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/reset-password"
                    element={
                      <Suspense fallback={<Loading />}>
                        <ResetPasswordPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/share/:token"
                    element={
                      <Suspense fallback={<Loading />}>
                        <SharedChatPage />
                      </Suspense>
                    }
                  />

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
                      <Route path="voice" element={<VoicePage />} />
                      <Route path="tts" element={<Navigate to="/dashboard/voice" replace />} />
                      <Route path="images" element={<ImagePage />} />
                      <Route path="avatar" element={<AvatarPage />} />
                      <Route path="usage" element={<UsagePage />} />
                      <Route path="billing" element={<BillingPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="payment/success" element={<PaymentSuccessPage />} />
                      <Route path="payment/cancel" element={<PaymentCancelPage />} />

                      <Route element={<AdminRoute />}>
                        <Route path="admin/stats" element={<AdminOverviewPage />} />
                        <Route path="admin/users" element={<AdminUsersPage />} />
                        <Route path="admin/packages" element={<AdminPackagesPage />} />
                        <Route path="admin/transactions" element={<AdminTransactionsPage />} />
                      </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ChatResetProvider>
            </AuthProvider>
          </ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
