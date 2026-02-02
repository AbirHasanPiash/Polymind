import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import DashboardLayout from "./layouts/DashboardLayout";
import ChatPage from "./pages/ChatPage";
import BillingPage from "./pages/BillingPage";
import HistoryPage from "./pages/HistoryPage";
import { ChatResetProvider } from "./context/ChatResetContext";
import TTSPage from "./pages/TTSPage";
import ImagePage from "./pages/ImagePage";
import AvatarPage from "./pages/AvatarPage";
import AdminRoute from "./components/AdminRoute";
import ManagePackagesPage from "./pages/ManagePackagesPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import AdminStatsPage from "./pages/admin_stats";
import ManageUsersPage from "./pages/manage_users";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatResetProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
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

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ChatResetProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
