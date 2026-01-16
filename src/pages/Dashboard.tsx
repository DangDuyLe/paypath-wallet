import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { useEffect } from 'react';
import { Send, QrCode, ArrowDownLeft, ArrowUpRight, Settings } from 'lucide-react';

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-base">@{username}</span>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="p-2.5 rounded-xl bg-card border border-border hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="balance-card mt-6 animate-slide-up">
          <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
          <p className="text-4xl font-bold tracking-tight">{balance.toFixed(2)} <span className="text-2xl text-muted-foreground">SUI</span></p>
          <p className="text-muted-foreground text-base mt-1">≈ ${balanceUsd.toFixed(2)} USD</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 animate-slide-up">
          <button 
            onClick={() => navigate('/send')} 
            className="action-btn"
          >
            <Send className="w-5 h-5" />
            <span>Send</span>
          </button>
          <button 
            onClick={() => navigate('/receive')} 
            className="action-btn-secondary"
          >
            <QrCode className="w-5 h-5" />
            <span>Receive</span>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Activity
            </h2>
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              View all
            </button>
          </div>
          
          <div className="card-container p-0 overflow-hidden">
            {transactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="tx-item px-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.type === 'sent' 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-success/10 text-success'
                }`}>
                  {tx.type === 'sent' 
                    ? <ArrowUpRight className="w-5 h-5" />
                    : <ArrowDownLeft className="w-5 h-5" />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {tx.type === 'sent' ? `To ${tx.to}` : `From ${tx.from}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatTime(tx.timestamp)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${
                    tx.type === 'sent' ? 'text-foreground' : 'text-success'
                  }`}>
                    {tx.type === 'sent' ? '-' : '+'}{tx.amount} SUI
                  </p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
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
