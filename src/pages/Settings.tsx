import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import {
  ChevronRight, Building2, Scan, Check, X, Loader2, LogOut,
  History, HelpCircle, Key, Wallet, Plus, Shield, AlertCircle,
  Trash2, Star
} from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { useDisconnectWallet } from '@mysten/dapp-kit';

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
    walletAddress,
    kycStatus,
  } = useWallet();

  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedBankData | null>(null);

  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletAddress, setNewWalletAddress] = useState('');

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  const handleDisconnect = () => {
    disconnectSuiWallet();
    disconnect();
    navigate('/login');
  };

  const handleScanBankQR = () => {
    setShowScanner(true);
  };

  const handleQRScanned = (rawData: string) => {
    setShowScanner(false);
    setIsScanning(true);

    setTimeout(() => {
      setScannedData({
        bankName: 'Vietcombank',
        accountNumber: Math.random().toString().slice(2, 12),
        beneficiaryName: 'NGUYEN VAN DUY',
      });
      setIsScanning(false);
    }, 500);
  };

  const handleSaveBank = () => {
    if (scannedData) {
      addBankAccount(scannedData);
      setShowAddBank(false);
      setScannedData(null);
    }
  };

  const handleAddWallet = () => {
    if (newWalletName.trim() && newWalletAddress.trim()) {
      addLinkedWallet({
        name: newWalletName.trim(),
        address: newWalletAddress.trim(),
      });
      setNewWalletName('');
      setNewWalletAddress('');
      setShowAddWallet(false);
    }
  };

  // Check if item is the single default
  const isDefault = (id: string, type: 'wallet' | 'bank') => {
    return defaultAccountId === id && defaultAccountType === type;
  };

  // Add Wallet Modal
  if (showAddWallet) {
    return (
      <div className="app-container">
        <div className="page-wrapper">
          <div className="flex justify-between items-center mb-6 animate-fade-in">
            <h1 className="text-xl font-bold">Add Wallet</h1>
            <button
              onClick={() => {
                setShowAddWallet(false);
                setNewWalletName('');
                setNewWalletAddress('');
              }}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 animate-slide-up space-y-4">
            <div className="card-container space-y-4">
              <div>
                <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  placeholder="e.g. Trading Wallet"
                  className="input-modern"
                />
              </div>
              <div>
                <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="input-modern font-mono"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleAddWallet}
            className="btn-primary mt-6"
            disabled={!newWalletName.trim() || !newWalletAddress.trim()}
          >
            Add Wallet
          </button>
        </div>
      </div>
    );
  }

  // Add Bank Modal
  if (showAddBank) {
    return (
      <>
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleQRScanned}
          title="Quét QR ngân hàng"
        />

        <div className="app-container">
          <div className="page-wrapper">
            <div className="flex justify-between items-center mb-6 animate-fade-in">
              <h1 className="text-xl font-bold">Add Bank Account</h1>
              <button
                onClick={() => {
                  setShowAddBank(false);
                  setScannedData(null);
                }}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 animate-slide-up">
              <button
                onClick={handleScanBankQR}
                disabled={isScanning}
                className="w-full card-container flex items-center justify-center gap-3 hover:bg-secondary transition-colors cursor-pointer mb-6"
              >
                {isScanning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Scan className="w-5 h-5" />
                )}
                <span className="font-semibold">
                  {isScanning ? 'Scanning...' : 'Scan / Upload Bank QR'}
                </span>
              </button>

              {scannedData && (
                <div className="card-container animate-slide-up">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="font-semibold">QR Scanned Successfully</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                        Bank Name
                      </label>
                      <div className="input-modern bg-secondary">{scannedData.bankName}</div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                        Account Number
                      </label>
                      <div className="input-modern bg-secondary font-mono">{scannedData.accountNumber}</div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                        Beneficiary Name
                      </label>
                      <div className="input-modern bg-secondary">{scannedData.beneficiaryName}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveBank}
              className="btn-primary mt-6"
              disabled={!scannedData}
            >
              Add Bank Account
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="app-container">
      <div className="page-wrapper">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 animate-fade-in">
          <h1 className="text-xl font-bold">Settings</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
          >
            Done
          </button>
        </div>

        {/* Profile Card */}
        <div className="card-container mb-6 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold">@{username}</p>
              <p className="text-sm text-muted-foreground">Sui Testnet</p>
            </div>
          </div>
        </div>

        {/* 1. IDENTITY (KYC) SECTION */}
        <div className="mb-6 animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Identity
          </h2>
          <div className="card-container">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 text-warning flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">KYC Verification</p>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                    Unverified
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Verify your identity for higher limits</p>
              </div>
            </div>
            <button
              disabled
              className="w-full mt-4 py-3 px-4 bg-muted text-muted-foreground rounded-xl font-medium text-sm cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Verify Identity (Coming Soon)
            </button>
          </div>
        </div>

        {/* 2. WALLETS SECTION */}
        <div className="mb-6 animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Wallets (On-chain)
          </h2>
          <div className="space-y-3">
            {linkedWallets.map((wallet) => (
              <div key={wallet.id} className={`card-container ${isDefault(wallet.id, 'wallet') ? 'ring-2 ring-success' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDefault(wallet.id, 'wallet') ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
                    }`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{wallet.name}</p>
                      {isDefault(wallet.id, 'wallet') && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success flex-shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {wallet.address.length > 20
                        ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                        : wallet.address
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isDefault(wallet.id, 'wallet') && (
                      <button
                        onClick={() => setDefaultAccount(wallet.id, 'wallet')}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                    {linkedWallets.length > 1 && (
                      <button
                        onClick={() => removeLinkedWallet(wallet.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Remove wallet"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowAddWallet(true)}
              className="w-full card-container flex items-center justify-center gap-2 hover:bg-secondary transition-colors cursor-pointer border-2 border-dashed border-border"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Add Another Wallet</span>
            </button>
          </div>
        </div>

        {/* 3. BANKS SECTION */}
        <div className="mb-6 animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Banks (Off-chain)
          </h2>

          <div className="space-y-3">
            {linkedBanks.map((bank) => (
              <div key={bank.id} className={`card-container ${isDefault(bank.id, 'bank') ? 'ring-2 ring-success' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDefault(bank.id, 'bank') ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
                    }`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{bank.bankName}</p>
                      {isDefault(bank.id, 'bank') && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success/10 text-success flex-shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      ****{bank.accountNumber.slice(-4)} • {bank.beneficiaryName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isDefault(bank.id, 'bank') && (
                      <button
                        onClick={() => setDefaultAccount(bank.id, 'bank')}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        title="Set as default"
                      >
                        <Star className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      onClick={() => removeBankAccount(bank.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Remove bank"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {linkedBanks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No banks linked yet</p>
              </div>
            )}

            <button
              onClick={() => setShowAddBank(true)}
              className="w-full card-container flex items-center justify-center gap-2 hover:bg-secondary transition-colors cursor-pointer border-2 border-dashed border-border"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Add New Bank</span>
            </button>
          </div>
        </div>

        {/* 4. ACTIONS SECTION */}
        <div className="mb-6 animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Actions
          </h2>
          <div className="card-container p-0 overflow-hidden">
            <button className="w-full settings-row px-5 hover:bg-secondary transition-colors text-left">
              <div className="flex items-center gap-3">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Export Private Key</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full settings-row px-5 hover:bg-secondary transition-colors text-left">
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Transaction History</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full settings-row px-5 hover:bg-secondary transition-colors text-left">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Disconnect */}
        <div className="mt-auto animate-slide-up">
          <button
            onClick={handleDisconnect}
            className="w-full card-container flex items-center justify-center gap-2 text-destructive hover:bg-destructive/5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-semibold text-sm">Disconnect Wallet</span>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          PayPath v1.0.0 • Built on Sui
        </p>
      </div>
    </div>
  );
};

export default Settings;
