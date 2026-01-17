import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Eye, EyeOff, Copy, Check, Users, TrendingUp, Award, Settings } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // MERGE: Lấy tất cả dữ liệu từ cả 2 nhánh
  const {
    username,
    suiBalance,
    usdcBalance,
    // balanceVnd, // Có thể giữ lại nếu sau này cần hiển thị VND
    transactions,
    isConnected,
    isLoadingBalance,
    refreshBalance,
    rewardPoints,   // Của Main (Quan trọng)
    referralStats,  // Của Main (Quan trọng)
  } = useWallet();

  // STATE: Giữ state UI của nhánh Main
  const [showBalance, setShowBalance] = useState(true);
  const [copiedDigest, setCopiedDigest] = useState<string | null>(null);

  // EFFECT: Logic kiểm tra đăng nhập
  useEffect(() => {
    // Ưu tiên logic của Main: Nếu chưa connect hoặc chưa có user -> đá về Home/Login
    if (!isConnected && !username) {
      navigate('/');
    }
    // Logic của Zklogin: Nếu đã connect mà chưa có username -> đá về Onboarding
    else if (isConnected && !username) {
        navigate('/onboarding', { replace: true });
    }
  }, [isConnected, username, navigate]);

  if (!isConnected && !username) {
    return null;
  }

  // HELPER FUNCTIONS (Của Main)
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Now';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}k`;
    return `$${volume}`;
  };

  const copyDigest = async (digest: string) => {
    try {
      await navigator.clipboard.writeText(digest);
      setCopiedDigest(digest);
      setTimeout(() => setCopiedDigest(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // CALCULATIONS
  const balanceWhole = Math.floor(usdcBalance);
  const balanceDecimal = (usdcBalance - balanceWhole).toFixed(2).slice(1); // .00
  const recentTransactions = transactions.slice(0, 3);

  // RENDER: Sử dụng UI của nhánh MAIN (đầy đủ features nhất)
  return (
    <div className="app-container">
      <div className="page-wrapper">
        {/* Header - User Pill & Reward Badge */}
        <div className="flex items-center justify-between animate-fade-in pt-2">
          <button
            onClick={() => navigate('/settings')}
            className="user-pill"
          >
            <div className="user-avatar">
              <span className="text-xs font-semibold">{username ? username[0].toUpperCase() : '?'}</span>
            </div>
            <span className="font-medium text-sm">{username}</span>
          </button>

          {/* Reward Points Badge - Subtle */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full transition-colors hover:bg-secondary/80 cursor-default">
            <span className="text-sm">🏆</span>
            <span className="text-sm font-medium">{rewardPoints ? rewardPoints.toLocaleString() : 0} pts</span>
          </div>
        </div>

        {/* Balance Section */}
        <div className="py-8 text-center animate-slide-up">
          {/* USDC Balance - Large */}
          <div className="flex items-baseline justify-center">
            {showBalance ? (
              <>
                <span className="balance-display">
                  ${isLoadingBalance ? '...' : balanceWhole}
                </span>
                <span className="balance-decimal">
                  {isLoadingBalance ? '' : balanceDecimal}
                </span>
              </>
            ) : (
              <span className="balance-display">$••••