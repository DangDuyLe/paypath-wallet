import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

// Aftermath USDC Token on Sui Testnet
const USDC_COIN_TYPE = "0xcdd397f2cffb7f5d439f56fc01afe5585c5f06e3bcd2ee3a21753c566de313d9::usdc::USDC";
const USDC_DECIMALS = 9; // This USDC has 9 decimals

interface TransactionRecord {
  id: string;
  type: 'sent' | 'received';
  to?: string;
  from?: string;
  amount: number;
  timestamp: Date;
  token: 'SUI' | 'USDC';
}

interface LinkedBank {
  id: string;
  bankName: string;
  accountNumber: string;
  beneficiaryName: string;
}

interface LinkedWallet {
  id: string;
  address: string;
  name: string;
}

interface PayPathUser {
  username: string;
  avatar?: string;
  walletAddress?: string;
  linkedBank?: LinkedBank;
}

type DefaultAccountType = 'wallet' | 'bank';
type KYCStatus = 'unverified' | 'pending' | 'verified';

// Mock registered users database
const registeredUsers: Record<string, PayPathUser> = {
  'duy3000': {
    username: 'duy3000',
    avatar: 'D',
    walletAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    linkedBank: {
      id: '1',
      bankName: 'Vietcombank',
      accountNumber: '1234567890',
      beneficiaryName: 'NGUYEN VAN A',
    },
  },
  'alice_sui': {
    username: 'alice_sui',
    avatar: 'A',
    walletAddress: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    linkedBank: {
      id: '2',
      bankName: 'Techcombank',
      accountNumber: '0987654321',
      beneficiaryName: 'TRAN THI B',
    },
  },
};

interface WalletState {
  isConnected: boolean;
  walletAddress: string | null;
  username: string | null;
  suiBalance: number;
  usdcBalance: number;
  balanceVnd: number;
  transactions: TransactionRecord[];
  linkedBanks: LinkedBank[];
  linkedWallets: LinkedWallet[];
  defaultAccountId: string | null;
  defaultAccountType: DefaultAccountType;
  contacts: string[];
  kycStatus: KYCStatus;
  isLoadingBalance: boolean;
}

