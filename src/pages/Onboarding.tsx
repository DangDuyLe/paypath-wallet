import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken';

// Mock taken usernames
const takenUsernames = ['alice', 'bob', 'charlie', 'admin', 'paypath'];

const Onboarding = () => {
  const navigate = useNavigate();
  const { setUsername, isConnected } = useWallet();
  const [inputUsername, setInputUsername] = useState('');
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [error, setError] = useState('');

  if (!isConnected) {
    navigate('/');
    return null;
  }

  const handleCheck = async () => {
    const trimmed = inputUsername.trim().toLowerCase();
    
    if (!trimmed) {
      setError('Username cannot be empty');
      return;
    }
    
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setError('Only lowercase letters, numbers, and underscores');
      return;
    }

    setError('');
    setCheckStatus('checking');

    // Simulate API check
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (takenUsernames.includes(trimmed)) {
      setCheckStatus('taken');
    } else {
      setCheckStatus('available');
    }
  };

  const handleConfirm = () => {
    const trimmed = inputUsername.trim().toLowerCase();
    setUsername(trimmed);
    navigate('/dashboard');
  };

  const handleInputChange = (value: string) => {
    setInputUsername(value);
    setCheckStatus('idle');
    setError('');
  };

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold tracking-tight">Create Identity</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Choose a unique username for your PayPath account.
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4 animate-slide-up">
          <div className="card-container">
            <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3 block">
              Username
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center bg-secondary rounded-xl px-4">
                <span className="text-muted-foreground font-medium">@</span>
                <input
                  type="text"
                  value={inputUsername}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="username"
                  className="flex-1 px-2 py-3.5 bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={handleCheck}
                disabled={!inputUsername.trim() || checkStatus === 'checking'}
                className="px-5 py-3.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {checkStatus === 'checking' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Check
              </button>
            </div>

            {/* Status Feedback */}
            {error && (
              <div className="mt-4 flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {checkStatus === 'available' && (
              <div className="mt-4 flex items-center gap-2 text-success">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Username is available!</span>
              </div>
            )}

            {checkStatus === 'taken' && (
              <div className="mt-4 flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Username taken. Try another.</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirm Button */}
        <div className="animate-slide-up">
          <button 
            onClick={handleConfirm} 
            className="btn-primary"
            disabled={checkStatus !== 'available'}
          >
            Confirm Username
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
