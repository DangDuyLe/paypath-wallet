import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { ChevronLeft, Trophy, Medal, Flame, Award } from 'lucide-react';

interface LeaderboardUser {
    rank: number;
    username: string;
    avatar: string;
    streak: number;
    points: number;
    isCurrentUser?: boolean;
}

const Leaderboard = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isAuthLoading, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'month' | 'all-time'>('month');

    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthLoading, isAuthenticated, navigate]);

    const rewardPoints = (() => {
        const u = user as { loyaltyPoints?: unknown } | null;
        return typeof u?.loyaltyPoints === 'number' ? u.loyaltyPoints : 0;
    })();

    // Mock Data Generation
    const generateMockData = (tab: 'month' | 'all-time'): LeaderboardUser[] => {
        // Base data
        const users = [
            { username: 'coin_captain', avatar: 'C', streak: 49 },
            { username: 'eth_architect', avatar: 'E', streak: 12 },
            { username: 'proofofnate', avatar: 'P', streak: 37 },
            { username: 'big_coin_energy', avatar: 'B', streak: 4 },
            { username: 'mempool_shark', avatar: 'M', streak: 8 },
            { username: 'cryptokitty', avatar: 'K', streak: 132 },
            // Current user placeholder
            { username: username || 'me', avatar: (username?.[0] || 'M').toUpperCase(), streak: 5, isCurrentUser: true },
            { username: 'sui_whale', avatar: 'S', streak: 0 },
            { username: 'defi_degen', avatar: 'D', streak: 21 },
            { username: 'block_builder', avatar: 'B', streak: 3 },
            { username: 'token_tami', avatar: 'T', streak: 15 },
            { username: 'nft_ninja', avatar: 'N', streak: 7 },
        ];

        // Adjust points based on tab and sort
        const multiplier = tab === 'all-time' ? 10 : 1;

        // Assign random points and sort
        const rankedUsers = users.map(u => ({
            ...u,
            points: u.isCurrentUser
                ? rewardPoints // Use real points for current user if applicable, or mock logic
                : Math.floor(Math.random() * 5000 * multiplier) + 1000
        })).sort((a, b) => b.points - a.points);

        // Re-assign ranks
        return rankedUsers.map((u, index) => ({
            ...u,
            rank: index + 1
        }));
    };

    const leaderboardData = generateMockData(activeTab);
    const currentUserStats = leaderboardData.find(u => u.isCurrentUser) || leaderboardData[6]; // Fallback

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Medal className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />;
        if (rank === 2) return <Medal className="w-6 h-6 text-gray-400 fill-gray-400/20" />;
        if (rank === 3) return <Medal className="w-6 h-6 text-amber-700 fill-amber-700/20" />;
        return <span className="text-lg font-bold text-muted-foreground w-6 text-center">{rank}</span>;
    };

    return (
        <div className="app-container">
            <div className="page-wrapper p-0 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 flex items-center gap-4 bg-background z-10">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Leaderboard</h1>
                </div>

                {/* Tabs */}
                <div className="px-4 pb-4 bg-background z-10 sticky top-0">
                    <div className="flex bg-secondary p-1 rounded-full">
                        <button
                            onClick={() => setActiveTab('month')}
                            className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${activeTab === 'month'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setActiveTab('all-time')}
                            className={`flex-1 py-2 text-sm font-medium rounded-full transition-all ${activeTab === 'all-time'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            All Time
                        </button>
                    </div>
                </div>

                {/* My Rank (Sticky) */}
                <div className="px-4 pb-2 z-10 bg-background sticky top-[130px]">
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-primary min-w-[1.5rem] text-center">#{currentUserStats.rank}</span>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg ring-2 ring-background">
                                    {currentUserStats.avatar}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">You</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                                        <span>{currentUserStats.streak} day streak</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg">{currentUserStats.points.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">points</p>
                        </div>
                    </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-1">
                    {leaderboardData.filter(u => !u.isCurrentUser).map((user) => (
                        <div key={user.username} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="min-w-[1.5rem] flex justify-center">
                                    {getRankIcon(user.rank)}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                                        {user.avatar}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{user.username}</p>
                                        {user.streak > 0 && (
                                            <div className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                                                <Flame className="w-3 h-3 fill-orange-500" />
                                                <span>{user.streak} days</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="font-bold">{user.points.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">pts</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
