import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';

type SendStep = 'input' | 'review' | 'success';

const Send = () => {
  const navigate = useNavigate();
  const { sendSui, balance, isConnected, username } = useWallet();
  
  const [step, setStep] = useState<SendStep>('input');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isBankQR, setIsBankQR] = useState(false);

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  const fee = 0.01;

  const handleScanQR = () => {
    // Simulate scanning a bank QR - in real app, this would open camera
    const mockBankQR = true;
    if (mockBankQR) {
      setRecipient('@bank_user_123');
      setIsBankQR(true);
    }
  };

  const validateAndProceed = () => {
    const trimmedRecipient = recipient.trim();
    const amountNum = parseFloat(amount);

    if (!trimmedRecipient) {
      setError('Enter a recipient');
      return;
    }

    if (!trimmedRecipient.startsWith('@')) {
      setError('Username must start with @');
      return;
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (amountNum + fee > balance) {
      setError('Insufficient balance');
      return;
    }

    setStep('review');
  };

  const handleConfirm = () => {
    sendSui(recipient, parseFloat(amount));
    setStep('success');
  };

  if (step === 'success') {
    return (
      <div className="app-container">
        <div className="page-wrapper justify-between">
          <div />
          
          <div className="text-center animate-fade-in">
            <p className="text-4xl font-black mb-4">Sent</p>
            <p className="text-muted-foreground">
              {amount} SUI to {recipient}
            </p>
          </div>

          <button onClick={() => navigate('/dashboard')} className="btn-primary animate-slide-up">
            Done
          </button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="app-container">
        <div className="page-wrapper">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 animate-fade-in">
            <h1 className="text-xl font-bold">Review</h1>
            <button 
              onClick={() => setStep('input')}
              className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
            >
              Edit
            </button>
          </div>

          {/* Summary */}
          <div className="flex-1 animate-slide-up">
            <div className="border border-border divide-y divide-border">
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-semibold">{recipient}</span>
              </div>
              {isBankQR && (
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">Bank QR (Off-chain)</span>
                </div>
              )}
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{amount} SUI</span>
              </div>
              <div className="px-4 py-3 flex justify-between">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium">{fee} SUI</span>
              </div>
              <div className="px-4 py-3 flex justify-between bg-secondary">
                <span className="font-semibold">Total</span>
                <span className="font-black">{(parseFloat(amount) + fee).toFixed(2)} SUI</span>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button onClick={handleConfirm} className="btn-primary mt-8 animate-slide-up">
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="page-wrapper">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <h1 className="text-xl font-bold">Send SUI</h1>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4 flex-1 animate-slide-up">
          <div>
            <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
              Recipient
            </label>
            <div className="flex border border-border">
              <input
                type="text"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setError('');
                  setIsBankQR(false);
                }}
                placeholder="@username"
                className="flex-1 px-4 py-3 bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground focus:outline-none"
              />
              <button 
                onClick={handleScanQR}
                className="px-4 text-sm font-semibold uppercase border-l border-border hover:bg-secondary transition-colors"
              >
                Scan QR
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
              Amount
            </label>
            <div className="flex border border-border">
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="0.00"
                className="flex-1 px-4 py-3 bg-transparent text-foreground text-base font-medium placeholder:text-muted-foreground focus:outline-none"
                step="0.01"
                min="0"
              />
              <span className="px-4 py-3 text-muted-foreground font-medium border-l border-border bg-secondary">
                SUI
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Available: {balance.toFixed(2)} SUI
            </p>
          </div>

          {error && (
            <p className="text-sm text-foreground font-medium border border-border p-3 bg-secondary">
              {error}
            </p>
          )}
        </div>

        {/* Continue Button */}
        <button 
          onClick={validateAndProceed} 
          className="btn-primary mt-8"
          disabled={!recipient || !amount}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default Send;
