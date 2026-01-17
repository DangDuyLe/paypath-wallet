import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { Wallet, Building2, Scan, Check, Trash2, Star, Shield, LogOut, Loader2, AlertTriangle, ChevronLeft } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { useDisconnectWallet } from '@mysten/dapp-kit';
import * as gaian from '@/services/gaian';

interface ScannedBankData {
  bankName: string;
  accountNumber: string;
  beneficiaryName: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { mutate: disconnectSuiWallet } = useDisconnectWallet();
  const {
    username,
    disconnect,
    isConnected,
    linkedBanks,
    linkedWallets,
    defaultAccountId,
    defaultAccountType,
    addBankAccount,
    removeBankAccount,
    addLinkedWallet,
    removeLinkedWallet,
    setDefaultAccount,
  } = useWallet();

  const [view, setView] = useState<'main' | 'add-wallet' | 'add-bank'>('main');
  const [showScanner, setShowScanner] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [scannedBank, setScannedBank] = useState<ScannedBankData | null>(null);

  // API parsing state
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  const handleDisconnect = () => {
    disconnectSuiWallet();
    disconnect();
    navigate('/login');
  };

  const handleAddWallet = () => {
    if (newWalletName && newWalletAddress) {
      addLinkedWallet({ name: newWalletName, address: newWalletAddress });
      setNewWalletName('');
      setNewWalletAddress('');
      setView('main');
    }
  };

