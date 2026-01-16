import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected, username } = useWallet();
  const currentAccount = useCurrentAccount();
  const [hasClickedConnect, setHasClickedConnect] = useState(false);

  // Only navigate when user explicitly clicks connect AND account is available
  useEffect(() => {
    if (currentAccount && hasClickedConnect) {
      connectWallet(currentAccount.address);
      // If user already has username (returning user), go to dashboard
      // Otherwise go to onboarding
      if (username) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [currentAccount, hasClickedConnect, connectWallet, navigate, username]);

  // If already connected with username, go to dashboard
  useEffect(() => {
    if (isConnected && username) {
      navigate('/dashboard');
    }
  }, [isConnected, username, navigate]);

  // Wrap the ConnectButton to detect when user clicks
  const handleConnectClick = () => {
    setHasClickedConnect(true);
  };

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Spacer */}
        <div />

        {/* Logo */}
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-black tracking-tight">PayPath</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Sui Blockchain Wallet
          </p>
        </div>

        {/* Connect Button - uses @mysten/dapp-kit */}
        <div className="animate-slide-up" onClick={handleConnectClick}>
          <div className="sui-connect-wrapper">
            <ConnectButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
