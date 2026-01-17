import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "@/context/WalletContext";
import { AuthProvider, useAuth } from "@/context/AuthContext"; // Giữ từ Zklogin
import { SuiProvider } from "@/providers/SuiProvider";
import MobileBottomNav from "@/components/MobileBottomNav"; // Giữ từ Main
import Index from "./pages/Index";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Send from "./pages/Send";
import Receive from "./pages/Receive";
import History from "./pages/History"; // Giữ từ Main
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// ProtectedRoute component to guard routes that require authentication
// Giữ logic bảo vệ route này từ branch Zklogin
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { accessToken } = useAuth();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <SuiProvider>
    <TooltipProvider>
      {/* Thêm AuthProvider bọc ngoài WalletProvider (Logic của Zklogin) */}
      <AuthProvider>
        <WalletProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes - Ai cũng vào được */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />

              {/* Protected Routes - Phải đăng nhập mới vào được */}
              {/* Đã gộp trang History từ branch main vào đây */}
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/send" element={
                <ProtectedRoute>
                  <Send />
                </ProtectedRoute>
              } />
              <Route path="/receive" element={
                <ProtectedRoute>
                  <Receive />
                </ProtectedRoute>
              } />
              <Route path="/history" element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Giữ thanh điều hướng Mobile từ branch Main */}
            {/* Lưu ý: Bạn có thể cần check auth để ẩn hiện cái này nếu muốn */}
            <MobileBottomNav /> 
            
          </BrowserRouter>
        </WalletProvider>
      </AuthProvider>
    </TooltipProvider>
  </SuiProvider>
);

export default App;