  // Handle bank QR scan with Gaian API
  const handleScanBank = async (qrString: string) => {
    setShowScanner(false);
    setIsParsing(true);
    setParseError('');
    setScannedBank(null);

    try {
      const parsedBank = await gaian.parseQrString(qrString);

      if (parsedBank) {
        setScannedBank({
          bankName: parsedBank.bankName,
          accountNumber: parsedBank.accountNumber,
          beneficiaryName: parsedBank.beneficiaryName,
        });
      } else {
        setParseError('Invalid QR Code. Please scan a valid bank QR.');
      }
    } catch (error) {
      console.error('Bank QR parsing error:', error);
      setParseError('Failed to parse QR code');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddBank = () => {
    if (scannedBank) {
      addBankAccount(scannedBank);
      setScannedBank(null);
      setParseError('');
      setView('main');
    }
  };

  const isDefault = (id: string, type: 'wallet' | 'bank') =>
    defaultAccountId === id && defaultAccountType === type;

  // Handle wallet QR scan - reject bank QRs, only accept wallet addresses
  const handleScanWallet = async (qrString: string) => {
    setShowScanner(false);
    setIsParsing(true);
    setParseError('');

    try {
      // Check if it's a HiddenPay QR (username)
      if (gaian.isHiddenPayQr(qrString)) {
        setParseError('This is a HiddenPay username QR. Please scan a wallet address QR.');
        setIsParsing(false);
        return;
      }

      // Check if it's a valid wallet address (0x + 64 hex chars)
      if (qrString.startsWith('0x') && /^0x[a-fA-F0-9]{64}$/.test(qrString)) {
        setNewWalletAddress(qrString);
        setIsParsing(false);
        return;
      }

      // Try to parse as bank QR
      const parsedBank = await gaian.parseQrString(qrString);
      if (parsedBank) {
        setParseError('This is a Bank QR code. Please scan a wallet address QR instead.');
        setIsParsing(false);
        return;
      }

      // Unknown QR format
      setParseError('Invalid QR. Please scan a valid Sui wallet address (0x...).');
    } catch (error) {
      console.error('Wallet QR parsing error:', error);
      setParseError('Failed to parse QR code. Please enter address manually.');
    } finally {
      setIsParsing(false);
    }
  };

  // Add Wallet View
  if (view === 'add-wallet') {
    return (
      <>
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanWallet}
          title="Scan Wallet QR"
        />
        <div className="app-container">
          <div className="page-wrapper">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 animate-fade-in">
              <h1 className="text-xl font-bold">Add Wallet</h1>
              <button
                onClick={() => { setView('main'); setParseError(''); setNewWalletAddress(''); setNewWalletName(''); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 space-y-4 animate-slide-up">
              {/* Scan QR Button */}
              <button
                onClick={() => setShowScanner(true)}
                disabled={isParsing}
                className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary/80 text-center font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    Scan Wallet QR Code
                  </>
                )}
              </button>

              {/* Parse Error */}
              {parseError && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium text-sm">{parseError}</p>
                </div>
              )}

              {/* Or Divider */}
              <div className="flex items-center gap-3 text-muted-foreground text-sm py-2">
                <div className="flex-1 h-px bg-border" />
                <span>or enter manually</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Input Card */}
              <div className="rounded-xl border border-border p-4 space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Wallet Name</label>
                  <input
                    type="text"
                    value={newWalletName}
                    onChange={(e) => setNewWalletName(e.target.value)}
                    placeholder="e.g. Trading Wallet"
                    className="input-modern w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Wallet Address</label>
                  <input
                    type="text"
                    value={newWalletAddress}
                    onChange={(e) => { setNewWalletAddress(e.target.value); setParseError(''); }}
                    placeholder="0x..."
                    className="input-modern w-full font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleAddWallet}
              disabled={!newWalletName || !newWalletAddress}
              className="btn-primary mt-6"
            >
              Add Wallet
            </button>
          </div>
        </div>
      </>
    );
  }

  // Add Bank View
  if (view === 'add-bank') {
    return (
      <>
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanBank}
          title="Scan Bank QR"
        />
        <div className="app-container">
          <div className="page-wrapper">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 animate-fade-in">
              <h1 className="text-xl font-bold">Add Bank Account</h1>
              <button
                onClick={() => { setView('main'); setScannedBank(null); setParseError(''); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 space-y-4 animate-slide-up">
              {/* Scan QR Button */}
              <button
                onClick={() => setShowScanner(true)}
                disabled={isParsing}
                className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary/80 text-center font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Parsing QR...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    Scan Bank QR Code
                  </>
                )}
              </button>

              {/* Parse Error */}
              {parseError && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium text-sm">{parseError}</p>
                </div>
              )}

              {/* Scanned Bank Info */}
              {scannedBank && (
                <div className="rounded-xl border border-border overflow-hidden animate-slide-up">
                  {/* Success Header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-success/10">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-success font-medium text-sm">QR Parsed Successfully</span>
                  </div>

                  {/* Bank Details */}
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Bank</span>
                      <span className="font-medium">{scannedBank.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Account</span>
                      <span className="font-mono text-sm">{scannedBank.accountNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Name</span>
                      <span className="font-medium">{scannedBank.beneficiaryName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!scannedBank && !parseError && (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Scan your bank's QR code to link it</p>
                </div>
              )}
            </div>

            <button
              onClick={handleAddBank}
              disabled={!scannedBank}
              className="btn-primary mt-6"
            >
              Link Bank Account
            </button>
          </div>
        </div>
      </>
    );
  }

  // Main Settings View
  return (
    <div className="app-container">
      <div className="page-wrapper">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6 animate-fade-in">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        {/* Profile */}
        <div className="pb-6 border-b border-border mb-6 animate-slide-up">
          <p className="label-caps mb-2">Username</p>
          <p className="display-medium">@{username}</p>
        </div>

        {/* Wallets */}
        <div className="mb-6 animate-slide-up stagger-1">
          <p className="section-title">Sui Wallets</p>
          <div className="rounded-xl border border-border overflow-hidden">
            {linkedWallets.map((wallet) => (
              <div key={wallet.id} className="row-item px-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5" />
                  <div>
                    <p className="font-medium">{wallet.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDefault(wallet.id, 'wallet') ? (
                    <span className="tag-success">Default</span>
                  ) : (
                    <button
                      onClick={() => setDefaultAccount(wallet.id, 'wallet')}
                      className="text-xs font-medium text-muted-foreground hover:text-primary px-3 py-1.5 rounded-full hover:bg-secondary transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                  {linkedWallets.length > 1 && (
                    <button
                      onClick={() => removeLinkedWallet(wallet.id)}
                      className="p-2 hover:bg-destructive/10 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => setView('add-wallet')}
              className="w-full py-4 text-center font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Add Wallet
            </button>
          </div>
        </div>

        {/* Banks */}
        <div className="mb-6 animate-slide-up stagger-2">
          <p className="section-title">Bank Accounts</p>
          <div className="rounded-xl border border-border overflow-hidden">
            {linkedBanks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No banks linked
              </div>
            ) : (
              linkedBanks.map((bank) => (
                <div key={bank.id} className="row-item px-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{bank.bankName}</p>
                      <p className="text-sm text-muted-foreground">
                        ****{bank.accountNumber.slice(-4)} · {bank.beneficiaryName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDefault(bank.id, 'bank') ? (
                      <span className="tag-success">Default</span>
                    ) : (
                      <button
                        onClick={() => setDefaultAccount(bank.id, 'bank')}
                        className="text-xs font-medium text-muted-foreground hover:text-primary px-3 py-1.5 rounded-full hover:bg-secondary transition-colors"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => removeBankAccount(bank.id)}
                      className="p-2 hover:bg-destructive/10 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setView('add-bank')}
              className="w-full py-4 text-center font-medium hover:bg-secondary transition-colors border-t border-border flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Add Bank Account
            </button>
          </div>
        </div>

        {/* KYC */}
        <div className="mb-6 animate-slide-up stagger-3">
          <p className="section-title">Identity</p>
          <div className="rounded-xl border border-border p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" />
                <div>
                  <p className="font-medium">KYC Verification</p>
                  <p className="text-sm text-muted-foreground">Verify for higher limits</p>
                </div>
              </div>
              <span className="tag">Unverified</span>
            </div>
            <button
              disabled
              className="w-full py-3 mt-4 border border-border text-muted-foreground cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>



        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="w-full py-4 rounded-xl text-destructive text-center font-medium border border-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Disconnect
        </button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          HiddenPay v1.0 · Sui Mainnet
        </p>
      </div>
    </div>
  );
};

export default Settings;
