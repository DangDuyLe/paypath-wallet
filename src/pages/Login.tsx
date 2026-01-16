import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect } from 'react';

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, isConnected } = useWallet();
  const currentAccount = useCurrentAccount();

  // When Sui wallet connects, update our app state and navigate
  useEffect(() => {
    if (currentAccount && !isConnected) {
      connectWallet(currentAccount.address);
      navigate('/onboarding');
    }
  }, [currentAccount, isConnected, connectWallet, navigate]);

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Spacer */}
        <div />

        {/* Logo */}
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-black tracking-tight">PayPath.</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Sui Blockchain Wallet
          </p>
        </div>

        {/* Connect Button - uses @mysten/dapp-kit */}
        <div className="animate-slide-up">
          <div className="sui-connect-wrapper">
            <ConnectButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
