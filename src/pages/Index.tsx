import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

const Index = () => {
  const navigate = useNavigate();
  const { isConnected, username } = useWallet();

  useEffect(() => {
    if (isConnected && username) {
      navigate('/dashboard');
    } else if (isConnected) {
      navigate('/onboarding');
    } else {
      navigate('/login');
    }
  }, [isConnected, username, navigate]);

  return (
    <div className="app-container">
      <div className="page-wrapper justify-center items-center">
        <h1 className="text-4xl font-black tracking-tight animate-fade-in">PayPath.</h1>
      </div>
    </div>
  );
};

export default Index;
