import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { Scan, Check, AlertTriangle, ChevronDown, Wallet, Building2 } from 'lucide-react';
import QRScanner from '@/components/QRScanner';

type SendStep = 'input' | 'review' | 'success';

const Send = () => {
  const navigate = useNavigate();
  const {
    sendSui,
    balance,
    isConnected,
    username,
    lookupUsername,
    linkedWallets,
    linkedBanks,
    defaultAccountId,
    defaultAccountType,
  } = useWallet();

  const [step, setStep] = useState<SendStep>('input');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // Recipient validation
  const [isChecking, setIsChecking] = useState(false);
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);

  // Source selection
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(defaultAccountId);
  const [selectedSourceType, setSelectedSourceType] = useState<'wallet' | 'bank'>(defaultAccountType);

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  const allSources = [
    ...linkedWallets.map(w => ({ id: w.id, type: 'wallet' as const, name: w.name })),
    ...linkedBanks.map(b => ({ id: b.id, type: 'bank' as const, name: b.bankName })),
  ];

  const selectedSource = allSources.find(s => s.id === selectedSourceId && s.type === selectedSourceType) || allSources[0];

  const fee = 0.01;

  const checkRecipient = () => {
    if (!recipient || recipient.length < 2) return;
    setIsChecking(true);
    setTimeout(() => {
      const user = lookupUsername(recipient.replace('@', ''));
      setRecipientValid(!!user);
      setError('');
      setIsChecking(false);
    }, 300);
  };

  const handleQRScanned = (data: string) => {
    setShowScanner(false);
    setRecipient('@duy3000');
    setRecipientValid(true);
  };

  const validate = () => {
    const amountNum = parseFloat(amount);
    if (!recipient) { setError('Enter recipient'); return; }
    if (!recipientValid) { setError('Check recipient first'); return; }
    if (isNaN(amountNum) || amountNum <= 0) { setError('Invalid amount'); return; }
    if (amountNum + fee > balance) { setError('Insufficient balance'); return; }
    setStep('review');
  };

  const handleConfirm = () => {
    sendSui(recipient, parseFloat(amount));
    setStep('success');
  };

  // Success
  if (step === 'success') {
    return (
      <div className="app-container">
        <div className="page-wrapper justify-center items-center text-center">
          <div className="animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-success/10">
              <Check className="w-10 h-10 text-success" />
            </div>
            <p className="display-medium mb-4">Sent</p>
            <p className="text-2xl font-bold">{amount} SUI</p>
            <p className="text-muted-foreground mt-2">to {recipient}</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-12 animate-slide-up">
            Done
          </button>
        </div>
      </div>
    );
  }

  // Review
  if (step === 'review') {
    return (
      <div className="app-container">
        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-8 animate-fade-in">
            <h1 className="text-xl font-bold">Review</h1>
            <button onClick={() => setStep('input')} className="btn-ghost">Edit</button>
          </div>

          <div className="flex-1 animate-slide-up">
            <div className="border border-border">
              <div className="row-item px-4">
                <span className="text-muted-foreground">From</span>
                <div className="flex items-center gap-2">
                  {selectedSource?.type === 'wallet' ? <Wallet className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  <span className="font-medium">{selectedSource?.name}</span>
                </div>
              </div>
              <div className="row-item px-4">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">{recipient}</span>
              </div>
              <div className="row-item px-4">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} SUI</span>
              </div>
              <div className="row-item px-4">
                <span className="text-muted-foreground">Fee</span>
                <span className="font-medium">{fee} SUI</span>
              </div>
              <div className="row-item px-4 bg-secondary">
                <span className="font-bold">Total</span>
                <span className="font-bold">{(parseFloat(amount) + fee).toFixed(2)} SUI</span>
              </div>
            </div>
          </div>

          <button onClick={handleConfirm} className="btn-primary mt-8 animate-slide-up">
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // Input
  return (
    <>
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScanned}
        title="Scan QR"
      />

      <div className="app-container">
        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-8 animate-fade-in">
            <h1 className="text-xl font-bold">Send</h1>
            <button onClick={() => navigate('/dashboard')} className="btn-ghost">Cancel</button>
          </div>

          <div className="flex-1 space-y-6 animate-slide-up">
            {/* Source */}
            <div>
              <p className="label-caps mb-2">From</p>
              <button
                onClick={() => setShowSourceMenu(!showSourceMenu)}
                className="w-full text-left px-4 py-4 border border-border hover:bg-secondary transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {selectedSource?.type === 'wallet' ? <Wallet className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                  <span className="font-medium">{selectedSource?.name || 'Select source'}</span>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${showSourceMenu ? 'rotate-180' : ''}`} />
              </button>

              {showSourceMenu && (
                <div className="border border-border border-t-0">
                  {allSources.map(s => (
                    <button
                      key={`${s.type}-${s.id}`}
                      onClick={() => {
                        setSelectedSourceId(s.id);
                        setSelectedSourceType(s.type);
                        setShowSourceMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-border last:border-b-0 flex items-center gap-3"
                    >
                      {s.type === 'wallet' ? <Wallet className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      <span className={selectedSourceId === s.id ? 'font-bold' : ''}>{s.name}</span>
                      {selectedSourceId === s.id && selectedSourceType === s.type && (
                        <Check className="w-4 h-4 text-success ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recipient */}
            <div>
              <p className="label-caps mb-2">To</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      setRecipientValid(null);
                      setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && checkRecipient()}
                    placeholder="@username"
                    className={`input-box w-full pr-10 ${recipientValid === true ? 'border-success' :
                      recipientValid === false ? 'border-destructive' : ''
                      }`}
                  />
                  {recipientValid === true && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
                  )}
                  {recipientValid === false && (
                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
                  )}
                </div>
                <button
                  onClick={checkRecipient}
                  disabled={!recipient || isChecking}
                  className="px-6 border border-border hover:bg-secondary transition-colors disabled:opacity-30"
                >
                  {isChecking ? '...' : 'Check'}
                </button>
              </div>
              {recipientValid === true && (
                <p className="text-success text-sm mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" /> User found
                </p>
              )}
              {recipientValid === false && (
                <p className="text-destructive text-sm mt-2">User not found</p>
              )}
            </div>

            {/* Scan QR */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-full py-4 border border-border text-center font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2"
            >
              <Scan className="w-5 h-5" />
              Scan QR Code
            </button>

            {/* Amount */}
            <div>
              <p className="label-caps mb-2">Amount</p>
              <div className="flex">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  onFocus={() => {
                    if (recipient && recipientValid === null) checkRecipient();
                  }}
                  placeholder="0.00"
                  className="input-box flex-1 border-r-0"
                  step="0.01"
                  min="0"
                />
                <div className="px-6 py-4 border border-border bg-secondary text-muted-foreground font-medium">
                  SUI
                </div>
              </div>
              <p className="text-muted-foreground text-sm mt-2">Available: {balance.toFixed(2)} SUI</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <p className="font-medium">{error}</p>
              </div>
            )}
          </div>

          <button
            onClick={validate}
            disabled={!recipient || !amount}
            className="btn-primary mt-8"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default Send;
