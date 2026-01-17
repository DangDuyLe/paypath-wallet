import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Eye, EyeOff, Copy, Check, Users, TrendingUp, Award } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const {
        username,
        usdcBalance,
        suiBalance,
        transactions,
        isConnected,
        isLoadingBalance,
        refreshBalance,
        rewardPoints,
        referralStats,
    } = useWallet();

    const [showBalance, setShowBalance] = useState(true);
    const [copiedDigest, setCopiedDigest] = useState<string | null>(null);

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

    // Split balance into whole and decimal
    const balanceWhole = Math.floor(usdcBalance);
    const balanceDecimal = (usdcBalance - balanceWhole).toFixed(6).slice(1); // .000000

    const recentTransactions = transactions.slice(0, 3);

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
                            <span className="text-xs font-semibold">{username[0].toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-sm">{username}</span>
                    </button>

                    {/* Reward Points Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-full">
                        <span className="text-base">🏆</span>
                        <span className="text-sm font-semibold text-amber-500">{rewardPoints.toLocaleString()} pts</span>
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
                                <span className="text-lg font-semibold text-muted-foreground ml-1">USDC</span>
                            </>
                        ) : (
                            <span className="balance-display">$••••• USDC</span>
                        )}
                        <button
                            onClick={() => setShowBalance(!showBalance)}
                            className="ml-2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* SUI Balance - Small Gray */}
                    <p className="text-sm text-muted-foreground mt-1">
                        {showBalance ? `${suiBalance.toFixed(4)} SUI` : '••• SUI'}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3 animate-slide-up stagger-1">
                    <button
                        onClick={() => navigate('/send')}
                        className="btn-pill-primary"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Send
                    </button>
                    <button
                        onClick={() => navigate('/receive')}
                        className="btn-pill-secondary"
                    >
                        <ArrowDownLeft className="w-4 h-4" />
                        Receive
                    </button>
                </div>

                {/* Referral Stats Card */}
                <div className="mt-6 animate-slide-up stagger-2">
                    <h3 className="section-title mb-3">Affiliate Performance</h3>
                    <div className="card-modern">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            {/* Commission */}
                            <div className="py-2">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <Award className="w-4 h-4 text-success" />
                                </div>
                                <p className="text-lg font-bold">{referralStats.totalCommission} USDC</p>
                                <p className="text-xs text-muted-foreground">Earned</p>
                            </div>
                            {/* Volume */}
                            <div className="py-2 border-l border-r border-border">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <TrendingUp className="w-4 h-4 text-success" />
                                </div>
                                <p className="text-lg font-bold">{formatVolume(referralStats.f0Volume)}</p>
                                <p className="text-xs text-muted-foreground">F0 Volume</p>
                            </div>
                            {/* Network */}
                            <div className="py-2">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <Users className="w-4 h-4 text-success" />
                                </div>
                                <p className="text-lg font-bold">{referralStats.f0Count}</p>
                                <p className="text-xs text-muted-foreground">F0 Friends</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 animate-slide-up stagger-3 hidden md:block">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="section-title mb-0">Recent Activity</h3>
                        <button
                            onClick={() => navigate('/history')}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            See all →
                        </button>
                    </div>

                    <div className="card-modern space-y-1">
                        {recentTransactions.length > 0 ? (
                            recentTransactions.map((tx) => {
                                // Use tx.id as digest (real blockchain txs store hash in id)
                                const txHash = tx.digest || tx.id;
                                const truncatedHash = txHash.length > 12
                                    ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}`
                                    : txHash;

                                return (
                                    <div key={tx.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`icon-circle ${tx.type === 'sent' ? 'bg-secondary' : 'bg-success/10'}`}>
                                                {tx.type === 'sent'
                                                    ? <ArrowUpRight className="w-4 h-4" />
                                                    : <ArrowDownLeft className="w-4 h-4 text-success" />
                                                }
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm">
                                                        {tx.type === 'sent' ? 'Sent' : 'Received'} USDC
                                                    </p>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-muted-foreground">•</span>
                                                        <a
                                                            href={`https://suiscan.xyz/mainnet/tx/${txHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-muted-foreground font-mono hover:text-foreground hover:underline transition-colors"
                                                        >
                                                            {truncatedHash}
                                                        </a>
                                                        <button
                                                            onClick={() => copyDigest(txHash)}
                                                            className="p-0.5 hover:bg-secondary rounded transition-colors"
                                                        >
                                                            {copiedDigest === txHash ? (
                                                                <Check className="w-3 h-3 text-success" />
                                                            ) : (
                                                                <Copy className="w-3 h-3 text-muted-foreground" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {tx.type === 'sent' ? `To ${tx.to}` : `From ${tx.from}`} • {formatTime(tx.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`font-semibold text-sm ${tx.type === 'sent' ? '' : 'text-success'}`}>
                                            {tx.type === 'sent' ? '−' : '+'}{tx.amount.toFixed(3)}
                                        </p>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 text-center text-muted-foreground text-sm">
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
