import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

// Official Native USDC on Sui Mainnet
const USDC_COIN_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
const USDC_DECIMALS = 6; // Mainnet USDC has 6 decimals

interface TransactionRecord {
  id: string;
  type: 'sent' | 'received';
  to?: string;
  from?: string;
  amount: number;
  timestamp: Date;
  token: 'SUI' | 'USDC';
  digest?: string; // Transaction hash
}

interface ReferralStats {
  totalCommission: number;
  f0Volume: number;
  f0Count: number;
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

interface HiddenWalletUser {
  username: string;
  avatar?: string;
  walletAddress?: string;
  linkedBank?: LinkedBank;
}

type DefaultAccountType = 'wallet' | 'bank';
type KYCStatus = 'unverified' | 'pending' | 'verified';

// Mock registered users database
const registeredUsers: Record<string, HiddenWalletUser> = {
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
  rewardPoints: number;
  referralStats: ReferralStats;
}

interface WalletContextType extends WalletState {
  connectWallet: (address?: string) => void;
  setUsername: (username: string) => void;
  sendUsdc: (toAddress: string, amount: number) => Promise<{ success: boolean; digest?: string }>;
  disconnect: () => void;
  addBankAccount: (bank: Omit<LinkedBank, 'id'>) => void;
  removeBankAccount: (id: string) => void;
  addLinkedWallet: (wallet: Omit<LinkedWallet, 'id'>) => void;
  removeLinkedWallet: (id: string) => void;
  setDefaultAccount: (id: string, type: DefaultAccountType) => void;
  addContact: (username: string) => void;
  lookupBankAccount: (accountNumber: string) => HiddenWalletUser | null;
  lookupUsername: (username: string) => HiddenWalletUser | null;
  getDefaultAccount: () => { id: string; type: DefaultAccountType; name: string } | null;
  refreshBalance: () => Promise<void>;
  isValidWalletAddress: (address: string) => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const mockTransactions: TransactionRecord[] = [
  { id: '1', type: 'sent', to: '@alice', amount: 10, timestamp: new Date(Date.now() - 3600000), token: 'USDC', digest: '5Am7kZ...9zXq' },
  { id: '2', type: 'received', from: '@bob', amount: 25.5, timestamp: new Date(Date.now() - 7200000), token: 'USDC', digest: '8Bc3mL...4wYn' },
  { id: '3', type: 'sent', to: '@charlie', amount: 5, timestamp: new Date(Date.now() - 86400000), token: 'USDC', digest: '2Dp9nR...7vTm' },
  { id: '4', type: 'received', from: '@dave', amount: 100, timestamp: new Date(Date.now() - 172800000), token: 'USDC', digest: '6Eq5oS...1uWp' },
  { id: '5', type: 'sent', to: '@eve', amount: 15.75, timestamp: new Date(Date.now() - 259200000), token: 'USDC', digest: '9Fr2pT...3xKo' },
];

// Exchange rate: 1 USDC = 25,500 VND
const USDC_TO_VND_RATE = 25500;

export function WalletProvider({ children }: { children: ReactNode }) {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { address: authAddress } = useAuth();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [state, setState] = useState<WalletState>({
    isConnected: false,
    walletAddress: null,
    username: null,
    suiBalance: 0,
    usdcBalance: 0,
    balanceVnd: 0,
    transactions: [], // No mock data, only real blockchain transactions
    linkedBanks: [],
    linkedWallets: [],
    defaultAccountId: null,
    defaultAccountType: 'wallet',
    contacts: ['@alice', '@bob'],
    kycStatus: 'unverified',
    isLoadingBalance: false,
    rewardPoints: 1250,
    referralStats: { totalCommission: 15.5, f0Volume: 50000, f0Count: 12 },
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

  useEffect(() => {
    if (!authAddress) return;

    setState(prev => {
      if (prev.walletAddress === authAddress && prev.isConnected) {
        return prev;
      }

      const walletId = 'auth-main';
      const newWallet: LinkedWallet = {
        id: walletId,
        address: authAddress,
        name: 'Main Wallet',
      };

      return {
        ...prev,
        isConnected: true,
        walletAddress: authAddress,
        linkedWallets: [newWallet],
        defaultAccountId: walletId,
        defaultAccountType: 'wallet',
      };
    });
  }, [authAddress]);

  // Auto-refresh balance when account connects or changes
  useEffect(() => {
    const address = currentAccount?.address ?? authAddress;
    if (address) {
      refreshBalance();
    }
  }, [currentAccount?.address, authAddress, refreshBalance]);

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

  // Send USDC Token - Returns the REAL transaction digest
  const sendUsdc = async (toAddress: string, amount: number): Promise<{ success: boolean; digest?: string }> => {
    if (!currentAccount?.address) {
      console.error('No wallet connected');
      return { success: false };
    }

    if (!isValidWalletAddress(toAddress)) {
      console.error('Invalid recipient address');
      return { success: false };
    }

    try {
      // Convert amount to smallest unit using USDC_DECIMALS
      const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));

      // Get user's USDC coins
      const coins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: USDC_COIN_TYPE,
      });

      if (coins.data.length === 0) {
        console.error('No USDC coins found');
        return { success: false };
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

      // Sign and execute with Promise to capture REAL digest
      return new Promise((resolve) => {
        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: (result) => {


              // Add transaction record with REAL digest
              const newTransaction: TransactionRecord = {
                id: result.digest, // Use REAL digest as ID
                type: 'sent',
                to: toAddress.slice(0, 8) + '...' + toAddress.slice(-4),
                amount,
                timestamp: new Date(),
                token: 'USDC',
                digest: result.digest, // Store REAL digest
              };

              setState(prev => ({
                ...prev,
                transactions: [newTransaction, ...prev.transactions],
              }));

              // Refresh balance after sending
              setTimeout(refreshBalance, 2000);

              resolve({ success: true, digest: result.digest });
            },
            onError: (error) => {
              console.error('Transaction Failed:', error);
              resolve({ success: false });
            },
          }
        );
      });
    } catch (error) {
      console.error('Failed to send USDC:', error);
      return { success: false };
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
      rewardPoints: 1250,
      referralStats: { totalCommission: 15.5, f0Volume: 50000, f0Count: 12 },
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

  const lookupBankAccount = (accountNumber: string): HiddenWalletUser | null => {
    for (const user of Object.values(registeredUsers)) {
      if (user.linkedBank?.accountNumber === accountNumber) {
        return user;
      }
    }
    return null;
  };

  const lookupUsername = (username: string): HiddenWalletUser | null => {
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
