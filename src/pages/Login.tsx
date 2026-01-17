import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { useWalletConnect } from '@/hooks/useWalletConnect';

// Detect if user is on mobile device
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const isSmallScreen = window.innerWidth <= 768;
  return mobileRegex.test(userAgent.toLowerCase()) || isSmallScreen;
};

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected, username } = useWallet();
  const currentAccount = useCurrentAccount();
  const [hasClickedConnect, setHasClickedConnect] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // WalletConnect hook for mobile deeplink
  const { openSlushWallet, isConnecting: wcConnecting } = useWalletConnect();

  useEffect(() => {
    setIsMobile(isMobileDevice());
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

  // Handle mobile wallet connection with WalletConnect deeplink
  const handleMobileConnect = async () => {
    setHasClickedConnect(true);
    await openSlushWallet();
  };

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
          {isMobile ? (
            <>
              {/* Mobile: Show Open in App button with WalletConnect */}
              <button
                onClick={handleMobileConnect}
                className="btn-primary w-full"
                disabled={wcConnecting}
              >
                {wcConnecting ? 'Opening Wallet...' : 'Open in Slush Wallet'}
              </button>

              <div onClick={handleConnectClick}>
                <div className="sui-connect-wrapper">
                  <ConnectButton />
                </div>
              </div>
            </>
          ) : (
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