interface WalletContextType extends WalletState {
  connectWallet: (address?: string) => void;
  setUsername: (username: string) => void;
  sendUsdc: (toAddress: string, amount: number) => Promise<boolean>;
  disconnect: () => void;
  addBankAccount: (bank: Omit<LinkedBank, 'id'>) => void;
  removeBankAccount: (id: string) => void;
  addLinkedWallet: (wallet: Omit<LinkedWallet, 'id'>) => void;
  removeLinkedWallet: (id: string) => void;
  setDefaultAccount: (id: string, type: DefaultAccountType) => void;
  addContact: (username: string) => void;
  lookupBankAccount: (accountNumber: string) => PayPathUser | null;
  lookupUsername: (username: string) => PayPathUser | null;
  getDefaultAccount: () => { id: string; type: DefaultAccountType; name: string } | null;
  refreshBalance: () => Promise<void>;
  isValidWalletAddress: (address: string) => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const mockTransactions: TransactionRecord[] = [
  { id: '1', type: 'sent', to: '@alice', amount: 10, timestamp: new Date(Date.now() - 3600000), token: 'USDC' },
  { id: '2', type: 'received', from: '@bob', amount: 25.5, timestamp: new Date(Date.now() - 7200000), token: 'USDC' },
  { id: '3', type: 'sent', to: '@charlie', amount: 5, timestamp: new Date(Date.now() - 86400000), token: 'USDC' },
];

// Exchange rate: 1 USDC = 25,500 VND
const USDC_TO_VND_RATE = 25500;

export function WalletProvider({ children }: { children: ReactNode }) {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [state, setState] = useState<WalletState>({
    isConnected: false,
    walletAddress: null,
    username: null,
    suiBalance: 0,
    usdcBalance: 0,
    balanceVnd: 0,
    transactions: mockTransactions,
    linkedBanks: [],
    linkedWallets: [],
    defaultAccountId: null,
    defaultAccountType: 'wallet',
    contacts: ['@alice', '@bob'],
    kycStatus: 'unverified',
    isLoadingBalance: false,
  });

  // Fetch REAL balances and transactions from blockchain
  const refreshBalance = useCallback(async () => {
    if (!currentAccount?.address) return;

    setState(prev => ({ ...prev, isLoadingBalance: true }));

    try {
      // Get SUI balance (for gas fees)
      const suiBalanceResult = await suiClient.getBalance({
        owner: currentAccount.address,
      });
      // SUI has 9 decimals
      const suiBalance = Number(suiBalanceResult.totalBalance) / 1_000_000_000;

      // Get USDC balance
      const usdcBalanceResult = await suiClient.getBalance({
        owner: currentAccount.address,
        coinType: USDC_COIN_TYPE,
      });
      // USDC - divide by 10^USDC_DECIMALS
      const usdcBalance = Number(usdcBalanceResult.totalBalance) / Math.pow(10, USDC_DECIMALS);

      // Fetch recent transactions
      const txHistory = await fetchTransactions(currentAccount.address);

      setState(prev => ({
        ...prev,
        suiBalance,
        usdcBalance,
        balanceVnd: usdcBalance * USDC_TO_VND_RATE,
        transactions: txHistory.length > 0 ? txHistory : prev.transactions,
        isLoadingBalance: false,
      }));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setState(prev => ({ ...prev, isLoadingBalance: false }));
    }
  }, [currentAccount?.address, suiClient]);

  // Fetch real transaction history from blockchain
  const fetchTransactions = async (address: string): Promise<TransactionRecord[]> => {
    try {
      // Query transactions where user is sender
      const sentTxs = await suiClient.queryTransactionBlocks({
        filter: { FromAddress: address },
        options: { showInput: true, showEffects: true, showBalanceChanges: true },
        limit: 10,
        order: 'descending',
      });

      // Query transactions where user is receiver
      const receivedTxs = await suiClient.queryTransactionBlocks({
        filter: { ToAddress: address },
        options: { showInput: true, showEffects: true, showBalanceChanges: true },
        limit: 10,
        order: 'descending',
      });

      const transactions: TransactionRecord[] = [];

      // Process sent transactions
      for (const tx of sentTxs.data) {
        const balanceChanges = tx.balanceChanges || [];

        // Find USDC balance changes
        for (const change of balanceChanges) {
          if (change.coinType === USDC_COIN_TYPE && change.owner && typeof change.owner === 'object' && 'AddressOwner' in change.owner) {
            const ownerAddr = change.owner.AddressOwner;
            const amount = Math.abs(Number(change.amount)) / Math.pow(10, USDC_DECIMALS);

            if (amount > 0 && ownerAddr !== address) {
              transactions.push({
                id: tx.digest,
                type: 'sent',
                to: ownerAddr.slice(0, 6) + '...' + ownerAddr.slice(-4),
                amount,
                timestamp: new Date(Number(tx.timestampMs)),
                token: 'USDC',
              });
            }
          }
        }
      }

      // Process received transactions
      for (const tx of receivedTxs.data) {
        const balanceChanges = tx.balanceChanges || [];

        for (const change of balanceChanges) {
          if (change.coinType === USDC_COIN_TYPE && change.owner && typeof change.owner === 'object' && 'AddressOwner' in change.owner) {
            const ownerAddr = change.owner.AddressOwner;
            const amount = Number(change.amount) / Math.pow(10, USDC_DECIMALS);

            if (amount > 0 && ownerAddr === address) {
              // Find sender from other balance changes
              const senderChange = balanceChanges.find(c =>
                c.coinType === USDC_COIN_TYPE &&
                Number(c.amount) < 0 &&
                c.owner && typeof c.owner === 'object' && 'AddressOwner' in c.owner
              );
              const senderAddr = senderChange?.owner && typeof senderChange.owner === 'object' && 'AddressOwner' in senderChange.owner
                ? senderChange.owner.AddressOwner
                : 'Unknown';

              transactions.push({
                id: tx.digest,
                type: 'received',
                from: senderAddr === 'Unknown' ? senderAddr : senderAddr.slice(0, 6) + '...' + senderAddr.slice(-4),
                amount,
                timestamp: new Date(Number(tx.timestampMs)),
                token: 'USDC',
              });
            }
          }
        }
      }

      // Sort by timestamp descending and remove duplicates
      const uniqueTxs = transactions.filter((tx, index, self) =>
        index === self.findIndex(t => t.id === tx.id)
      );
      uniqueTxs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return uniqueTxs.slice(0, 10);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  };

  // Auto-refresh balance when account connects or changes
  useEffect(() => {
    if (currentAccount?.address) {
      refreshBalance();
    }
  }, [currentAccount?.address, refreshBalance]);

  // Validate wallet address format (0x followed by 64 hex chars)
  const isValidWalletAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{64}$/.test(address);
  };

  const connectWallet = (address?: string) => {
    const walletId = Date.now().toString();
    const newWallet: LinkedWallet = {
      id: walletId,
      address: address || '0x0000...0000',
      name: 'Main Wallet',
    };

    setState(prev => ({
      ...prev,
      isConnected: true,
      walletAddress: address || null,
      linkedWallets: [newWallet],
      defaultAccountId: walletId,
      defaultAccountType: 'wallet',
    }));
  };

  const setUsername = (username: string) => {
    setState(prev => ({ ...prev, username }));
  };

  // Send USDC Token
  const sendUsdc = async (toAddress: string, amount: number): Promise<boolean> => {
    if (!currentAccount?.address) {
      console.error('No wallet connected');
      return false;
    }

    if (!isValidWalletAddress(toAddress)) {
      console.error('Invalid recipient address');
      return false;
    }

    try {
      // Convert amount to smallest unit using USDC_DECIMALS
      // User input: 10 USDC -> Raw amount: 10 * 10^9
      const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));

      // Get user's USDC coins
      const coins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: USDC_COIN_TYPE,
      });

      if (coins.data.length === 0) {
        console.error('No USDC coins found');
        return false;
      }

      const tx = new Transaction();

      // Get the primary coin
      const primaryCoin = coins.data[0];

      // Split the exact amount from the coin
      const [coinToSend] = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [
        tx.pure.u64(amountInSmallestUnit),
      ]);

      // Transfer to recipient
      tx.transferObjects([coinToSend], tx.pure.address(toAddress));

      // Sign and execute
      await signAndExecute({
        transaction: tx,
      });

      // Add transaction record
      const newTransaction: TransactionRecord = {
        id: Date.now().toString(),
        type: 'sent',
        to: toAddress.slice(0, 8) + '...' + toAddress.slice(-4),
        amount,
        timestamp: new Date(),
        token: 'USDC',
      };

      setState(prev => ({
        ...prev,
        transactions: [newTransaction, ...prev.transactions],
      }));

      // Refresh balance after sending
      setTimeout(refreshBalance, 2000);

      return true;
    } catch (error) {
      console.error('Failed to send USDC:', error);
      return false;
    }
  };

  const disconnect = () => {
    setState({
      isConnected: false,
      walletAddress: null,
      username: null,
      suiBalance: 0,
      usdcBalance: 0,
      balanceVnd: 0,
      transactions: mockTransactions,
      linkedBanks: [],
      linkedWallets: [],
      defaultAccountId: null,
      defaultAccountType: 'wallet',
      contacts: ['@alice', '@bob'],
      kycStatus: 'unverified',
      isLoadingBalance: false,
    });
  };

  const addBankAccount = (bank: Omit<LinkedBank, 'id'>) => {
    const bankId = Date.now().toString();
    const newBank: LinkedBank = { ...bank, id: bankId };
    setState(prev => ({
      ...prev,
      linkedBanks: [...prev.linkedBanks, newBank],
    }));
  };

  const removeBankAccount = (id: string) => {
    setState(prev => {
      const newBanks = prev.linkedBanks.filter(bank => bank.id !== id);
      let newDefaultId = prev.defaultAccountId;
      let newDefaultType = prev.defaultAccountType;
      if (prev.defaultAccountId === id && prev.defaultAccountType === 'bank') {
        if (prev.linkedWallets.length > 0) {
          newDefaultId = prev.linkedWallets[0].id;
          newDefaultType = 'wallet';
        } else if (newBanks.length > 0) {
          newDefaultId = newBanks[0].id;
          newDefaultType = 'bank';
        } else {
          newDefaultId = null;
        }
      }
      return {
        ...prev,
        linkedBanks: newBanks,
        defaultAccountId: newDefaultId,
        defaultAccountType: newDefaultType,
      };
    });
  };

  const addLinkedWallet = (wallet: Omit<LinkedWallet, 'id'>) => {
    const walletId = Date.now().toString();
    const newWallet: LinkedWallet = { ...wallet, id: walletId };
    setState(prev => ({
      ...prev,
      linkedWallets: [...prev.linkedWallets, newWallet],
    }));
  };

  const removeLinkedWallet = (id: string) => {
    setState(prev => {
      const newWallets = prev.linkedWallets.filter(wallet => wallet.id !== id);
      let newDefaultId = prev.defaultAccountId;
      let newDefaultType = prev.defaultAccountType;
      if (prev.defaultAccountId === id && prev.defaultAccountType === 'wallet') {
        if (newWallets.length > 0) {
          newDefaultId = newWallets[0].id;
          newDefaultType = 'wallet';
        } else if (prev.linkedBanks.length > 0) {
          newDefaultId = prev.linkedBanks[0].id;
          newDefaultType = 'bank';
        } else {
          newDefaultId = null;
        }
      }
      return {
        ...prev,
        linkedWallets: newWallets,
        defaultAccountId: newDefaultId,
        defaultAccountType: newDefaultType,
      };
    });
  };

  const setDefaultAccount = (id: string, type: DefaultAccountType) => {
    setState(prev => ({
      ...prev,
      defaultAccountId: id,
      defaultAccountType: type,
    }));
  };

  const addContact = (username: string) => {
    setState(prev => ({
      ...prev,
      contacts: prev.contacts.includes(username)
        ? prev.contacts
        : [...prev.contacts, username],
    }));
  };

  const lookupBankAccount = (accountNumber: string): PayPathUser | null => {
    for (const user of Object.values(registeredUsers)) {
      if (user.linkedBank?.accountNumber === accountNumber) {
        return user;
      }
    }
    return null;
  };

  const lookupUsername = (username: string): PayPathUser | null => {
    const cleanUsername = username.replace('@', '').toLowerCase();
    return registeredUsers[cleanUsername] || null;
  };

  const getDefaultAccount = () => {
    if (!state.defaultAccountId) return null;

    if (state.defaultAccountType === 'wallet') {
      const wallet = state.linkedWallets.find(w => w.id === state.defaultAccountId);
      if (wallet) {
        return { id: wallet.id, type: 'wallet' as DefaultAccountType, name: wallet.name };
      }
    } else {
      const bank = state.linkedBanks.find(b => b.id === state.defaultAccountId);
      if (bank) {
        return { id: bank.id, type: 'bank' as DefaultAccountType, name: bank.bankName };
      }
    }
    return null;
  };

  return (
    <WalletContext.Provider value={{
      ...state,
      connectWallet,
      setUsername,
      sendUsdc,
      disconnect,
      addBankAccount,
      removeBankAccount,
      addLinkedWallet,
      removeLinkedWallet,
      setDefaultAccount,
      addContact,
      lookupBankAccount,
      lookupUsername,
      getDefaultAccount,
      refreshBalance,
      isValidWalletAddress,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
