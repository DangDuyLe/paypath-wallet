import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { ConnectButton, useCurrentAccount, useDisconnectWallet, useAccounts } from '@mysten/dapp-kit';
import { useAccount as useWagmiAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import { Copy, Check, LogOut, Wallet, ChevronRight } from 'lucide-react';
import ChainSelectorModal from '@/components/ChainSelectorModal';
import WalletSelectorModal from '@/components/WalletSelectorModal';

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const isSmallScreen = window.innerWidth <= 768;
  return mobileRegex.test(userAgent.toLowerCase()) || isSmallScreen;
};

const isInWalletBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('slush') || userAgent.includes('suiwallet') || userAgent.includes('metamask');
};

const Login = () => {
  const navigate = useNavigate();
  const { disconnect, currentChain, setCurrentChain, enableSui, enableAvax } = useWallet();
  const currentAccount = useCurrentAccount();
  const accounts = useAccounts();
  const { mutate: disconnectSuiWallet } = useDisconnectWallet();
  const [hasClickedConnect, setHasClickedConnect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInWalletBrowserState, setIsInWalletBrowserState] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const { loginWithWallet, isAuthLoading } = useAuth();
  const [, setAuthError] = useState<string | null>(null);

  // Wagmi hooks for EVM
  const wagmiAccount = useWagmiAccount();
  const { connect: connectAvax, connectors } = useConnect();
  const { disconnect: disconnectWagmi } = useDisconnect();

  // Determine if user is connected (either chain)
  const isEvmConnected = wagmiAccount.isConnected;
  const isSuiConnected = !!currentAccount?.address;
  const isAnyWalletConnected = isEvmConnected || isSuiConnected;

  // Use currentAccount if valid, otherwise fallback to first account if available
  const activeAccount = currentAccount || (accounts.length > 0 ? accounts[0] : null);

  // Get display address based on current chain
  const displayAddress = currentChain === 'AVAX'
    ? wagmiAccount.address
    : activeAccount?.address;

  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsInWalletBrowserState(isInWalletBrowser());
  }, []);

  useEffect(() => {
    if (!hasClickedConnect) return;
    if (currentAccount?.address || wagmiAccount.isConnected) {
      setShowWalletOptions(true);
      setShowChainSelector(false);
    }
  }, [currentAccount?.address, wagmiAccount.isConnected, hasClickedConnect]);

  // Auto-detect chain when wallet connects (only set once)
  useEffect(() => {
    if (currentChain !== null) return; // Already set, don't change

    if (wagmiAccount.isConnected && !currentAccount?.address) {
      setCurrentChain('AVAX');
    } else if (currentAccount?.address && !wagmiAccount.isConnected) {
      setCurrentChain('SUI');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount?.address, wagmiAccount.isConnected]);

  const handleConnectClick = () => {
    // If already connected, show options
    if (isAnyWalletConnected) {
      setShowWalletOptions(true);
      return;
    }

    // If both chains enabled, show chain selector
    if (enableSui && enableAvax) {
      setShowChainSelector(true);
      return;
    }

    // If only AVAX enabled, show wallet selector instead of auto-injected
    if (enableAvax && !enableSui) {
      setCurrentChain('AVAX');
      setShowWalletSelector(true);
      return;
    }

    // Default: Sui flow
    setHasClickedConnect(true);
  };

  const handleChainSelected = (chain?: 'SUI' | 'AVAX') => {
    setHasClickedConnect(true);
    if (chain === 'AVAX') {
      setShowWalletSelector(true);
    }
  };

  const handleAuthLogin = async () => {
    setAuthError(null);
    try {
      const { needsOnboarding } = await loginWithWallet();
      navigate(needsOnboarding ? '/onboarding' : '/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setAuthError(message);
    }
  };

  const handleDisconnect = () => {
    if (currentChain === 'AVAX' || wagmiAccount.isConnected) {
      disconnectWagmi();
    }
    if (currentChain === 'SUI' || currentAccount?.address) {
      disconnectSuiWallet();
    }
    disconnect();
    setShowWalletOptions(false);
    setCurrentChain(null);
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

  const showMobileInstructions = isMobile && !isInWalletBrowserState && !isAnyWalletConnected;

  // Render connected wallet card
  const renderConnectedCard = () => (
    <div className="card-modern p-5 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">
            {currentChain === 'AVAX' ? 'Avalanche Wallet' : 'Sui Wallet'}
          </p>
          {displayAddress && (
            <p className="text-sm text-muted-foreground font-mono">
              {displayAddress.slice(0, 8)}...{displayAddress.slice(-6)}
            </p>
          )}
        </div>
        {currentChain && (
          <div className="text-xs px-2 py-1 rounded-full bg-muted">
            {currentChain}
          </div>
        )}
      </div>

      <button
        onClick={handleAuthLogin}
        disabled={isAuthLoading}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {isAuthLoading ? 'Signing...' : 'Continue to App'}
        <ChevronRight className="w-4 h-4" />
      </button>

      <button
        onClick={handleDisconnect}
        className="w-full py-3 rounded-xl border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Disconnect Wallet
      </button>
    </div>
  );

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Top spacer */}
        <div className="pt-16" />

        {/* Center content */}
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">HiddenWallet</h1>
          <p className="text-muted-foreground">
            {enableAvax && enableSui
              ? 'Send money instantly with Sui & Avalanche'
              : enableAvax
                ? 'Send money instantly with Avalanche'
                : 'Send money instantly with Sui'
            }
          </p>
        </div>

        {/* Bottom section */}
        <div className="space-y-4 animate-slide-up pb-6">
          {/* Priority: Show connected options first */}
          {isAnyWalletConnected ? (
            renderConnectedCard()
          ) : showMobileInstructions ? (
            /* Mobile: Show instructions when not connected */
            <>
              {/* MetaMask Deep Link (AVAX) */}
              {enableAvax && (
                <div className="card-modern p-5 space-y-4 mb-4">
                  <p className="text-sm font-medium text-center">
                    Open in MetaMask to connect
                  </p>

                  <a
                    href={`https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`}
                    className="btn-primary flex items-center justify-center gap-2 no-underline text-primary-foreground"
                  >
                    <Wallet className="w-5 h-5" />
                    Open in MetaMask
                  </a>

                  <div className="text-center">
                    <button
                      onClick={() => copyAppLink()}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied Link' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              )}

              {/* Slush/Sui Deep Link (SUI) */}
              {enableSui && (
                <div className="card-modern p-5 space-y-4">
                  <p className="text-sm font-medium text-center">
                    Open in Slush Wallet to connect
                  </p>

                  <button
                    onClick={copyAppLink}
                    className="btn-primary flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy App Link
                      </>
                    )}
                  </button>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex gap-3 items-center">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                      <span>Open <strong className="text-foreground">Slush Wallet</strong></span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                      <span>Go to <strong className="text-foreground">Apps</strong> tab</span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                      <span>Paste link & tap <strong className="text-foreground">Connect</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Allow direct connect attempt even on mobile (fallback) */}
              {enableSui && (
                <div onClick={handleConnectClick} className="mt-4 opacity-80 scale-90">
                  <div className="sui-connect-wrapper">
                    <ConnectButton />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Desktop: Show connect options based on enabled chains */
            <div className="space-y-3">
              {/* Main Connect Button */}
              {enableSui && !enableAvax ? (
                // Sui only mode
                <div onClick={handleConnectClick}>
                  <div className="sui-connect-wrapper">
                    <ConnectButton />
                  </div>
                </div>
              ) : enableAvax && !enableSui ? (
                // AVAX only mode
                <button
                  onClick={handleConnectClick}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  Connect MetaMask
                </button>
              ) : (
                // Both enabled - show unified button that opens selector
                <>
                  <button
                    onClick={handleConnectClick}
                    className="btn-primary flex items-center justify-center gap-3"
                  >
                    <Wallet className="w-5 h-5" />
                    Connect Wallet
                  </button>

                  {/* Sui connect button (hidden but functional for modal) */}
                  {hasClickedConnect && currentChain === 'SUI' && enableSui && (
                    <div className="sui-connect-wrapper">
                      <ConnectButton />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Powered by{' '}
            {enableSui && <span className="font-medium">Sui</span>}
            {enableSui && enableAvax && ' & '}
            {enableAvax && <span className="font-medium">Avalanche</span>}
            {' & '}<span className="font-medium">Gaian</span>
          </p>
        </div>
      </div>

      <ChainSelectorModal
        open={showChainSelector}
        onOpenChange={setShowChainSelector}
        onChainSelected={handleChainSelected}
      />

      <WalletSelectorModal
        open={showWalletSelector}
        onOpenChange={setShowWalletSelector}
      />
    </div>
  );
};

export default Login;