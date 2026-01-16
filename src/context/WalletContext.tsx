import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  to?: string;
  from?: string;
  amount: number;
  timestamp: Date;
}

interface WalletState {
  isConnected: boolean;
  username: string | null;
  balance: number;
  balanceUsd: number;
  transactions: Transaction[];
}

interface WalletContextType extends WalletState {
  connectWallet: () => void;
  setUsername: (username: string) => void;
  sendSui: (to: string, amount: number) => void;
  disconnect: () => void;
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
    username: null,
    balance: 125.50,
    balanceUsd: 150.00,
    transactions: mockTransactions,
  });

  const connectWallet = () => {
    setState(prev => ({ ...prev, isConnected: true }));
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
      balance: prev.balance - amount - 0.01, // Include fee
      balanceUsd: (prev.balance - amount - 0.01) * 1.2,
      transactions: [newTransaction, ...prev.transactions],
    }));
  };

  const disconnect = () => {
    setState({
      isConnected: false,
      username: null,
      balance: 125.50,
      balanceUsd: 150.00,
      transactions: mockTransactions,
    });
  };

  return (
    <WalletContext.Provider value={{ ...state, connectWallet, setUsername, sendSui, disconnect }}>
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
