import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { Scan, Check, AlertTriangle, ChevronDown, Wallet, Building2, Loader2, X, User, AlertCircle, CreditCard, Copy } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { createPaymentOrder, confirmPaymentOrder, getPaymentOrder, syncPaymentOrder, lookupUser, scanQr } from '@/services/api';

type SendStep = 'input' | 'review' | 'sending' | 'success' | 'error';
type ScanResult = 'none' | 'internal' | 'external' | 'error';
type RecipientType = 'none' | 'username' | 'address';

interface ExternalBankInfo {
  bankName: string;
  accountNumber: string;
  beneficiaryName: string;
  amount?: number;
  memo?: string;
  isLinkedToHiddenWallet: boolean;
  linkedUsername?: string;
}

const Send = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAuthLoading, user } = useAuth();
  const {
    sendUsdc,
    suiBalance,
    usdcBalance,
    isConnected,
    username,
    lookupUsername,
    lookupBankAccount,
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
  const [isAutoScan, setIsAutoScan] = useState(false);

  // Auto-open scanner if navigated from mobile nav
  useEffect(() => {
    if (location.state?.autoScan) {
      setShowScanner(true);
      setIsAutoScan(true);
      // Clear state so it doesn't reopen on refresh/back
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [isChecking, setIsChecking] = useState(false);
  const [recipientValid, setRecipientValid] = useState<boolean | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [recipientType, setRecipientType] = useState<RecipientType>('none');
  const [recipientDisplayName, setRecipientDisplayName] = useState<string | null>(null);

  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(defaultAccountId);
  const [selectedSourceType, setSelectedSourceType] = useState<'wallet' | 'bank'>(defaultAccountType);

  const [scanResult, setScanResult] = useState<ScanResult>('none');
  const [isParsing, setIsParsing] = useState(false);
  const [externalBank, setExternalBank] = useState<ExternalBankInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [scannedQrString, setScannedQrString] = useState<string | null>(null);
  // For username recipients with offchain default wallet
  const [recipientOffchainQr, setRecipientOffchainQr] = useState<string | null>(null);
  // For showing VND equivalent on success screen
  const [fiatPayoutAmount, setFiatPayoutAmount] = useState<{ amount: number; currency: string } | null>(null);
  const [offrampQuote, setOfframpQuote] = useState<{
    exchangeInfo: { feeAmount: number };
    platformFee?: { feePercent: string; feeRate: number; feeAmount: number; baseFiatAmount: number; finalFiatAmount: number; cryptoEquivalent?: number | null };
    paymentInstruction: { totalCrypto: string };
  } | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  const apiUsername = (() => {
    const u = user as { username?: unknown } | null;
    return typeof u?.username === 'string' ? u.username : null;
  })();

  if (isAuthLoading) {
    return (
      <div className="app-container">
        <div className="page-wrapper">
          <div className="card-modern py-8 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="app-container">
        <div className="page-wrapper">
          <div className="card-modern py-8 text-center text-muted-foreground text-sm">
            Wallet not connected.
          </div>
        </div>
      </div>
    );
  }

  if (!apiUsername && !username) {
    return (
      <div className="app-container">
        <div className="page-wrapper">
          <div className="card-modern py-8 text-center text-muted-foreground text-sm">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  const allSources = [
    ...linkedWallets.map(w => ({ id: w.id, type: 'wallet' as const, name: w.name, address: w.address })),
    ...linkedBanks.map(b => ({ id: b.id, type: 'bank' as const, name: b.bankName, address: null })),
  ];

  const selectedSource = allSources.find(s => s.id === selectedSourceId && s.type === selectedSourceType) || allSources[0];
  const networkFeeSui = 0.005;
  const minGasBalanceSui = 0.001;

  const handleSelectSource = (source: typeof allSources[0]) => {
    setSelectedSourceId(source.id);
    setSelectedSourceType(source.type);
    setShowSourceMenu(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const checkRecipient = async () => {
    const input = recipient.trim();
    if (!input || input.length < 2) return;

    setIsChecking(true);
    setError('');
    setRecipientOffchainQr(null);

    try {
      // Direct wallet address
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
        setIsChecking(false);
        return;
      }

      // Username lookup via API
      const cleanUsername = input.replace('@', '').toLowerCase();

      try {
        const response = await lookupUser(cleanUsername);
        const userData = response.data;

        if (!userData.defaultWallet) {
          setRecipientValid(false);
          setRecipientAddress(null);
          setRecipientType('none');
          setError('User has no linked wallet');
          setIsChecking(false);
          return;
        }

        setRecipientValid(true);
        setRecipientType('username');
        setRecipientDisplayName(`@${userData.username}`);

        // Check if default is onchain or offchain
        if (userData.defaultWallet.type === 'onchain') {
          // Onchain - direct transfer
          setRecipientAddress(userData.defaultWallet.address);
          setRecipientOffchainQr(null);
        } else {
          // Offchain - need to use payment API
          setRecipientAddress(userData.walletAddress); // User's main wallet for reference
          setRecipientOffchainQr(userData.defaultWallet.qrString);
          // Set external bank info for display
          setExternalBank({
            bankName: userData.defaultWallet.bankName,
            accountNumber: userData.defaultWallet.accountNumber,
            beneficiaryName: userData.defaultWallet.accountName,
            isLinkedToHiddenWallet: true,
            linkedUsername: userData.username,
          });
          setScanResult('external'); // Trigger offchain flow
        }
      } catch (err) {
        setRecipientValid(false);
        setRecipientAddress(null);
        setRecipientType('none');
        setError('User not found');
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Types for Scan QR Response
  type ScanQrResponse = {
    type: 'username' | 'onchain' | 'offchain';
    address?: string;
    user?: {
      username: string;
      displayName?: string;
      defaultWallet?: {
        type: 'onchain' | 'offchain';
        address?: string; // for onchain
        bankName?: string; // for offchain
        accountNumber?: string;
      };
    };
    bankInfo?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      amount?: number;
      bankBin?: string;
    };
  };

  const handleQRScanned = async (qrString: string) => {
    if (!qrString) return;

    // Close scanner if open (assuming it was open if this is called)
    setShowScanner(false);

    // Reset states
    setRecipient('');
    setRecipientValid(false);
    setRecipientType('address');
    setRecipientDisplayName('');
    setExternalBank(null);
    setScanResult('none');
    setError('');
    setAmount('');
    setScannedQrString(null);

    // Now start parsing
    setIsParsing(true);

    try {
      const resp = await scanQr(qrString);
      const data = resp.data as ScanQrResponse;

      // 1. Username QR
      if (data.type === 'username') {
        const u = data.user;
        const displayName = u.displayName || u.username;
        setRecipient(`@${u.username}`);
        setRecipientValid(true);
        setRecipientDisplayName(displayName);
        setRecipientType('username');
        setScanResult('internal');

        if (u.defaultWallet?.type === 'onchain') {
          setRecipientAddress(u.defaultWallet.address);
        } else if (u.defaultWallet?.type === 'offchain') {
          // If default is offchain, we might need to handle it or just set address null?
          // For now, if username default is offchain, we treat it as internal valid
          setRecipientOffchainQr(null); // Or should we construct one?
          // Actually checkRecipient handles this via lookupUser.
          // Since we have the data, we can set it.
          // But 'sendUsdc' needs address.
          // For now let's rely on 'checkRecipient' logic flow or reusing it.
          // But here we set states directly.
          if (u.defaultWallet.type === 'offchain') {
            // We don't have the QR string for their bank, but we have bank info.
            // In this flow, we might need to call createPaymentOrder with username?
            // BE scanQr returns bankInfo? No, for username type it returns user obj.
          }
        }

        // Let checkRecipient handle details if needed, but we set Valid=true
        // Actually, scanQr returns everything we need.
        setIsParsing(false);
        return;
      }

      // 2. Onchain Address QR
      if (data.type === 'onchain') {
        const address = data.address;
        setRecipient(address);
        setRecipientValid(true);
        setRecipientAddress(address);
        setRecipientType('address');
        setRecipientDisplayName(address.slice(0, 8) + '...' + address.slice(-4));
        setScanResult('internal');

        if (data.user) {
          setRecipient(`@${data.user.username}`);
          setRecipientDisplayName(`@${data.user.username}`);
        }
        setIsParsing(false);
        return;
      }

      // 3. Offchain Bank QR
      if (data.type === 'offchain' && data.bankInfo) {
        setScannedQrString(qrString);
        const bank = data.bankInfo;

        setExternalBank({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          beneficiaryName: bank.accountName, // bankInfo uses accountName
          amount: bank.amount,
          isLinkedToHiddenWallet: !!data.user,
          linkedUsername: data.user?.username,
        });

        setRecipient(`${bank.accountName}`);
        setRecipientDisplayName(`${bank.accountName} (${bank.bankName})`);
        setScanResult('external');

        if (data.user && data.user.defaultWallet?.type === 'onchain') {
          setRecipientValid(true);
          setRecipientAddress(data.user.defaultWallet.address);
          setRecipientType('username');
        }

        if (bank.amount) {
          setAmount(bank.amount.toString());
        }
      } else {
        setScanResult('error');
        setError('Invalid QR Code');
      }
    } catch (err) {
      console.error('QR parsing error:', err);
      setScanResult('error');
      setError('Invalid QR Code');
    } finally {
      setIsParsing(false);
    }
  };

  const validate = async () => {
    const amountNum = parseFloat(amount);
    const qrStringToUse = scannedQrString || recipientOffchainQr;

    if ((scanResult === 'external' && externalBank) || qrStringToUse) {
      if (isNaN(amountNum) || amountNum <= 0) { setError('Invalid amount'); return; }
      if (amountNum > usdcBalance) { setError('Insufficient balance'); return; }
      if (suiBalance < minGasBalanceSui) { setError('Not enough SUI for gas fees'); return; }

      // Get quote from BE to show VND equivalent
      try {
        const payerAddress = (user as { walletAddress?: string })?.walletAddress || linkedWallets[0]?.address;
        if (!payerAddress || !qrStringToUse) {
          setError('Missing wallet or QR info');
          return;
        }

        const orderRes = await createPaymentOrder({
          qrString: qrStringToUse,
          usdcAmount: amountNum,
          payerWalletAddress: payerAddress,
        });

        const { paymentInstruction, payout, exchangeInfo, platformFee } = orderRes.data;
        setFiatPayoutAmount({ amount: paymentInstruction.totalPayout, currency: payout.fiatCurrency });
        setOfframpQuote({ exchangeInfo: { feeAmount: Number(exchangeInfo.feeAmount) }, platformFee, paymentInstruction: { totalCrypto: paymentInstruction.totalCrypto } });
      } catch (err) {
        console.error('Failed to get quote:', err);
        setError('Failed to get exchange rate');
        return;
      }

      setStep('review');
      return;
    }

    if (!recipient) { setError('Enter recipient'); return; }
    if (!recipientValid || !recipientAddress) { setError('Verify recipient first'); return; }
    if (isNaN(amountNum) || amountNum <= 0) { setError('Invalid amount'); return; }
    if (amountNum > usdcBalance) { setError('Insufficient USDC balance'); return; }
    if (suiBalance < minGasBalanceSui) { setError('Not enough SUI for gas fees'); return; }
    setStep('review');
  };

  const handleConfirm = async () => {
    setStep('sending');

    try {
      // Get the qrString from either scanned QR or username lookup
      const qrStringToUse = scannedQrString || recipientOffchainQr;

      // BANK TRANSFER (Offchain) - Route through Payment API
      // This handles both: 1) Scanned bank QR, 2) Username with offchain default
      if (scanResult === 'external' && externalBank && qrStringToUse) {
        // Get payer wallet address
        const payerAddress = (user as { walletAddress?: string })?.walletAddress || linkedWallets[0]?.address;

        if (!payerAddress) {
          throw new Error('No payer wallet address found');
        }

        // 1. Create payment order with qrString and USDC amount
        const orderRes = await createPaymentOrder({
          qrString: qrStringToUse,
          usdcAmount: parseFloat(amount), // User enters USDC amount
          payerWalletAddress: payerAddress,
        });

        const { id: orderId, paymentInstruction, payout, exchangeInfo, platformFee } = orderRes.data;
        const { toAddress, totalCrypto, totalPayout } = paymentInstruction;

        // Store fiat payout info for success screen
        setFiatPayoutAmount({ amount: totalPayout, currency: payout.fiatCurrency });
        setOfframpQuote({ exchangeInfo: { feeAmount: Number(exchangeInfo.feeAmount) }, platformFee, paymentInstruction: { totalCrypto: paymentInstruction.totalCrypto } });

        // 2. Send USDC to partner wallet (on-chain)
        const result = await sendUsdc(toAddress, parseFloat(totalCrypto));

        if (!result.success || !result.digest) {
          throw new Error('On-chain transfer failed');
        }

        // 3. Confirm payment with transaction digest
        try {
          console.log('Confirming payment order:', { orderId, digest: result.digest });
          await confirmPaymentOrder(orderId, result.digest);
        } catch (confirmError) {
          console.error('Failed to confirm payment order:', confirmError);
          // Transaction succeeded but confirmation failed
          // User still gets their money, just backend tracking failed
          setError('Transaction succeeded but confirmation failed. Please contact support with transaction: ' + result.digest);
          setStep('error');
          return;
        }

        setStep('success');
        return;
      }

      // WALLET/USERNAME TRANSFER (Onchain) - Direct transfer
      if (!recipientAddress) {
        setError('No recipient address');
        setStep('error');
        return;
      }

      const result = await sendUsdc(recipientAddress, parseFloat(amount));

      if (result.success) {
        setStep('success');
      } else {
        setError('Transaction failed');
        setStep('error');
      }
    } catch (err) {
      console.error('Send error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
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
    setScannedQrString(null);
    setRecipientOffchainQr(null);
    setError('');
  };

  // Sending state
  if (step === 'sending') {
    return (
      <div className="app-container">
        <div className="page-wrapper justify-center items-center text-center">
          <div className="animate-fade-in">
            <Loader2 className="w-12 h-12 mx-auto mb-6 animate-spin text-muted-foreground" />
            <p className="text-xl font-bold mb-2">Sending...</p>
            <p className="text-muted-foreground">${amount}</p>
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
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-destructive/10 rounded-full">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-xl font-bold mb-2">Failed</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
          <button onClick={() => setStep('input')} className="btn-primary mt-8 animate-slide-up">
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
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-success/10 rounded-full">
              <Check className="w-8 h-8 text-success" />
            </div>
            <p className="text-xl font-bold mb-2">Sent!</p>
            <p className="text-2xl font-bold">{amount} USDC</p>
            {fiatPayoutAmount && (
              <p className="text-success font-medium mt-1">
                ≈ {fiatPayoutAmount.amount.toLocaleString()} {fiatPayoutAmount.currency}
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-sm">to {recipientDisplayName || recipient}</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-8 animate-slide-up">
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
          <div className="flex justify-between items-center mb-6 animate-fade-in">
            <h1 className="text-xl font-bold">Review</h1>
            <button onClick={() => setStep('input')} className="btn-ghost">Edit</button>
          </div>

          <div className="flex-1 animate-slide-up">
            <div className="card-modern divide-y divide-border">
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground text-sm">From</span>
                <div className="flex items-center gap-2">
                  {selectedSource?.type === 'wallet' ? <Wallet className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                  <span className="font-medium text-sm">{selectedSource?.name}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground text-sm">To</span>
                <span className="font-medium text-sm">{recipientDisplayName || recipient}</span>
              </div>
              {isExternal && externalBank && (
                <>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-muted-foreground text-sm">Bank</span>
                    <span className="font-medium text-sm">{externalBank.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-warning/10 -mx-4 px-4 rounded-xl">
                    <span className="text-warning text-sm font-medium">Type</span>
                    <span className="text-warning text-sm font-medium">Off-ramp</span>
                  </div>
                  {fiatPayoutAmount && (
                    <div className="flex justify-between items-center py-3 bg-success/10 -mx-4 px-4 rounded-xl">
                      <span className="text-success text-sm font-medium">Recipient gets</span>
                      <span className="text-success text-sm font-bold">
                        ≈ {fiatPayoutAmount.amount.toLocaleString()} {fiatPayoutAmount.currency}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground text-sm">Amount</span>
                <span className="font-medium">${amount}</span>
              </div>
              {isExternal && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-muted-foreground text-sm">Fee</span>
                  <span className="text-sm">
                    {offrampQuote?.platformFee?.cryptoEquivalent != null
                      ? `${Number(offrampQuote.platformFee.cryptoEquivalent).toFixed(4)} USDC`
                      : '-'
                    }
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground text-sm">Network Fee</span>
                <span className="text-sm">~{networkFeeSui.toFixed(3)} SUI</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-secondary -mx-4 px-4 rounded-xl">
                <span className="font-semibold text-sm">Total</span>
                <span className="font-bold">${parseFloat(amount).toFixed(3)}</span>
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

  // Input
  return (
    <>
      <QRScanner
        isOpen={showScanner}
        onClose={() => {
          setShowScanner(false);
          if (isAutoScan) {
            navigate('/dashboard');
          }
        }}
        onScan={handleQRScanned}
        title="Scan QR"
      />

      <div className="app-container">
        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-6 animate-fade-in">
            <h1 className="text-xl font-bold">Send</h1>
            <button onClick={() => navigate('/dashboard')} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 animate-slide-up">


            {/* Scan QR Button */}
            {/* Scan QR Button - Redesigned */}
            <button
              onClick={() => setShowScanner(true)}
              disabled={isParsing}
              className="w-full h-32 border-2 border-dashed border-input rounded-xl hover:border-primary hover:bg-secondary/30 transition-all flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
            >
              {/* Corner Accents (The "Khung") */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-muted-foreground/30 group-hover:border-primary transition-colors rounded-tl-md" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-muted-foreground/30 group-hover:border-primary transition-colors rounded-tr-md" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-muted-foreground/30 group-hover:border-primary transition-colors rounded-bl-md" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-muted-foreground/30 group-hover:border-primary transition-colors rounded-br-md" />

              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform z-10">
                {isParsing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <Scan className="w-6 h-6 text-foreground" />
                )}
              </div>
              <p className="font-medium text-muted-foreground group-hover:text-foreground transition-colors z-10">
                {isParsing ? 'Processing QR...' : 'Scan QR Code to Pay'}
              </p>
            </button>

            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <div className="flex-1 h-px bg-border" />
              <span>or enter manually</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* External Bank Details Card */}
            {scanResult === 'external' && externalBank && (
              <div className="card-modern space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold">Bank Transfer Details</span>
                  </div>
                  <button onClick={clearRecipient} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Outside Transfer Warning */}
                {!externalBank.isLinkedToHiddenWallet && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-amber-500 font-medium">Outside Transfer - Not a HiddenWallet user</span>
                  </div>
                )}

                {externalBank.isLinkedToHiddenWallet && externalBank.linkedUsername && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/30 rounded-xl">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="text-sm text-success font-medium">HiddenWallet User: @{externalBank.linkedUsername}</span>
                  </div>
                )}

                {/* Bank Name */}
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Bank</span>
                  <span className="font-medium text-sm">{externalBank.bankName}</span>
                </div>

                {/* Account Number */}
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Account No.</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm font-mono">{externalBank.accountNumber}</span>
                    <button
                      onClick={() => copyToClipboard(externalBank.accountNumber, 'account')}
                      className="p-1 hover:bg-secondary rounded transition-colors"
                    >
                      {copiedField === 'account' ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Beneficiary Name */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Recipient</span>
                  <span className="font-medium text-sm">{externalBank.beneficiaryName}</span>
                </div>
              </div>
            )}

            {/* Recipient Input - Only show if not external bank */}
            {scanResult !== 'external' && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Recipient</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => {
                        setRecipient(e.target.value);
                        setRecipientValid(null);
                        setError('');
                      }}
                      onBlur={checkRecipient}
                      placeholder="@username or 0x..."
                      className="input-modern pl-10"
                    />
                  </div>
                  {recipientValid === true && (
                    <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-success" />
                    </div>
                  )}
                </div>
                {recipientDisplayName && recipientValid && (
                  <p className="text-sm text-success mt-2">Found: {recipientDisplayName}</p>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <span className="text-sm text-muted-foreground">Balance: ${usdcBalance.toFixed(2)}</span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Prevent negative values
                  if (value === '' || parseFloat(value) >= 0) {
                    setAmount(value);
                  }
                  setError('');
                }}
                step="0.001"
                min="0"
                placeholder="0.00"
                className="input-modern text-xl font-semibold"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-destructive text-sm text-center bg-destructive/10 py-2 rounded-xl">{error}</p>
            )}
          </div>

          <button
            onClick={validate}
            disabled={(!recipient && scanResult !== 'external') || !amount}
            className="btn-primary mt-6"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default Send;
