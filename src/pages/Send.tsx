import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { Scan, Check, AlertTriangle, User, Building2, ChevronRight, ChevronDown, Wallet } from 'lucide-react';
import QRScanner from '@/components/QRScanner';

type SendStep = 'input' | 'scan-result' | 'review' | 'success';

type ScanResultType = 'paypath-user' | 'external-bank';

interface ScannedBank {
  bankName: string;
  accountNumber: string;
  beneficiaryName: string;
}

interface ScannedPayPathUser {
  username: string;
  avatar: string;
}

interface SourceAccount {
  id: string;
  type: 'wallet' | 'bank';
  name: string;
  detail: string;
}

const Send = () => {
  const navigate = useNavigate();
  const {
    sendSui,
    balance,
    isConnected,
    username,
    lookupBankAccount,
    lookupUsername,
    addContact,
    linkedWallets,
    linkedBanks,
    defaultAccountId,
    defaultAccountType,
  } = useWallet();

  const [step, setStep] = useState<SendStep>('input');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Scan result state
  const [scanResultType, setScanResultType] = useState<ScanResultType | null>(null);
  const [scannedUser, setScannedUser] = useState<ScannedPayPathUser | null>(null);
  const [scannedBank, setScannedBank] = useState<ScannedBank | null>(null);
  const [saveToContacts, setSaveToContacts] = useState(false);

  // Source account selection
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(defaultAccountId);
  const [selectedSourceType, setSelectedSourceType] = useState<'wallet' | 'bank'>(defaultAccountType);

  // Recipient validation state
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);
  const [recipientVerified, setRecipientVerified] = useState<boolean | null>(null);
  const [verifiedRecipient, setVerifiedRecipient] = useState<ScannedPayPathUser | null>(null);

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  // Build source accounts list
  const sourceAccounts: SourceAccount[] = [
    ...linkedWallets.map(w => ({
      id: w.id,
      type: 'wallet' as const,
      name: w.name,
      detail: w.address.length > 20 ? `${w.address.slice(0, 6)}...${w.address.slice(-4)}` : w.address,
    })),
    ...linkedBanks.map(b => ({
      id: b.id,
      type: 'bank' as const,
      name: b.bankName,
      detail: `****${b.accountNumber.slice(-4)}`,
    })),
  ];

  const selectedSource = sourceAccounts.find(
    s => s.id === selectedSourceId && s.type === selectedSourceType
  ) || sourceAccounts[0];

  const fee = 0.01;

  // Check if recipient username exists
  const checkRecipient = () => {
    if (!recipient || recipient.length < 2) return;

    setIsCheckingRecipient(true);
    setError('');

    // Simulate API call delay
    setTimeout(() => {
      const cleanUsername = recipient.replace('@', '');
      const user = lookupUsername(cleanUsername);

      if (user) {
        setRecipientVerified(true);
        setVerifiedRecipient({
          username: user.username,
          avatar: user.avatar || user.username.charAt(0).toUpperCase(),
        });
      } else {
        setRecipientVerified(false);
        setVerifiedRecipient(null);
      }
      setIsCheckingRecipient(false);
    }, 500);
  };

  const handleScanQR = () => {
    setShowScanner(true);
  };

  const handleQRScanned = (rawData: string) => {
    setShowScanner(false);
    console.log('QR Data received:', rawData);

    const isPayPathQR = Math.random() > 0.5;

    if (isPayPathQR) {
      const mockUsername = 'duy3000';
      const user = lookupUsername(mockUsername);

      setScannedUser({
        username: mockUsername,
        avatar: user?.avatar || mockUsername.charAt(0).toUpperCase(),
      });
      setScanResultType('paypath-user');
      setScannedBank(null);
      setStep('scan-result');
    } else {
      const mockBank: ScannedBank = {
        bankName: 'Sacombank',
        accountNumber: '5555666677778888',
        beneficiaryName: 'LE VAN C',
      };

      const registeredUser = lookupBankAccount(mockBank.accountNumber);

      if (registeredUser) {
        setScannedUser({
          username: registeredUser.username,
          avatar: registeredUser.avatar || registeredUser.username.charAt(0).toUpperCase(),
        });
        setScanResultType('paypath-user');
        setScannedBank(null);
      } else {
        setScannedBank(mockBank);
        setScanResultType('external-bank');
        setScannedUser(null);
      }
      setStep('scan-result');
    }
  };

  const proceedFromScanResult = () => {
    if (scanResultType === 'paypath-user' && scannedUser) {
      setRecipient(`@${scannedUser.username}`);
    } else if (scanResultType === 'external-bank' && scannedBank) {
      setRecipient(`Bank: ${scannedBank.beneficiaryName}`);
    }
    setStep('input');
  };

  const validateAndProceed = () => {
    const amountNum = parseFloat(amount);

    if (!recipient) {
      setError('Enter a recipient or scan a QR code');
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
    if (saveToContacts && scannedUser) {
      addContact(`@${scannedUser.username}`);
    }
    sendSui(recipient, parseFloat(amount));
    setStep('success');
  };

  const handleSelectSource = (account: SourceAccount) => {
    setSelectedSourceId(account.id);
    setSelectedSourceType(account.type);
    setShowSourcePicker(false);
  };

  // Scan Result Screen
  if (step === 'scan-result') {
    return (
      <div className="app-container">
        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-6 animate-fade-in">
            <h1 className="text-xl font-bold">QR Scanned</h1>
            <button
              onClick={() => setStep('input')}
              className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="flex-1 animate-slide-up">
            {scanResultType === 'paypath-user' && scannedUser && (
              <div className="card-container">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="badge-success mb-1">
                      <Check className="w-3.5 h-3.5" />
                      PayPath User
                    </div>
                    <p className="text-xl font-bold">@{scannedUser.username}</p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-secondary/50 rounded-xl">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">You send SUI</span> → System routes to recipient's preferred destination
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToContacts}
                      onChange={(e) => setSaveToContacts(e.target.checked)}
                      className="w-5 h-5 rounded border-border"
                    />
                    <span className="text-sm font-medium">Save to Contacts</span>
                  </label>
                </div>
              </div>
            )}

            {scanResultType === 'external-bank' && scannedBank && (
              <div className="card-container">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-14 h-14 rounded-full bg-warning/10 text-warning flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="badge-warning mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      External Transfer
                    </div>
                    <p className="text-lg font-semibold">{scannedBank.beneficiaryName}</p>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{scannedBank.bankName}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Account: </span>
                    <span className="font-mono">{scannedBank.accountNumber.slice(0, 4)}...{scannedBank.accountNumber.slice(-4)}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-warning/5 rounded-xl border border-warning/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-warning">Not on PayPath</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your SUI will be converted to VND and sent to their bank account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={proceedFromScanResult}
            className="btn-primary mt-6 flex items-center justify-center gap-2"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="app-container">
        <div className="page-wrapper justify-between">
          <div />

          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10" />
            </div>
            <p className="text-3xl font-bold mb-2">Sent!</p>
            <p className="text-muted-foreground">
              {amount} SUI to {recipient}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              From: {selectedSource?.name}
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
    const isExternalTransfer = scanResultType === 'external-bank';

    return (
      <div className="app-container">
        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-6 animate-fade-in">
            <h1 className="text-xl font-bold">Review</h1>
            <button
              onClick={() => setStep('input')}
              className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
            >
              Edit
            </button>
          </div>

          <div className="flex-1 animate-slide-up">
            <div className="card-container p-0 overflow-hidden">
              <div className="settings-row px-5">
                <span className="text-muted-foreground">From</span>
                <div className="flex items-center gap-2">
                  {selectedSource?.type === 'wallet' ? (
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold">{selectedSource?.name}</span>
                </div>
              </div>
              <div className="settings-row px-5">
                <span className="text-muted-foreground">To</span>
                <span className="font-semibold">{recipient}</span>
              </div>
              {isExternalTransfer && (
                <div className="settings-row px-5">
                  <span className="text-muted-foreground">Type</span>
                  <span className="badge-warning">
                    <AlertTriangle className="w-3 h-3" />
                    Off-ramp
                  </span>
                </div>
              )}
              <div className="settings-row px-5">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{amount} SUI</span>
              </div>
              <div className="settings-row px-5">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium">{fee} SUI</span>
              </div>
              <div className="px-5 py-4 bg-secondary flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{(parseFloat(amount) + fee).toFixed(2)} SUI</span>
              </div>
            </div>
          </div>

          <button onClick={handleConfirm} className="btn-primary mt-6 animate-slide-up">
            Confirm & Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScanned}
        title="Quét mã QR"
      />

      <div className="app-container">
        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-6 animate-fade-in">
            <h1 className="text-xl font-bold">Send SUI</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4 flex-1 animate-slide-up">
            {/* Source Account Selector */}
            <div className="relative">
              <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                Send From
              </label>
              <button
                onClick={() => setShowSourcePicker(!showSourcePicker)}
                className="w-full card-container flex items-center justify-between hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedSource?.type === 'wallet' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                    }`}>
                    {selectedSource?.type === 'wallet' ? (
                      <Wallet className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{selectedSource?.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{selectedSource?.detail}</p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showSourcePicker ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {showSourcePicker && (
                <div className="absolute top-full left-0 right-0 z-10 mt-2 card-container p-2 shadow-lg border border-border max-h-60 overflow-y-auto">
                  {sourceAccounts.map((account) => (
                    <button
                      key={`${account.type}-${account.id}`}
                      onClick={() => handleSelectSource(account)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors ${account.id === selectedSourceId && account.type === selectedSourceType ? 'bg-secondary' : ''
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${account.type === 'wallet' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                        }`}>
                        {account.type === 'wallet' ? (
                          <Wallet className="w-4 h-4" />
                        ) : (
                          <Building2 className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-sm">{account.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{account.detail}</p>
                      </div>
                      {account.id === selectedSourceId && account.type === selectedSourceType && (
                        <Check className="w-4 h-4 text-success" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scan QR Button */}
            <button
              onClick={handleScanQR}
              className="w-full card-container flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                  <Scan className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Scan QR Code</p>
                  <p className="text-xs text-muted-foreground">PayPath QR or VietQR</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase">or enter manually</span>
              <div className="flex-1 h-px bg-border" />
            </div>


            <div className="card-container space-y-4">
              <div>
                <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                  Recipient
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => {
                        setRecipient(e.target.value);
                        setRecipientVerified(null);
                        setVerifiedRecipient(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          checkRecipient();
                        }
                      }}
                      placeholder="@username"
                      className={`input-modern w-full pr-10 ${recipientVerified === true ? 'border-success' :
                        recipientVerified === false ? 'border-destructive' : ''
                        }`}
                    />
                    {/* Inline status icon */}
                    {recipientVerified === true && (
                      <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-success" />
                    )}
                    {recipientVerified === false && (
                      <AlertTriangle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={checkRecipient}
                    disabled={!recipient || recipient.length < 2 || isCheckingRecipient}
                    className="px-4 py-3.5 bg-secondary text-foreground font-medium rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCheckingRecipient ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      'Check'
                    )}
                  </button>
                </div>

                {/* Inline validation message */}
                {recipientVerified === true && verifiedRecipient && (
                  <p className="text-xs text-success mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Found: @{verifiedRecipient.username}
                  </p>
                )}
                {recipientVerified === false && (
                  <p className="text-xs text-destructive mt-1.5">
                    User not found. Please check the username.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                  Amount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError('');
                    }}
                    onFocus={() => {
                      if (recipient && recipient.length >= 2 && recipientVerified === null) {
                        checkRecipient();
                      }
                    }}
                    placeholder="0.00"
                    className="input-modern flex-1"
                    step="0.01"
                    min="0"
                  />
                  <div className="px-5 py-3.5 bg-secondary text-muted-foreground font-medium rounded-xl border border-border">
                    SUI
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Available: {balance.toFixed(2)} SUI
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-xl">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>

          <button
            onClick={validateAndProceed}
            className="btn-primary mt-6"
            disabled={!recipient || !amount}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default Send;
