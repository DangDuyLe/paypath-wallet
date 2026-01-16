import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { ChevronRight, Building2, Scan, Check, X, Loader2, LogOut, History, HelpCircle, Key } from 'lucide-react';
import QRScanner from '@/components/QRScanner';

interface ScannedBankData {
  bankName: string;
  accountNumber: string;
  beneficiaryName: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { username, disconnect, isConnected, linkedBank, linkBankAccount } = useWallet();
  const [showLinkBank, setShowLinkBank] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedBankData | null>(null);

  if (!isConnected || !username) {
    navigate('/');
    return null;
  }

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const handleScanBankQR = () => {
    setShowScanner(true);
  };

  // Called when QR is scanned - backend team will implement actual parsing
  const handleQRScanned = (rawData: string) => {
    setShowScanner(false);
    setIsScanning(true);
    console.log('Bank QR Data received:', rawData);

    // TODO: Backend team will parse rawData (VietQR format) here
    // For now, simulate with mock data after a short delay
    setTimeout(() => {
      setScannedData({
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        beneficiaryName: 'NGUYEN VAN DUY',
      });
      setIsScanning(false);
    }, 500);
  };

  const handleSaveBank = () => {
    if (scannedData) {
      linkBankAccount(scannedData);
      setShowLinkBank(false);
      setScannedData(null);
    }
  };

  // Link Bank Modal
  if (showLinkBank) {
    return (
      <>
        {/* QR Scanner Modal */}
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleQRScanned}
          title="Quét QR ngân hàng"
        />

        <div className="app-container">
          <div className="page-wrapper">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 animate-fade-in">
              <h1 className="text-xl font-bold">Link Bank Account</h1>
              <button
                onClick={() => {
                  setShowLinkBank(false);
                  setScannedData(null);
                }}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 animate-slide-up">
              {/* Scan Button */}
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

              {/* Scanned Data Preview */}
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
                      <div className="input-modern bg-secondary">
                        {scannedData.bankName}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                        Account Number
                      </label>
                      <div className="input-modern bg-secondary font-mono">
                        {scannedData.accountNumber}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
                        Beneficiary Name
                      </label>
                      <div className="input-modern bg-secondary">
                        {scannedData.beneficiaryName}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveBank}
              className="btn-primary mt-6"
              disabled={!scannedData}
            >
              Save Bank Account
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
              <p className="text-sm text-muted-foreground">Sui Mainnet</p>
            </div>
          </div>
        </div>

        {/* Linked Bank Section */}
        <div className="mb-6 animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Linked Bank
          </h2>

          {linkedBank ? (
            <div className="card-container">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{linkedBank.bankName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    ****{linkedBank.accountNumber.slice(-4)} • {linkedBank.beneficiaryName}
                  </p>
                </div>
                <button
                  onClick={() => setShowLinkBank(true)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLinkBank(true)}
              className="w-full card-container flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Link Bank Account</p>
                  <p className="text-xs text-muted-foreground">Receive VND to your bank</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Wallet Info */}
        <div className="mb-6 animate-slide-up">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">
            Wallet
          </h2>
          <div className="card-container p-0 overflow-hidden">
            <div className="settings-row px-5">
              <span className="text-muted-foreground text-sm">Address</span>
              <span className="font-mono text-sm">0x7a3b...f92d</span>
            </div>
            <div className="settings-row px-5">
              <span className="text-muted-foreground text-sm">Network</span>
              <span className="text-sm font-medium">Sui Mainnet</span>
            </div>
          </div>
        </div>

        {/* Actions */}
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

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          PayPath v1.0.0 • Built on Sui
        </p>
      </div>
    </div>
  );
};

export default Settings;
