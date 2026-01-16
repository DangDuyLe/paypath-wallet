import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { useEffect } from 'react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { username, balance, balanceUsd, transactions, isConnected } = useWallet();

  useEffect(() => {
    if (!isConnected || !username) {
      navigate('/');
    }
  }, [isConnected, username, navigate]);

  if (!isConnected || !username) {
    return null;
  }

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="app-container">
      <div className="page-wrapper">
        {/* Header */}
        <div className="flex justify-between items-center animate-fade-in">
          <span className="font-semibold text-base">@{username}</span>
          <button 
            onClick={() => navigate('/settings')}
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            Settings
          </button>
        </div>

        {/* Balance */}
        <div className="flex-1 flex flex-col justify-center items-center py-12 animate-slide-up">
          <p className="text-5xl font-black tracking-tight">{balance.toFixed(2)} SUI</p>
          <p className="text-muted-foreground text-base mt-2">≈ ${balanceUsd.toFixed(2)}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8 animate-slide-up">
          <button 
            onClick={() => navigate('/send')} 
            className="action-card"
          >
            Send / Scan
          </button>
          <button 
            onClick={() => navigate('/receive')} 
            className="action-card"
          >
            Receive
          </button>
        </div>

        {/* Recent Activity */}
        <div className="animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Recent Activity
          </h2>
          <div className="border border-border">
            {transactions.slice(0, 3).map((tx) => (
              <div key={tx.id} className="tx-item px-4 flex justify-between items-center">
                <span className="font-medium">
                  {tx.type === 'sent' ? `To: ${tx.to}` : `From: ${tx.from}`}
                </span>
                <div className="text-right">
                  <span className="font-semibold">
                    {tx.type === 'sent' ? '-' : '+'}{tx.amount} SUI
                  </span>
                  <p className="text-xs text-muted-foreground">{formatTime(tx.timestamp)}</p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                No transactions yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
