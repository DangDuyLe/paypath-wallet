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
  const [activeField, setActiveField] = useState<string | null>(null);
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
                {/* Hidden Real Input - Captures keystrokes, fixed position to avoid layout shift */}
                <input
                  ref={usernameRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={inputUsername}
                  onChange={(e) => {
                    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setInputUsername(clean);
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  onFocus={() => setActiveField('username')}
                  onBlur={() => setActiveField(null)}
                  className="fixed top-0 left-0 w-full h-12 opacity-0 -z-0 pointer-events-none"
                  style={{ transform: 'translateY(-1000px)' }}
                  aria-hidden="true"
                />

                {/* Visible Fake Input - Displays value */}
                <div
                  onClick={() => {
                    if (usernameRef.current) {
                      usernameRef.current.style.transform = 'translateY(0)';
                      usernameRef.current.style.pointerEvents = 'auto';
                      usernameRef.current.focus();
                    }
                  }}
                  className={`flex-1 min-w-0 w-full py-3 bg-transparent text-2xl font-bold border-b-2 transition-colors cursor-text ${inputUsername ? 'text-foreground' : 'text-muted-foreground'
                    } ${activeField === 'username' ? 'border-foreground' : 'border-border'}`}
                >
                  {inputUsername || 'username'}
                  {activeField === 'username' && (
                    <span className="animate-pulse inline-block w-0.5 h-6 bg-primary align-middle ml-0.5" />
                  )}
                </div>
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
                <input
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  onFocus={() => setActiveField('email')}
                  onBlur={() => setActiveField(null)}
                  className="fixed top-0 left-0 w-full h-12 opacity-0 -z-0 pointer-events-none"
                  style={{ transform: 'translateY(-1000px)' }}
                  aria-hidden="true"
                />

                <div
                  onClick={() => {
                    if (emailRef.current) {
                      emailRef.current.style.transform = 'translateY(0)';
                      emailRef.current.style.pointerEvents = 'auto';
                      emailRef.current.focus();
                    }
                  }}
                  className={`flex-1 py-3 bg-transparent border-b transition-colors cursor-text ${email ? 'text-foreground' : 'text-muted-foreground'
                    } ${activeField === 'email' ? 'border-foreground' : 'border-border'}`}
                >
                  {email || 'Email address'}
                  {activeField === 'email' && (
                    <span className="animate-pulse inline-block w-0.5 h-4 bg-primary align-middle ml-0.5" />
                  )}
                </div>
              </div>

              {/* Referral Input */}
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <input
                  ref={referralRef}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  value={referral}
                  onChange={(e) => {
                    setReferral(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setError('');
                  }}
                  onFocus={() => setActiveField('referral')}
                  onBlur={() => setActiveField(null)}
                  className="fixed top-0 left-0 w-full h-12 opacity-0 -z-0 pointer-events-none"
                  style={{ transform: 'translateY(-1000px)' }}
                  aria-hidden="true"
                />

                <div
                  onClick={() => {
                    if (referralRef.current) {
                      referralRef.current.style.transform = 'translateY(0)';
                      referralRef.current.style.pointerEvents = 'auto';
                      referralRef.current.focus();
                    }
                  }}
                  className={`flex-1 py-3 bg-transparent border-b transition-colors cursor-text ${referral ? 'text-foreground' : 'text-muted-foreground'
                    } ${activeField === 'referral' ? 'border-foreground' : 'border-border'}`}
                >
                  {referral || 'Referral username (optional)'}
                  {activeField === 'referral' && (
                    <span className="animate-pulse inline-block w-0.5 h-4 bg-primary align-middle ml-0.5" />
                  )}
                </div>
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
