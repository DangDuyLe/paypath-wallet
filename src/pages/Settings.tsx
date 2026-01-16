import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

const Settings = () => {
  const navigate = useNavigate();
  const { username, disconnect, isConnected } = useWallet();

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  return (
    <div className="app-container">
      <div className="page-wrapper">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <h1 className="text-xl font-bold">Settings</h1>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            Done
          </button>
        </div>

        {/* Account Info */}
        <div className="animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Account
          </h2>
          <div className="border border-border divide-y divide-border">
            <div className="px-4 py-3 flex justify-between">
              <span className="text-muted-foreground">Username</span>
              <span className="font-semibold">@{username}</span>
            </div>
            <div className="px-4 py-3 flex justify-between">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium">Sui Mainnet</span>
            </div>
            <div className="px-4 py-3 flex justify-between">
              <span className="text-muted-foreground">Wallet</span>
              <span className="font-mono text-sm">0x7a3b...f92d</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Actions
          </h2>
          <div className="border border-border divide-y divide-border">
            <button className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors">
              Export Private Key
            </button>
            <button className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors">
              Transaction History
            </button>
            <button className="w-full px-4 py-3 text-left hover:bg-secondary transition-colors">
              Support
            </button>
          </div>
        </div>

        {/* Disconnect */}
        <div className="mt-auto pt-8 animate-slide-up">
          <button onClick={handleDisconnect} className="btn-outlined">
            Disconnect Wallet
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          PayPath v1.0.0 · Built on Sui
        </p>
      </div>
    </div>
  );
};

export default Settings;
