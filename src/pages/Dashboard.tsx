import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Eye, EyeOff, Copy, Check, Users, TrendingUp, Award, Trophy, Zap, X, Gift, CheckCircle } from 'lucide-react';

const WINNERS_STORAGE_KEY = 'PAYPATH_WINNERS';

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
        startCampaignSession,
    } = useWallet();

    const [showBalance, setShowBalance] = useState(true);
    const [copiedDigest, setCopiedDigest] = useState<string | null>(null);
    const [showAirdropModal, setShowAirdropModal] = useState(false);

    // Flash Timer State - FOMO effect
    const [isAirdropVisible, setIsAirdropVisible] = useState(true);

    // Winner Check State
    const [hasClaimedReward, setHasClaimedReward] = useState(false);

    // Check if user has already claimed reward
    useEffect(() => {
        const winnersJson = localStorage.getItem(WINNERS_STORAGE_KEY);
        if (winnersJson && username) {
            try {
                const winners: string[] = JSON.parse(winnersJson);
                if (winners.includes(username)) {
                    setHasClaimedReward(true);
                }
            } catch {
                // Invalid JSON, ignore
            }
        }
    }, [username]);

    // Flash Timer - Toggle visibility every 30 seconds for FOMO effect
    useEffect(() => {
        const interval = setInterval(() => {
            setIsAirdropVisible(prev => !prev);
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

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

    const handleJoinCampaign = () => {
        startCampaignSession();
        setShowAirdropModal(false);
        navigate('/send');
    };

    // Split balance into whole and decimal
    const balanceWhole = Math.floor(usdcBalance);
    const balanceDecimal = (usdcBalance - balanceWhole).toFixed(2).slice(1); // .00

    const recentTransactions = transactions.slice(0, 3);

    return (
        <>
            {/* Flash Airdrop Modal */}
            {showAirdropModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl animate-slide-up">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    <Gift className="w-4 h-4 text-amber-500" />
                                </div>
                                <h2 className="font-bold text-lg">Flash Airdrop</h2>
                            </div>
                            <button
                                onClick={() => setShowAirdropModal(false)}
                                className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-muted-foreground text-center">
                                Complete a transaction to win instant rewards!
                            </p>

                            {/* Rules */}
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-xl">
                                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                    <p className="text-sm">Scan any Bank/QR & Pay with USDC.</p>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-xl">
                                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                    <p className="text-sm">Do <strong className="text-destructive">NOT</strong> reload or go back, or you lose your chance.</p>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
                                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Stand a chance to win up to <strong>$5 USDC</strong> instantly!</p>
                                </div>
                            </div>
                        </div>

                        {/* Action */}
                        <div className="p-4 border-t border-border">
                            <button
                                onClick={handleJoinCampaign}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            >
                                <Zap className="w-5 h-5" />
                                JOIN NOW & SEND
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="app-container">
                <div className="page-wrapper">
                    {/* Flash Airdrop Floating Banner - With Timer & Winner Check */}
                    {hasClaimedReward ? (
                        // User already claimed - Show disabled state
                        <div className="w-full mb-4 py-3 px-4 rounded-xl bg-secondary/50 border border-border flex items-center justify-center gap-2 opacity-60">
                            <CheckCircle className="w-5 h-5 text-success" />
                            <span className="font-medium text-muted-foreground">Reward Claimed ✓</span>
                        </div>
                    ) : isAirdropVisible ? (
                        // Show airdrop button
                        <button
                            onClick={() => setShowAirdropModal(true)}
                            className="w-full mb-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center gap-2 hover:from-amber-500/30 hover:to-orange-500/30 transition-all animate-pulse-glow"
                        >
                            <Zap className="w-5 h-5 text-amber-500" />
                            <span className="font-bold text-amber-600 dark:text-amber-400">⚡ Flash Airdrop Live</span>
                            <span className="text-xs text-muted-foreground">(Tap to join)</span>
                        </button>
                    ) : null}

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

                        {/* Reward Points Badge - Subtle */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full transition-colors hover:bg-secondary/80 cursor-default">
                            <span className="text-sm">🏆</span>
                            <span className="text-sm font-medium">{rewardPoints.toLocaleString()} pts</span>
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
                                <span className="balance-display">$•••••</span>
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
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="section-title mb-0">Affiliate Performance</h3>
                            <button
                                onClick={() => navigate('/leaderboard')}
                                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                            >
                                <Trophy className="w-3.5 h-3.5" />
                                Leaderboard
                            </button>
                        </div>
                        <div className="card-modern">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                {/* Commission */}
                                <div className="py-2">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <Award className="w-4 h-4 text-success" />
                                    </div>
                                    <p className="text-lg font-bold">${referralStats.totalCommission}</p>
                                    <p className="text-xs text-muted-foreground">Earned</p>
                                </div>
                                {/* Volume */}
                                <div className="py-2 border-l border-r border-border relative group cursor-pointer" onClick={() => navigate('/leaderboard')}>
                                    <div className="absolute inset-x-2 -top-2 -bottom-2 bg-secondary/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="relative flex items-center justify-center gap-1.5 mb-1">
                                        <Trophy className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div className="relative">
                                        <p className="text-lg font-bold">{formatVolume(referralStats.f0Volume)}</p>
                                        <p className="text-xs text-muted-foreground">Volume</p>
                                    </div>
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
                                recentTransactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`icon-circle ${tx.type === 'sent' ? 'bg-secondary' : 'bg-success/10'}`}>
                                                {tx.type === 'sent'
                                                    ? <ArrowUpRight className="w-4 h-4" />
                                                    : <ArrowDownLeft className="w-4 h-4 text-success" />
                                                }
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {tx.type === 'sent' ? 'Sent' : 'Received'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatTime(tx.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`font-semibold ${tx.type === 'sent' ? '' : 'text-success'}`}>
                                            {tx.type === 'sent' ? '−' : '+'}{tx.amount.toFixed(3)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-muted-foreground text-sm">
                                    No transactions yet
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default Dashboard;

