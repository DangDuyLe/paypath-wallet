import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { Scan, Check, AlertTriangle, ChevronDown, Wallet, Building2, Loader2, Info } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import * as gaian from '@/services/gaian';

type SendStep = 'input' | 'review' | 'sending' | 'success' | 'error';
type ScanResult = 'none' | 'internal' | 'external' | 'error';
type RecipientType = 'none' | 'username' | 'address';

interface ExternalBankInfo {
  bankName: string;
  accountNumber: string;
  beneficiaryName: string;
  amount?: number;
}

const Send = () => {
  const navigate = useNavigate();
  const {
    sendUsdc,
    suiBalance,
    usdcBalance,
    isConnected,
    username,
    lookupUsername,
    linkedWallets,
    linkedBanks,
    defaultAccountId,
    defaultAccountType,
    isValidWalletAddress,
  } = useWallet();

  const [step, setStep] = useState<SendStep>('input');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // Recipient validation
  const [isChecking, setIsChecking] = useState(false);
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [recipientType, setRecipientType] = useState<RecipientType>('none');
  const [recipientDisplayName, setRecipientDisplayName] = useState<string | null>(null);

  // Source selection
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(defaultAccountId);
  const [selectedSourceType, setSelectedSourceType] = useState<'wallet' | 'bank'>(defaultAccountType);

  // QR Scan result
  const [scanResult, setScanResult] = useState<ScanResult>('none');
  const [isParsing, setIsParsing] = useState(false);
  const [externalBank, setExternalBank] = useState<ExternalBankInfo | null>(null);

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  const allSources = [
    ...linkedWallets.map(w => ({ id: w.id, type: 'wallet' as const, name: w.name, address: w.address })),
    ...linkedBanks.map(b => ({ id: b.id, type: 'bank' as const, name: b.bankName, address: null })),
  ];

  const selectedSource = allSources.find(s => s.id === selectedSourceId && s.type === selectedSourceType) || allSources[0];

  const fee = 0.001; // Gas fee in SUI

  // Check if input is @username or 0x... address
  const checkRecipient = () => {
    const input = recipient.trim();
    if (!input || input.length < 2) return;

    setIsChecking(true);
    setError('');

    setTimeout(() => {
      // Check if it's a wallet address (0x...)
      if (input.startsWith('0x')) {
        if (isValidWalletAddress(input)) {
          setRecipientValid(true);
          setRecipientAddress(input);
          setRecipientType('address');
          setRecipientDisplayName(input.slice(0, 8) + '...' + input.slice(-4));
        } else {
          setRecipientValid(false);
          setRecipientAddress(null);
          setRecipientType('none');
          setError('Invalid wallet address format');
        }
      }
      // Check if it's a username (@username or just username)
      else {
        const cleanUsername = input.replace('@', '').toLowerCase();
        const user = lookupUsername(cleanUsername);

        if (user && user.walletAddress) {
          setRecipientValid(true);
          setRecipientAddress(user.walletAddress);
          setRecipientType('username');
          setRecipientDisplayName(`@${user.username}`);
        } else if (user) {
          setRecipientValid(false);
          setRecipientAddress(null);
          setRecipientType('none');
          setError('User has no linked wallet');
        } else {
          setRecipientValid(false);
          setRecipientAddress(null);
          setRecipientType('none');
          setError('User not found');
        }
      }

      setIsChecking(false);
    }, 300);
  };

  const handleQRScanned = async (qrString: string) => {
    setShowScanner(false);
    setIsParsing(true);
    setError('');
    setScanResult('none');
    setExternalBank(null);

    try {
      // Check if it's a PayPath username QR
      if (gaian.isPayPathQr(qrString)) {
        const extractedUsername = gaian.extractPayPathUsername(qrString);
        const user = lookupUsername(extractedUsername);

        if (user && user.walletAddress) {
          setRecipient(`@${extractedUsername}`);
          setRecipientValid(true);
          setRecipientAddress(user.walletAddress);
          setRecipientType('username');
          setRecipientDisplayName(`@${user.username}`);
          setScanResult('internal');
        } else {
          setRecipient(`@${extractedUsername}`);
          setRecipientValid(false);
          setScanResult('error');
          setError(user ? 'User has no linked wallet' : `User @${extractedUsername} not found`);
        }
        setIsParsing(false);
        return;
      }

      // Check if it's a raw wallet address
      if (qrString.startsWith('0x') && isValidWalletAddress(qrString)) {
        setRecipient(qrString);
        setRecipientValid(true);
        setRecipientAddress(qrString);
        setRecipientType('address');
        setRecipientDisplayName(qrString.slice(0, 8) + '...' + qrString.slice(-4));
        setScanResult('internal');
        setIsParsing(false);
        return;
      }

      // Try parsing as bank QR (VietQR)
      const parsedBank = await gaian.parseQrString(qrString);

      if (parsedBank) {
        setExternalBank({
          bankName: parsedBank.bankName,
          accountNumber: parsedBank.accountNumber,
          beneficiaryName: parsedBank.beneficiaryName,
          amount: parsedBank.amount,
        });
        setRecipient(`${parsedBank.beneficiaryName}`);
        setRecipientDisplayName(`${parsedBank.beneficiaryName} (${parsedBank.bankName})`);
        setScanResult('external');

        if (parsedBank.amount) {
          setAmount(parsedBank.amount.toString());
        }
      } else {
        setScanResult('error');
        setError('Invalid QR Code');
      }
    } catch (err) {
      console.error('QR parsing error:', err);
      setScanResult('error');
      setError('Failed to parse QR code');
    } finally {
      setIsParsing(false);
    }
  };

  const validate = () => {
    const amountNum = parseFloat(amount);

    if (scanResult === 'external' && externalBank) {
      if (isNaN(amountNum) || amountNum <= 0) { setError('Invalid amount'); return; }
      if (amountNum > usdcBalance) { setError('Insufficient USDC balance'); return; }
      if (suiBalance < fee) { setError('Not enough SUI for gas fees'); return; }
      setStep('review');
      return;
    }

    if (!recipient) { setError('Enter recipient'); return; }
    if (!recipientValid || !recipientAddress) { setError('Verify recipient first'); return; }
    if (isNaN(amountNum) || amountNum <= 0) { setError('Invalid amount'); return; }
    if (amountNum > usdcBalance) { setError('Insufficient USDC balance'); return; }
    if (suiBalance < fee) { setError('Not enough SUI for gas fees'); return; }
    setStep('review');
  };

  const handleConfirm = async () => {
    if (!recipientAddress && scanResult !== 'external') {
      setError('No recipient address');
      return;
    }

    setStep('sending');

    try {
      const toAddress = recipientAddress || '0x0000000000000000000000000000000000000000000000000000000000000000';
      const success = await sendUsdc(toAddress, parseFloat(amount));

      if (success) {
        setStep('success');
      } else {
        setError('Transaction failed');
        setStep('error');
      }
    } catch (err) {
      console.error('Send error:', err);
      setError('Transaction failed');
      setStep('error');
    }
  };

  const clearRecipient = () => {
    setScanResult('none');
    setExternalBank(null);
    setRecipient('');
    setRecipientValid(null);
    setRecipientAddress(null);
    setRecipientType('none');
    setRecipientDisplayName(null);
    setError('');
  };

  // Sending state
  if (step === 'sending') {
    return (
      <div className="app-container">
        <div className="page-wrapper justify-center items-center text-center">
          <div className="animate-fade-in">
            <Loader2 className="w-16 h-16 mx-auto mb-6 animate-spin text-muted-foreground" />
            <p className="text-xl font-bold mb-2">Sending...</p>
            <p className="text-muted-foreground">{amount} USDC</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="app-container">
        <div className="page-wrapper justify-center items-center text-center">
          <div className="animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-destructive/10">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <p className="display-medium mb-4">Failed</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <button onClick={() => setStep('input')} className="btn-primary mt-12 animate-slide-up">
            Try Again
          </button>
        </div>
      </div>
    );
  }

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
            <p className="text-2xl font-bold">{amount} USDC</p>
            <p className="text-muted-foreground mt-2">to {recipientDisplayName || recipient}</p>
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
    const isExternal = scanResult === 'external' && externalBank;

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
                <span className="font-medium">{recipientDisplayName || recipient}</span>
              </div>
              {recipientType === 'address' && (
                <div className="row-item px-4">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-mono text-sm">{recipientAddress?.slice(0, 10)}...{recipientAddress?.slice(-6)}</span>
                </div>
              )}
              {isExternal && externalBank && (
                <>
                  <div className="row-item px-4">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium">{externalBank.bankName}</span>
                  </div>
                  <div className="row-item px-4">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-mono">{externalBank.accountNumber}</span>
                  </div>
                  <div className="row-item px-4 bg-warning/10">
                    <span className="text-warning font-medium">Type</span>
                    <span className="text-warning font-medium">Off-ramp (USDC → VND)</span>
                  </div>
                </>
              )}
              <div className="row-item px-4">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} USDC</span>
              </div>
              <div className="row-item px-4">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Service Fee (0.2%)</span>
                  <div className="relative group">
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Platform processing fee
                    </div>
                  </div>
                </div>
                <span className="font-medium">{(parseFloat(amount) * 0.002).toFixed(4)} USDC</span>
              </div>
              <div className="row-item px-4">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium">~{fee} SUI</span>
              </div>
              <div className="row-item px-4 bg-secondary">
                <span className="font-bold">Total to Pay</span>
                <div className="text-right">
                  <p className="font-bold">{(parseFloat(amount) + parseFloat(amount) * 0.002).toFixed(2)} USDC</p>
                  <p className="text-xs text-muted-foreground">+ ~{fee} SUI gas</p>
                </div>
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
            <h1 className="text-xl font-bold">Send USDC</h1>
            <button onClick={() => navigate('/dashboard')} className="btn-ghost">Cancel</button>
          </div>

          <div className="flex-1 space-y-6 animate-slide-up">
            {/* Balance Info */}
            <div className="border border-border p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">USDC Balance</span>
                <span className="font-bold">{usdcBalance.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">SUI (for gas)</span>
                <span className="text-sm text-muted-foreground">{suiBalance.toFixed(4)} SUI</span>
              </div>
            </div>

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

            {/* Scan QR */}
            <button
              onClick={() => setShowScanner(true)}
              disabled={isParsing}
              className="w-full py-4 border border-border text-center font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Parsing QR...
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5" />
                  Scan QR Code
                </>
              )}
            </button>

            {/* External Bank Result */}
            {scanResult === 'external' && externalBank && (
              <div className="border border-border animate-slide-up">
                <div className="row-item px-4 bg-warning/10">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-warning" />
                    <span className="text-warning font-medium">External Transfer</span>
                  </div>
                  <button onClick={clearRecipient} className="text-sm text-muted-foreground hover:text-foreground">
                    Clear
                  </button>
                </div>
                <div className="row-item px-4">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">{externalBank.bankName}</span>
                </div>
                <div className="row-item px-4">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-mono">{externalBank.accountNumber}</span>
                </div>
                <div className="row-item px-4">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{externalBank.beneficiaryName}</span>
                </div>
              </div>
            )}

            {/* Validated Recipient Result */}
            {scanResult !== 'external' && recipientValid && recipientAddress && (
              <div className="border border-success animate-slide-up">
                <div className="row-item px-4 bg-success/10">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-success font-medium">
                      {recipientType === 'username' ? 'HiddenPay User' : 'Valid Address'}
                    </span>
                  </div>
                  <button onClick={clearRecipient} className="text-sm text-muted-foreground hover:text-foreground">
                    Clear
                  </button>
                </div>
                <div className="row-item px-4">
                  <span className="text-muted-foreground">
                    {recipientType === 'username' ? 'Username' : 'Address'}
                  </span>
                  <span className="font-medium">{recipientDisplayName}</span>
                </div>
                {recipientType === 'username' && recipientAddress && (
                  <div className="row-item px-4">
                    <span className="text-muted-foreground">Wallet</span>
                    <span className="font-mono text-sm">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-6)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Manual Recipient Input */}
            {scanResult !== 'external' && !recipientValid && (
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
                        setRecipientAddress(null);
                        setRecipientType('none');
                        setRecipientDisplayName(null);
                        setError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && checkRecipient()}
                      placeholder="@username or 0x... address"
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
                <p className="text-sm text-muted-foreground mt-2">
                  Enter a @username or wallet address (0x...)
                </p>
                {recipientValid === false && error && (
                  <p className="text-destructive text-sm mt-2">{error}</p>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <p className="label-caps mb-2">Amount</p>
              <div className="flex">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(''); }}
                  placeholder="0.00"
                  className="input-box flex-1 border-r-0"
                  step="0.01"
                  min="0"
                />
                <div className="px-6 py-4 border border-border bg-secondary text-muted-foreground font-medium">
                  USDC
                </div>
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                Available: {usdcBalance.toFixed(2)} USDC
              </p>
            </div>

            {/* Error */}
            {error && scanResult !== 'none' && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <p className="font-medium">{error}</p>
              </div>
            )}
          </div>

          <button
            onClick={validate}
            disabled={scanResult === 'external' ? !amount : (!recipientValid || !amount)}
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
