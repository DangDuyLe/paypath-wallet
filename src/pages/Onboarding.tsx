import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { checkUsername, postOnboarding, postRegister } from '@/services/api';
import { toast } from 'sonner';
import { Mail, Users } from 'lucide-react';
import { useAccount as useWagmiAccount } from 'wagmi';

const Onboarding = () => {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const wagmiAccount = useWagmiAccount();
  const { isAuthenticated, refreshProfile } = useAuth();
  const { setUsername, username: existingUsername, walletAddress, currentChain } = useWallet();
  const [inputUsername, setInputUsername] = useState('');
  const [email, setEmail] = useState('');
  const [referral, setReferral] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const referralRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (existingUsername) {
      navigate('/dashboard');
    }
  }, [existingUsername, isAuthenticated, navigate]);

  // Native Input Event Listeners to bypass React Synthetic Events (fix for MetaMask WebView)


  if (!isAuthenticated || existingUsername) {
    return null;
  }

  const handleSubmit = async () => {
    const clean = inputUsername.replace('@', '').trim().toLowerCase();

    if (clean.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(clean)) {
      setError('Only letters, numbers, and underscores allowed');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsChecking(true);
    setError('');

    try {
      const res = await checkUsername(clean);
      const available = Boolean(res.data?.available);
      if (!available) {
        setError('Username already taken');
        return;
      }

      await postOnboarding({
        username: clean,
        email: email || undefined,
        referralUsername: referral || undefined,
      });

      // Use walletAddress from context (works for both Sui and EVM)
      const connectedAddress = walletAddress || currentAccount?.address || wagmiAccount.address;

      if (!connectedAddress) {
        throw new Error('No wallet connected');
      }

      try {
        await postRegister({
          walletAddress: connectedAddress,
          username: clean,
          email: email || undefined,
        });
      } catch (err: unknown) {
        const e = err as { response?: { status?: number }; message?: string };
        const status = e?.response?.status;
        const message = typeof e?.message === 'string' ? e.message : '';

        if (status !== 409 && !message.includes('status code 409')) {
          throw err;
        }
      }

      setUsername(clean);

      // Refresh profile to sync user data with AuthContext
      // Use timeout fallback in case refreshProfile hangs
      const redirectTimeout = setTimeout(() => {
        toast.info('Taking longer than expected...');
        navigate('/dashboard');
      }, 5000);

      try {
        await refreshProfile();
      } catch {
        // Profile refresh failed, but user is created - proceed anyway
        console.warn('Profile refresh failed, proceeding to dashboard');
      }

      clearTimeout(redirectTimeout);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onboarding failed';
      setError(message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="app-container">
      <div className="page-wrapper">
        <div className="flex-1 flex flex-col justify-start">
          {/* Top */}
          <div className="pt-12 animate-fade-in flex-shrink-0">
            <p className="label-caps mb-4">Almost there</p>
            <h1 className="display-medium">Choose your<br />username</h1>
          </div>

          {/* Middle */}
          <div className="py-6 animate-slide-up w-full max-w-full space-y-6">
            {/* Username Input */}
            <div>
              <div className="flex items-center w-full min-w-0">
                <span className="text-2xl font-bold mr-2 flex-shrink-0">@</span>
                <div
                  className="flex-1 min-w-0 w-full py-3 bg-transparent text-2xl font-bold border-b-2 border-border focus:outline-none focus:border-foreground transition-colors cursor-text"
                  contentEditable
                  inputMode="text"
                  spellCheck="false"
                  suppressContentEditableWarning
                  onInput={(e) => {
                    const target = e.currentTarget;
                    const val = target.textContent || '';
                    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');

                    // Force clean text in DOM if it contains invalid chars (prevent cursor jump issues best effort)
                    if (val !== clean) {
                      // Note: modifying textContent moves cursor to start. 
                      // For simple sanitization, we might just accept val and sanitize on submit, 
                      // OR strictly sanitize here but it might be annoying.
                      // Let's purely sync state for now and sanitize on submit to be safe with cursor.
                    }

                    setInputUsername(e.currentTarget.textContent || '');
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault(); // Prevent new line
                      handleSubmit();
                    }
                  }}
                  onBlur={(e) => {
                    // Sanitize strictly on blur
                    const val = e.currentTarget.textContent || '';
                    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    if (val !== clean) {
                      e.currentTarget.textContent = clean;
                      setInputUsername(clean);
                    }
                  }}
                  data-placeholder="username"
                  style={{
                    WebkitUserSelect: 'text',
                    userSelect: 'text',
                    emptyCells: 'show', // helper
                    minHeight: '48px', // ensure tap target
                    display: 'flex',
                    alignItems: 'center',
                  }}
                />
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                This is how people will find and pay you
              </p>
            </div>

            {/* Optional Fields */}
            <div className="space-y-4 pt-4 border-t border-border">
              <p className="label-caps text-muted-foreground">Optional</p>

              {/* Email Input */}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div
                  className="flex-1 py-3 bg-transparent border-b border-border focus:outline-none focus:border-foreground transition-colors cursor-text"
                  contentEditable
                  inputMode="email"
                  suppressContentEditableWarning
                  onInput={(e) => {
                    setEmail(e.currentTarget.textContent || '');
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  data-placeholder="Email address"
                  style={{
                    WebkitUserSelect: 'text',
                    userSelect: 'text',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                />
              </div>

              {/* Referral Input */}
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div
                  className="flex-1 py-3 bg-transparent border-b border-border focus:outline-none focus:border-foreground transition-colors cursor-text"
                  contentEditable
                  inputMode="text"
                  spellCheck="false"
                  suppressContentEditableWarning
                  onInput={(e) => {
                    setReferral(e.currentTarget.textContent || '');
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  data-placeholder="Referral username (optional)"
                  style={{
                    WebkitUserSelect: 'text',
                    userSelect: 'text',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="text-destructive">{error}</p>
            )}
          </div>
        </div>

        {/* Bottom */}
        <div className="pb-8 animate-slide-up stagger-1 flex-shrink-0">
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
