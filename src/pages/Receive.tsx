import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

type ReceiveMode = 'wallet' | 'bank';

const Receive = () => {
  const navigate = useNavigate();
  const { username, isConnected } = useWallet();
  const [mode, setMode] = useState<ReceiveMode>('wallet');

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  // Generate a simple visual QR representation
  const QRPlaceholder = () => (
    <div className="w-48 h-48 border-2 border-foreground mx-auto flex items-center justify-center">
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 25 }).map((_, i) => (
          <div 
            key={i} 
            className={`w-6 h-6 ${Math.random() > 0.5 ? 'bg-foreground' : 'bg-background border border-border'}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="page-wrapper">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <h1 className="text-xl font-bold">Receive</h1>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            Done
          </button>
        </div>

        {/* QR Code Area */}
        <div className="flex-1 flex flex-col justify-center items-center animate-slide-up">
          <QRPlaceholder />
          
          <div className="mt-6 text-center">
            <p className="font-semibold text-lg">@{username}</p>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === 'wallet' ? 'Receive SUI to wallet' : 'Receive VND to bank'}
            </p>
          </div>

          {mode === 'bank' && (
            <div className="mt-4 border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bank Account</p>
              <p className="font-mono font-semibold">9704 **** **** 1234</p>
              <p className="text-sm text-muted-foreground">Vietcombank</p>
            </div>
          )}
        </div>

        {/* Segmented Control */}
        <div className="segment-control mt-8 animate-slide-up">
          <button
            onClick={() => setMode('wallet')}
            className={`segment-item ${mode === 'wallet' ? 'segment-item-active' : 'segment-item-inactive'}`}
          >
            Wallet (SUI)
          </button>
          <button
            onClick={() => setMode('bank')}
            className={`segment-item ${mode === 'bank' ? 'segment-item-active' : 'segment-item-inactive'}`}
          >
            Bank (VND)
          </button>
        </div>
      </div>
    </div>
  );
};

export default Receive;
