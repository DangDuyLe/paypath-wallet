import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/context/WalletContext";
import { AuthProvider } from "@/context/AuthContext";
import { SuiProvider } from "@/providers/SuiProvider";
import MobileBottomNav from "@/components/MobileBottomNav";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Send from "./pages/Send";
import Receive from "./pages/Receive";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";

const App = () => (
  <SuiProvider>
    <TooltipProvider>
      <WalletProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/send" element={<Send />} />
              <Route path="/receive" element={<Receive />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MobileBottomNav />
          </BrowserRouter>
        </AuthProvider>
      </WalletProvider>
    </TooltipProvider>
  </SuiProvider>
);

export default App;
