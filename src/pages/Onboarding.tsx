import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

const Onboarding = () => {
  const navigate = useNavigate();
  const { setUsername, isConnected } = useWallet();
  const [inputUsername, setInputUsername] = useState('');
  const [error, setError] = useState('');

  // Redirect if not connected
  if (!isConnected) {
    navigate('/');
    return null;
  }

  const handleClaim = () => {
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

    setUsername(trimmed);
    navigate('/dashboard');
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
          <div>
            <div className="flex items-center border border-border">
              <span className="pl-4 text-muted-foreground font-medium">@</span>
              <input
                type="text"
                value={inputUsername}
                onChange={(e) => {
                  setInputUsername(e.target.value);
                  setError('');
                }}
                placeholder="username"
                className="flex-1 px-2 py-3 bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-foreground mt-2 font-medium">{error}</p>
            )}
          </div>
        </div>

        {/* Claim Button */}
        <div className="animate-slide-up">
          <button 
            onClick={handleClaim} 
            className="btn-primary"
            disabled={!inputUsername.trim()}
          >
            Claim Username
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
