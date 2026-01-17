import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Copy, Check, LogOut, Wallet, ChevronRight } from 'lucide-react';

// --- Helper Functions from Main ---
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const isSmallScreen = window.innerWidth <= 768;
  return mobileRegex.test(userAgent.toLowerCase()) || isSmallScreen;
};

const isInSlushBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('slush') || userAgent.includes('suiwallet');
};

const Login = () => {
  const navigate = useNavigate();
  
  // --- Hooks from both branches ---
  const { connectWallet, username, disconnect } = useWallet();
  const { 
    accessToken, 
    isAuthenticating, 
    error, 
    loginWithWallet, 
    loginWithZkLogin, 
    completeZkLoginWithIdToken 
  } = useAuth();
  
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectSuiWallet } = useDisconnectWallet();

  // --- State Merging ---
  const [hasClickedConnect, setHasClickedConnect] = useState(false);
  const [didAttemptAuth, setDidAttemptAuth] = useState(false);
  const didConsumeZkLoginIdTokenRef = useRef(false); // Ref for ZkLogin uniqueness
  
  // UI States from Main
  const [isMobile, setIsMobile] = useState(false);
  const [isInWalletBrowser, setIsInWalletBrowser] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  // --- Effects ---

  // 1. Mobile Detection (Main)
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsInWalletBrowser(isInSlushBrowser());
  }, []);

  // 2. Auto-connect Wallet Logic (Merged)
  useEffect(() => {
    if (currentAccount && hasClickedConnect) {
      connectWallet(currentAccount.address);
    }
  }, [currentAccount, hasClickedConnect, connectWallet]);

  // 3. Trigger Auth after Wallet Connection (Zklogin Logic)
  useEffect(() => {
    const run = async () => {
      if (
        currentAccount?.address &&
        hasClickedConnect &&
        !accessToken &&
        !isAuthenticating &&
        !didAttemptAuth
      ) {
        setDidAttemptAuth(true);
        try {
          await loginWithWallet();
        } catch {
          // error is exposed via AuthContext
        }
      }
    };
    run();
  }, [currentAccount?.address, hasClickedConnect, accessToken, isAuthenticating, didAttemptAuth, loginWithWallet]);

  // 4. Navigation Redirect (Zklogin Logic is safer)
  useEffect(() => {
    if (!accessToken) return;
    const nextPath = username ? '/dashboard' : '/onboarding';
    if (window.location.pathname === nextPath) return;
    navigate(nextPath, { replace: true });
  }, [accessToken, username, navigate]);

  // 5. Handle Google Callback (Zklogin Core Logic)
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const hashSp = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const searchSp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

    const idToken = hashSp.get('id_token') || searchSp.get('id_token');
    const errorParam = hashSp.get('error') || searchSp.get('error');

    if (!idToken && !errorParam) return;

    if (errorParam) {
      window.history.replaceState(null, '', window.location.pathname);
      sessionStorage.removeItem('paypath.zklogin.consumedIdToken');
      return;
    }

    if (idToken) {
      if (didConsumeZkLoginIdTokenRef.current) return;
      didConsumeZkLoginIdTokenRef.current = true;

      if (!accessToken && !isAuthenticating) {
        (async () => {
          try {
            await completeZkLoginWithIdToken(idToken);
            window.history.replaceState(null, '', window.location.pathname);
          } catch (e) {
            console.error('[zklogin] error', e);
            window.history.replaceState(null, '', window.location.pathname);
            sessionStorage.removeItem('paypath.zklogin.consumedIdToken');
          }
        })();
      }
    }
  }, [accessToken, isAuthenticating, completeZkLoginWithIdToken]);

  // --- Handlers ---

  const handleConnectClick = () => {
    if (currentAccount) {
      setShowWalletOptions(true);
      return;
    }
    setHasClickedConnect(true);
  };

  const handleDisconnect = () => {
    disconnectSuiWallet();
    disconnect();
    setShowWalletOptions(false);
    setHasClickedConnect(false);
  };

  const handleContinueWithWallet = () => {
    if (currentAccount) {
      setHasClickedConnect(true); // Trigger the auth flow
    }
  };

  const handleRetryAuth = async () => {
    setDidAttemptAuth(false);
  };

  const copyAppLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const showMobileInstructions = isMobile && !isInWalletBrowser;

  // --- Render ---
  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Header */}
        <div className="pt-16" />
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">HiddenWallet</h1>
          <p className="text-muted-foreground">
            Send money instantly with Sui & ZkLogin
          </p>
        </div>

        {/* Content Area */}
        <div className="space-y-4 animate-slide-up pb-6">
          
          {/* Scenario 1: Mobile Browser Instruction */}
          {showMobileInstructions ? (
            <div className="card-modern p-5 space-y-4">
              <p className="text-sm font-medium text-center">Open in Slush Wallet to connect</p>
              <button onClick={copyAppLink} className="btn-primary flex items-center justify-center gap-2">
                {copied ? <><Check className="w-5 h-5" /> Link Copied!</> : <><Copy className="w-5 h-5" /> Copy App Link</>}
              </button>
              {/* Instructions text... */}
              <div className="space-y-2 text-sm text-muted-foreground">
                 {/* ... (Giữ nguyên phần hướng dẫn mobile của nhánh main) ... */}
                 <div className="flex gap-3 items-center">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                    <span>Open Slush Wallet</span>
                 </div>
                 {/* ... */}
              </div>
              
              {/* Fallback connect button */}
              <div onClick={handleConnectClick} className="sui-connect-wrapper">
                <ConnectButton />
              </div>
            </div>
          ) : currentAccount && showWalletOptions ? (
            
            /* Scenario 2: Wallet Connected Options */
            <div className="card-modern p-5 space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Connected Wallet</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {currentAccount.address.slice(0, 8)}...{currentAccount.address.slice(-6)}
                  </p>
                </div>
              </div>
              <button onClick={handleContinueWithWallet} className="btn-primary flex items-center justify-center gap-2">
                Continue to App <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={handleDisconnect} className="w-full py-3 rounded-xl border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Disconnect Wallet
              </button>
            </div>

          ) : (
            
            /* Scenario 3: Main Login (Connect Wallet + Google) */
            <div className="space-y-4">
              {/* Option A: Wallet */}
              <div onClick={handleConnectClick} className="sui-connect-wrapper">
                <ConnectButton />
              </div>

              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Option B: Google (ZkLogin) */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="w-full py-6 text-base"
                  onClick={async () => {
                    try { await loginWithZkLogin(); } catch {}
                  }}
                  disabled={isAuthenticating}
                >
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                  Continue with Google
                </Button>
              </div>

              {/* Status/Error Messages */}
              {hasClickedConnect && (isAuthenticating || error) && (
                <div className="space-y-2 pt-2">
                  <p className="text-center text-sm text-muted-foreground">
                    {isAuthenticating ? 'Authenticating...' : error}
                  </p>
                  {!isAuthenticating && error && (
                    <div className="flex justify-center">
                      <Button variant="secondary" size="sm" onClick={handleRetryAuth}>
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground pt-4">
            Powered by <span className="font-medium">Sui</span> & <span className="font-medium">Gaian</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;