import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  to?: string;
  from?: string;
  amount: number;
  timestamp: Date;
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
  linkedBank?: LinkedBank;
}

// Default account can be wallet or bank
type DefaultAccountType = 'wallet' | 'bank';

// KYC Status type
type KYCStatus = 'unverified' | 'pending' | 'verified';

// Mock registered users database
const registeredUsers: Record<string, PayPathUser> = {
  '1234567890': {
    username: 'duy3000',
    avatar: 'D',
    linkedBank: {
      id: '1',
      bankName: 'Vietcombank',
      accountNumber: '1234567890',
      beneficiaryName: 'NGUYEN VAN A',
    },
  },
  '0987654321': {
    username: 'alice_sui',
    avatar: 'A',
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
  balance: number; // SUI balance
  balanceVnd: number; // VND balance (mock)
  transactions: Transaction[];
  linkedBanks: LinkedBank[];
  linkedWallets: LinkedWallet[];
  // Single default - can be wallet or bank
  defaultAccountId: string | null;
  defaultAccountType: DefaultAccountType;
  contacts: string[];
  kycStatus: KYCStatus;
}

interface WalletContextType extends WalletState {
  connectWallet: (address?: string) => void;
  setUsername: (username: string) => void;
  sendSui: (to: string, amount: number) => void;
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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const mockTransactions: Transaction[] = [
  { id: '1', type: 'sent', to: '@alice', amount: 10, timestamp: new Date(Date.now() - 3600000) },
  { id: '2', type: 'received', from: '@bob', amount: 25.5, timestamp: new Date(Date.now() - 7200000) },
  { id: '3', type: 'sent', to: '@charlie', amount: 5, timestamp: new Date(Date.now() - 86400000) },
];

// Mock exchange rate: 1 SUI = 25,000 VND
const SUI_TO_VND_RATE = 25000;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    walletAddress: null,
    username: null,
    balance: 125.50,
    balanceVnd: 125.50 * SUI_TO_VND_RATE, // ~3,137,500 VND
    transactions: mockTransactions,
    linkedBanks: [],
    linkedWallets: [],
    defaultAccountId: null,
    defaultAccountType: 'wallet',
    contacts: ['@alice', '@bob'],
    kycStatus: 'unverified',
  });

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

  const sendSui = (to: string, amount: number) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: 'sent',
      to,
      amount,
      timestamp: new Date(),
    };
    setState(prev => ({
      ...prev,
      balance: prev.balance - amount - 0.01,
      balanceVnd: (prev.balance - amount - 0.01) * SUI_TO_VND_RATE,
      transactions: [newTransaction, ...prev.transactions],
    }));
  };

  const disconnect = () => {
    setState({
      isConnected: false,
      walletAddress: null,
      username: null,
      balance: 125.50,
      balanceVnd: 125.50 * SUI_TO_VND_RATE,
      transactions: mockTransactions,
      linkedBanks: [],
      linkedWallets: [],
      defaultAccountId: null,
      defaultAccountType: 'wallet',
      contacts: ['@alice', '@bob'],
      kycStatus: 'unverified',
    });
  };

  const addBankAccount = (bank: Omit<LinkedBank, 'id'>) => {
    const bankId = Date.now().toString();
    const newBank: LinkedBank = {
      ...bank,
      id: bankId,
    };
    setState(prev => ({
      ...prev,
      linkedBanks: [...prev.linkedBanks, newBank],
    }));
  };

  const removeBankAccount = (id: string) => {
    setState(prev => {
      const newBanks = prev.linkedBanks.filter(bank => bank.id !== id);
      // If removing default bank, reset to first wallet
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
    const newWallet: LinkedWallet = {
      ...wallet,
      id: walletId,
    };
    setState(prev => ({
      ...prev,
      linkedWallets: [...prev.linkedWallets, newWallet],
    }));
  };

  const removeLinkedWallet = (id: string) => {
    setState(prev => {
      const newWallets = prev.linkedWallets.filter(wallet => wallet.id !== id);
      // If removing default wallet, reset to first available
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
    return registeredUsers[accountNumber] || null;
  };

  const lookupUsername = (username: string): PayPathUser | null => {
    const cleanUsername = username.replace('@', '').toLowerCase();
    for (const user of Object.values(registeredUsers)) {
      if (user.username.toLowerCase() === cleanUsername) {
        return user;
      }
    }
    return null;
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
      sendSui,
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
