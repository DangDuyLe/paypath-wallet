import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

const Onboarding = () => {
  const navigate = useNavigate();
  const { setUsername, username: existingUsername } = useWallet();
  const [inputUsername, setInputUsername] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (existingUsername) {
      if (window.location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [existingUsername, navigate]);

  const handleSubmit = () => {
    const clean = inputUsername.replace('@', '').trim().toLowerCase();

    if (clean.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(clean)) {
      setError('Only letters, numbers, and underscores allowed');
      return;
    }

    setIsChecking(true);

    // Simulate check
    setTimeout(() => {
      setUsername(clean);
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Top */}
        <div className="pt-16 animate-fade-in">
          <p className="label-caps mb-4">Almost there</p>
          <h1 className="display-medium">Choose your<br />username</h1>
        </div>

        {/* Middle */}
        <div className="py-8 animate-slide-up">
          <div className="flex items-center">
            <span className="text-3xl font-bold mr-2">@</span>
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => {
                setInputUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="username"
              className="flex-1 py-4 bg-transparent text-3xl font-bold placeholder:text-muted-foreground focus:outline-none border-b-2 border-border focus:border-foreground transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-destructive mt-4">{error}</p>
          )}

          <p className="text-muted-foreground mt-4">
            This is how people will find and pay you
          </p>
        </div>

        {/* Bottom */}
        <div className="pb-8 animate-slide-up stagger-1">
          <button
            onClick={handleSubmit}
            disabled={!inputUsername || isChecking}
            className="btn-primary"
          >
            {isChecking ? 'Creating...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
