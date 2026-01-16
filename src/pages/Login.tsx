import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet } = useWallet();

  const handleConnect = () => {
    connectWallet();
    navigate('/onboarding');
  };

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        {/* Spacer */}
        <div />

        {/* Logo */}
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl font-black tracking-tight">PayPath.</h1>
        </div>

        {/* Connect Button */}
        <div className="animate-slide-up">
          <button onClick={handleConnect} className="btn-primary">
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
