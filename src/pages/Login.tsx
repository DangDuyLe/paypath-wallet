import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useWallet } from '@/context/WalletContext';
import { Smartphone, Monitor } from 'lucide-react';

// Detect if user is on mobile device
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor;

  // Check for mobile user agents
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;

  // Also check screen width
  const isSmallScreen = window.innerWidth <= 768;

  return mobileRegex.test(userAgent.toLowerCase()) || isSmallScreen;
};

// Slush Wallet Universal Link and App Store URLs
const SLUSH_LINKS = {
  // Universal link - opens app directly on iOS/Android if installed
  universal: 'https://slush.app',
  // App store links as fallback
  appStore: 'https://apps.apple.com/app/slush-wallet',
  playStore: 'https://play.google.com/store/apps/details?id=app.slush.wallet',
};

// Get current page URL for callback after wallet connection
const getCurrentUrl = (): string => {
  if (typeof window === 'undefined') return '';
  return window.location.href;
};

// Open Slush Wallet app using Universal Link
const openSlushWallet = () => {
  const currentUrl = encodeURIComponent(getCurrentUrl());

  // Use Universal Link with dapp URL parameter
  // This opens Slush app and loads the current dApp in its in-app browser
  const universalLink = `${SLUSH_LINKS.universal}/browser?url=${currentUrl}`;

  window.location.href = universalLink;
};

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected, username } = useWallet();
  const account = useCurrentAccount();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    if (account?.address) {
      connectWallet(account.address);
    }
  }, [account?.address, connectWallet]);

  useEffect(() => {
    if (isConnected && username) {
      navigate('/dashboard');
    } else if (isConnected && !username) {
      navigate('/onboarding');
    }
  }, [isConnected, username, navigate]);

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Top section - Logo */}
        <div className="pt-16 animate-fade-in">
          <p className="label-caps mb-4">Sui Payments</p>
        </div>

        {/* Middle section - App name */}
        <div className="flex-1 flex flex-col justify-center animate-slide-up">
          <h1 className="display-large mb-4">PayPath</h1>
          <p className="text-xl text-muted-foreground max-w-[280px]">
            USDC payments via usernames. Simple. Fast. Secure.
          </p>
        </div>

        {/* Bottom section - Connect buttons */}
        <div className="pb-12 space-y-4 animate-slide-up stagger-2">
          {isMobile ? (
            <>
              {/* Mobile: Show Open in App button */}
              <button
                onClick={openSlushWallet}
                className="btn-primary flex items-center justify-center gap-3"
              >
                <Smartphone className="w-5 h-5" />
                Open in Slush Wallet
              </button>

              {/* Toggle to show browser connect option */}
              <button
                onClick={() => setShowMobileOptions(!showMobileOptions)}
                className="w-full text-center text-sm text-muted-foreground py-2"
              >
                {showMobileOptions ? 'Hide options' : 'Other connection methods'}
              </button>

              {showMobileOptions && (
                <div className="space-y-3 animate-fade-in">
                  <p className="text-xs text-muted-foreground text-center">
                    If you have Slush extension in this browser:
                  </p>
                  <div className="sui-connect-wrapper">
                    <ConnectButton />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <a
                      href={SLUSH_LINKS.appStore}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex-1 text-center text-sm"
                    >
                      App Store
                    </a>
                    <a
                      href={SLUSH_LINKS.playStore}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex-1 text-center text-sm"
                    >
                      Play Store
                    </a>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Desktop: Show normal Connect button */}
              <div className="sui-connect-wrapper">
                <ConnectButton />
              </div>

              <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Monitor className="w-4 h-4" />
                Connect with Slush Wallet extension
              </p>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground pt-4">
            By connecting, you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
