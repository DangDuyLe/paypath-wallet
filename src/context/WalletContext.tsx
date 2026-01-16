import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  to?: string;
  from?: string;
  amount: number;
  timestamp: Date;
  isOffRamp?: boolean;
}

interface LinkedBank {
  bankName: string;
  accountNumber: string;
  beneficiaryName: string;
}

interface PayPathUser {
  username: string;
  avatar?: string;
  linkedBank?: LinkedBank;
}

// Mock registered users database
const registeredUsers: Record<string, PayPathUser> = {
  '1234567890': {
    username: 'duy3000',
    avatar: 'D',
    linkedBank: {
      bankName: 'Vietcombank',
      accountNumber: '1234567890',
      beneficiaryName: 'NGUYEN VAN A',
    },
  },
  '0987654321': {
    username: 'alice_sui',
    avatar: 'A',
    linkedBank: {
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
  balance: number;
  balanceUsd: number;
  transactions: Transaction[];
  linkedBank: LinkedBank | null;
  contacts: string[];
}

interface WalletContextType extends WalletState {
  connectWallet: (address?: string) => void;
  setUsername: (username: string) => void;
  sendSui: (to: string, amount: number, isOffRamp?: boolean) => void;
  disconnect: () => void;
  linkBankAccount: (bank: LinkedBank) => void;
  addContact: (username: string) => void;
  lookupBankAccount: (accountNumber: string) => PayPathUser | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const mockTransactions: Transaction[] = [
  { id: '1', type: 'sent', to: '@alice', amount: 10, timestamp: new Date(Date.now() - 3600000) },
  { id: '2', type: 'received', from: '@bob', amount: 25.5, timestamp: new Date(Date.now() - 7200000) },
  { id: '3', type: 'sent', to: '@charlie', amount: 5, timestamp: new Date(Date.now() - 86400000) },
];

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    walletAddress: null,
    username: null,
    balance: 125.50,
    balanceUsd: 150.00,
    transactions: mockTransactions,
    linkedBank: null,
    contacts: ['@alice', '@bob'],
  });

  const connectWallet = (address?: string) => {
    setState(prev => ({
      ...prev,
      isConnected: true,
      walletAddress: address || null,
    }));
  };

  const setUsername = (username: string) => {
    setState(prev => ({ ...prev, username }));
  };

  const sendSui = (to: string, amount: number, isOffRamp?: boolean) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: 'sent',
      to,
      amount,
      timestamp: new Date(),
      isOffRamp,
    };
    setState(prev => ({
      ...prev,
      balance: prev.balance - amount - 0.01,
      balanceUsd: (prev.balance - amount - 0.01) * 1.2,
      transactions: [newTransaction, ...prev.transactions],
    }));
  };

  const disconnect = () => {
    setState({
      isConnected: false,
      walletAddress: null,
      username: null,
      balance: 125.50,
      balanceUsd: 150.00,
      transactions: mockTransactions,
      linkedBank: null,
      contacts: ['@alice', '@bob'],
    });
  };

  const linkBankAccount = (bank: LinkedBank) => {
    setState(prev => ({ ...prev, linkedBank: bank }));
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

  return (
    <WalletContext.Provider value={{
      ...state,
      connectWallet,
      setUsername,
      sendSui,
      disconnect,
      linkBankAccount,
      addContact,
      lookupBankAccount,
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
