import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected, username } = useWallet();
  const currentAccount = useCurrentAccount();
  const [hasClickedConnect, setHasClickedConnect] = useState(false);

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
          <div onClick={handleConnectClick}>
            <div className="sui-connect-wrapper">
              <ConnectButton />
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Powered by Sui Blockchain
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
