import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';

// Detect if user is on mobile device
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const isSmallScreen = window.innerWidth <= 768;
  return mobileRegex.test(userAgent.toLowerCase()) || isSmallScreen;
};

// Detect if running inside Slush wallet browser
const isInSlushBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Slush wallet browser typically injects wallet into window
  // or has specific user agent
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('slush') || userAgent.includes('suiwallet');
};

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected, username } = useWallet();
  const currentAccount = useCurrentAccount();
  const [hasClickedConnect, setHasClickedConnect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInWalletBrowser, setIsInWalletBrowser] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsInWalletBrowser(isInSlushBrowser());
  }, []);

  useEffect(() => {
    if (currentAccount && hasClickedConnect) {
      connectWallet(currentAccount.address);
      if (username) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [currentAccount, hasClickedConnect, connectWallet, navigate, username]);

  useEffect(() => {
    if (isConnected && username) {
      navigate('/dashboard');
    }
  }, [isConnected, username, navigate]);

  const handleConnectClick = () => {
    setHasClickedConnect(true);
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

  // Mobile outside wallet browser - show instructions
  const showMobileInstructions = isMobile && !isInWalletBrowser;

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Top spacer */}
        <div className="pt-20" />

        {/* Center content */}
        <div className="text-center animate-fade-in">
          <h1 className="display-large mb-4">PayPath</h1>
          <p className="text-muted-foreground text-lg">
            Send money instantly
          </p>
        </div>

        {/* Bottom section */}
        <div className="space-y-4 animate-slide-up pb-8">
          {showMobileInstructions ? (
            <>
              {/* Mobile: Show instructions */}
              <div className="bg-card rounded-2xl p-4 space-y-4">
                <p className="text-sm font-medium text-center">
                  Open this app in Slush Wallet
                </p>

                {/* Copy link button */}
                <button
                  onClick={copyAppLink}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy App Link
                    </>
                  )}
                </button>

                {/* Steps */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex gap-3 items-start">
                    <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                    <span>Open <strong className="text-foreground">Slush Wallet</strong> app</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                    <span>Go to <strong className="text-foreground">Apps</strong> tab</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                    <span>Paste the link in the search bar</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs font-bold">4</span>
                    <span>Tap <strong className="text-foreground">Connect</strong></span>
                  </div>
                </div>
              </div>

              {/* Also show connect button for in-browser wallet extensions */}
              <div onClick={handleConnectClick}>
                <div className="sui-connect-wrapper">
                  <ConnectButton />
                </div>
              </div>
            </>
          ) : (
            // Desktop or inside wallet browser - show normal connect
            <div onClick={handleConnectClick}>
              <div className="sui-connect-wrapper">
                <ConnectButton />
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Powered by Sui Blockchain
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
