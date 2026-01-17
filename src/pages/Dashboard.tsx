import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { useEffect } from 'react';
import { Send, QrCode, ArrowDownLeft, ArrowUpRight, Settings, RefreshCw, ChevronRight, Gift, Users, TrendingUp } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const {
        username,
        suiBalance,
        usdcBalance,
        balanceVnd,
        transactions,
        isConnected,
        isLoadingBalance,
        refreshBalance,
    } = useWallet();

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
        if (hours < 1) return 'Now';
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    const formatVnd = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    // Mock data for rewards and referrals
    const rewardPoints = 1240;
    const referralStats = {
        earnedCommission: 15.5,
        f0Volume: 50000,
        f0Count: 12,
    };

    // Show only 3 recent transactions on Dashboard
    const recentTransactions = transactions.slice(0, 3);

    return (
        <div className="app-container">
            <div className="page-wrapper">
                {/* Header */}
                <div className="flex justify-between items-center animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="label-caps mb-1">Welcome back</p>
                            <h2 className="text-xl font-bold">@{username}</h2>
                        </div>
                        {/* Reward Points Badge */}
                        <div className="flex items-center gap-1 px-3 py-1 bg-secondary border border-border">
                            <Gift className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-semibold">{rewardPoints.toLocaleString()} pts</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-3 border border-border hover:bg-secondary transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                {/* Balance */}
                <div className="py-6 animate-slide-up">
                    <div className="flex items-center gap-2 mb-2">
                        <p className="label-caps">USDC Balance</p>
                        <button
                            onClick={refreshBalance}
                            disabled={isLoadingBalance}
                            className="p-1 hover:bg-secondary rounded transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoadingBalance ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <p className="display-large">
                        {isLoadingBalance ? '...' : usdcBalance.toFixed(2)}
                        <span className="text-3xl text-muted-foreground ml-2">USDC</span>
                    </p>

                    {/* SUI Balance for gas */}
                    <p className="text-sm text-muted-foreground mt-4">
                        Gas: {suiBalance.toFixed(4)} SUI
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4 animate-slide-up stagger-1">
                    <button
                        onClick={() => navigate('/send')}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                        <Send className="w-5 h-5" />
                        Send
                    </button>
                    <button
                        onClick={() => navigate('/receive')}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    >
                        <QrCode className="w-5 h-5" />
                        Receive
                    </button>
                </div>

                {/* Referral Stats Card */}
                <div className="mt-6 animate-slide-up stagger-2">
                    <div className="card-minimal">
                        <p className="section-title">Referral Stats</p>
                        <div className="grid grid-cols-3 gap-4">
                            {/* Earned Commission */}
                            <div className="text-center">
                                <div className="w-10 h-10 mx-auto mb-2 bg-secondary flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="font-bold text-lg">{referralStats.earnedCommission} USDC</p>
                                <p className="text-xs text-muted-foreground">Earned Commission</p>
                            </div>

                            {/* F0 Lifetime Volume */}
                            <div className="text-center">
                                <div className="w-10 h-10 mx-auto mb-2 bg-secondary flex items-center justify-center">
                                    <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="font-bold text-lg">${formatVnd(referralStats.f0Volume)}</p>
                                <p className="text-xs text-muted-foreground">F0 Lifetime Volume</p>
                            </div>

                            {/* F0 Count */}
                            <div className="text-center">
                                <div className="w-10 h-10 mx-auto mb-2 bg-secondary flex items-center justify-center">
                                    <Users className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="font-bold text-lg">{referralStats.f0Count} Friends</p>
                                <p className="text-xs text-muted-foreground">F0 Count</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider - hidden on mobile */}
                <div className="divider hidden sm:block" />

                {/* Activity - Only 3 items, hidden on mobile (use bottom nav) */}
                <div className="flex-1 animate-slide-up stagger-2 hidden sm:block">
                    <div className="flex justify-between items-center mb-4">
                        <p className="section-title mb-0">Recent Activity</p>
                        {/* See All - hidden on mobile (use bottom nav instead) */}
                        {transactions.length > 3 && (
                            <button
                                onClick={() => navigate('/history')}
                                className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                See all
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="border border-border">
                        {recentTransactions.map((tx) => (
                            <div key={tx.id} className="row-item px-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center ${tx.type === 'sent' ? 'bg-secondary' : 'bg-success/10'
                                        }`}>
                                        {tx.type === 'sent'
                                            ? <ArrowUpRight className="w-5 h-5" />
                                            : <ArrowDownLeft className="w-5 h-5 text-success" />
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">
                                            {tx.type === 'sent' ? `To ${tx.to}` : `From ${tx.from}`}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{formatTime(tx.timestamp)}</p>
                                    </div>
                                </div>
                                <p className={`font-semibold flex-shrink-0 ${tx.type === 'sent' ? 'text-foreground' : 'text-success'}`}>
                                    {tx.type === 'sent' ? '−' : '+'}{tx.amount.toFixed(2)} USDC
                                </p>
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <div className="py-12 text-center text-muted-foreground">
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
