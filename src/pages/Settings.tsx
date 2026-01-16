import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { Wallet, Building2, Scan, Check, Trash2, Star, Shield, LogOut, Key, History, HelpCircle, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
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

  // Add Wallet View
  if (view === 'add-wallet') {
    return (
      <div className="app-container">
        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-8 animate-fade-in">
            <h1 className="text-xl font-bold">Add Wallet</h1>
            <button onClick={() => setView('main')} className="btn-ghost">Cancel</button>
          </div>

          <div className="flex-1 space-y-6 animate-slide-up">
            <div>
              <p className="label-caps mb-2">Wallet Name</p>
              <input
                type="text"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                placeholder="e.g. Trading Wallet"
                className="input-box"
              />
            </div>
            <div>
              <p className="label-caps mb-2">Address</p>
              <input
                type="text"
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value)}
                placeholder="0x..."
                className="input-box font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleAddWallet}
            disabled={!newWalletName || !newWalletAddress}
            className="btn-primary mt-8"
          >
            Add Wallet
          </button>
        </div>
      </div>
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
            <div className="flex justify-between items-center mb-8 animate-fade-in">
              <h1 className="text-xl font-bold">Link Bank</h1>
              <button onClick={() => { setView('main'); setScannedBank(null); setParseError(''); }} className="btn-ghost">Cancel</button>
            </div>

            <div className="flex-1 animate-slide-up">
              <button
                onClick={() => setShowScanner(true)}
                disabled={isParsing}
                className="w-full py-4 border border-border text-center font-medium hover:bg-secondary transition-colors mb-6 flex items-center justify-center gap-2 disabled:opacity-50"
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
                <div className="flex items-center gap-2 p-4 border border-destructive text-destructive mb-6">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="font-medium">{parseError}</p>
                </div>
              )}

              {/* Scanned Bank Info */}
              {scannedBank && (
                <div className="border border-border animate-slide-up">
                  <div className="row-item px-4 bg-success/10">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-success font-medium">QR Parsed Successfully</span>
                    </div>
                  </div>
                  <div className="row-item px-4">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium">{scannedBank.bankName}</span>
                  </div>
                  <div className="row-item px-4">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-mono">{scannedBank.accountNumber}</span>
                  </div>
                  <div className="row-item px-4">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{scannedBank.beneficiaryName}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAddBank}
              disabled={!scannedBank}
              className="btn-primary mt-8"
            >
              Add Bank
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
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <h1 className="text-xl font-bold">Settings</h1>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost">Done</button>
        </div>

        {/* Profile */}
        <div className="pb-6 border-b border-border mb-6 animate-slide-up">
          <p className="label-caps mb-2">Username</p>
          <p className="display-medium">@{username}</p>
        </div>

        {/* Wallets */}
        <div className="mb-6 animate-slide-up stagger-1">
          <p className="section-title">Wallets</p>
          <div className="border border-border">
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
                      className="p-2 hover:bg-secondary transition-colors"
                      title="Set as default"
                    >
                      <Star className="w-4 h-4 text-muted-foreground" />
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
          <p className="section-title">Banks</p>
          <div className="border border-border">
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
                        className="p-2 hover:bg-secondary transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4 text-muted-foreground" />
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
              Link Bank
            </button>
          </div>
        </div>

        {/* KYC */}
        <div className="mb-6 animate-slide-up stagger-3">
          <p className="section-title">Identity</p>
          <div className="border border-border p-4">
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

        {/* Actions */}
        <div className="mb-6 animate-slide-up">
          <p className="section-title">Actions</p>
          <div className="border border-border">
            <button className="w-full row-item px-4 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5" />
                <span className="font-medium">Export Private Key</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full row-item px-4 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5" />
                <span className="font-medium">Transaction History</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full row-item px-4 hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Support</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="w-full py-4 text-destructive text-center font-medium border border-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Disconnect
        </button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          PayPath v1.0 · Sui Testnet
        </p>
      </div>
    </div>
  );
};

export default Settings;
