import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
// Wagmi hooks for EVM
import { useAccount as useWagmiAccount, useWriteContract, useConnect, useDisconnect, useReadContract, useBalance as useWagmiBalance } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

// Chain type
export type ChainType = 'SUI' | 'AVAX' | null;

// Environment variables
const ENABLE_SUI = import.meta.env.VITE_ENABLE_SUI !== '0';
const ENABLE_AVAX = import.meta.env.VITE_ENABLE_AVAX === '1';

// Testnet USDC via Aftermath Faucet (Sui)
const USDC_COIN_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
const USDC_DECIMALS = 6;

// Avalanche Fuji USDC contract
const AVAX_USDC_CONTRACT = (import.meta.env.VITE_AVAX_USDC_CONTRACT || '0x5425890298aed601595a70AB815c96711a31Bc65') as `0x${string}`;
const AVAX_USDC_DECIMALS = 6;

// ERC20 ABI for transfer function
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

interface TransactionRecord {
  id: string;
  type: 'sent' | 'received';
  to?: string;
  from?: string;
  amount: number;
  timestamp: Date;
  token: 'SUI' | 'USDC';
  digest?: string;
}

export interface CoinBalance {
  coinType: string;
  totalBalance: number;
  rawBalance: string;
  symbol: string;
  decimals: number;
  iconUrl?: string | null;
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
  username: string | null;
  suiBalance: number;
  usdcBalance: number;
  balanceVnd: number;
  transactions: TransactionRecord[];
  linkedBanks: LinkedBank[];
  linkedWallets: LinkedWallet[];
  defaultAccountId: string | null;
  defaultAccountType: DefaultAccountType;
  defaultWalletAddress: string | null;
  contacts: string[];
  kycStatus: KYCStatus;
  isLoadingBalance: boolean;
  isProfileLoading: boolean;
  rewardPoints: number;
  referralStats: ReferralStats;
  coins: CoinBalance[];
  currentChain: ChainType;
}

type WalletContextType = WalletState & {
  isConnected: boolean;
  walletAddress: string | null;
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
  refreshBalance: (address?: string) => Promise<void>;
  isValidWalletAddress: (address: string) => boolean;
  setCurrentChain: (chain: ChainType) => void;
  enableSui: boolean;
  enableAvax: boolean;
  nativeBalance: number;
  nativeSymbol: string;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Exchange rate: 1 USDC = 25,500 VND
const USDC_TO_VND_RATE = 25500;

export function WalletProvider({ children }: { children: ReactNode }) {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Wagmi hooks
  const wagmiAccount = useWagmiAccount();
  // Read USDC balance using ERC20 balanceOf
  const { data: avaxUsdcBalanceRaw, refetch: refetchAvaxBalance } = useReadContract({
    address: AVAX_USDC_CONTRACT,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: wagmiAccount.address ? [wagmiAccount.address] : undefined,
    query: { enabled: !!wagmiAccount.address },
  });
  const { writeContractAsync } = useWriteContract();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { connect: wagmiConnect, connectors } = useConnect();

  // Native AVAX balance
  const { data: avaxNativeBalance, refetch: refetchAvaxNativeBalance } = useWagmiBalance({
    address: wagmiAccount.address,
  });

  const [state, setState] = useState<WalletState>({
    username: null,
    suiBalance: 0,
    usdcBalance: 0,
    balanceVnd: 0,
    transactions: [],
    linkedBanks: [],
    linkedWallets: [],
    defaultAccountId: null,
    defaultAccountType: 'wallet',
    defaultWalletAddress: null,
    contacts: ['@alice', '@bob'],
    kycStatus: 'unverified',
    isLoadingBalance: false,
    isProfileLoading: false,
    rewardPoints: 0,
    referralStats: { totalCommission: 0, f0Volume: 0, f0Count: 0 },
    coins: [],
    currentChain: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Auto-detect chain based on connected wallet
  useEffect(() => {
    const isSuiConnected = !!currentAccount?.address;
    const isEvmConnected = wagmiAccount.isConnected;

    // Priority: If only one chain is enabled, use that
    if (ENABLE_AVAX && !ENABLE_SUI && isEvmConnected) {
      setState(prev => {
        if (prev.currentChain !== 'AVAX') {
          return { ...prev, currentChain: 'AVAX' };
        }
        return prev;
      });
      return;
    }

    if (ENABLE_SUI && !ENABLE_AVAX && isSuiConnected) {
      setState(prev => {
        if (prev.currentChain !== 'SUI') {
          return { ...prev, currentChain: 'SUI' };
        }
        return prev;
      });
      return;
    }

    // Both enabled: detect based on what's connected
    if (isEvmConnected && !isSuiConnected) {
      setState(prev => {
        if (prev.currentChain !== 'AVAX') {
          return { ...prev, currentChain: 'AVAX' };
        }
        return prev;
      });
    } else if (isSuiConnected && !isEvmConnected) {
      setState(prev => {
        if (prev.currentChain !== 'SUI') {
          return { ...prev, currentChain: 'SUI' };
        }
        return prev;
      });
    } else if (isSuiConnected && isEvmConnected) {
      // Both connected - keep existing or default to what's enabled
      setState(prev => {
        if (!prev.currentChain) {
          return { ...prev, currentChain: ENABLE_SUI ? 'SUI' : 'AVAX' };
        }
        return prev;
      });
    } else {
      // Nothing connected
      setState(prev => {
        if (prev.currentChain !== null) {
          return { ...prev, currentChain: null };
        }
        return prev;
      });
    }
  }, [currentAccount?.address, wagmiAccount.isConnected]);

  // Fetch REAL balances and transactions from blockchain (Sui)
  const fetchTransactions = useCallback(async (address: string): Promise<TransactionRecord[]> => {
    try {
      const sentTxs = await suiClient.queryTransactionBlocks({
        filter: { FromAddress: address },
        options: { showInput: true, showEffects: true, showBalanceChanges: true },
        limit: 15,
        order: 'descending',
      });

      const receivedTxs = await suiClient.queryTransactionBlocks({
        filter: { ToAddress: address },
        options: { showInput: true, showEffects: true, showBalanceChanges: true },
        limit: 15,
        order: 'descending',
      });

      const allTxMap = new Map<string, typeof sentTxs.data[0]>();
      for (const tx of [...sentTxs.data, ...receivedTxs.data]) {
        if (!allTxMap.has(tx.digest)) {
          allTxMap.set(tx.digest, tx);
        }
      }

      const transactions: TransactionRecord[] = [];

      for (const tx of allTxMap.values()) {
        const balanceChanges = tx.balanceChanges || [];

        for (const change of balanceChanges) {
          if (change.coinType !== USDC_COIN_TYPE) continue;
          if (!change.owner || typeof change.owner !== 'object' || !('AddressOwner' in change.owner)) continue;

          const ownerAddr = change.owner.AddressOwner;
          const rawAmount = Number(change.amount);
          const absAmount = Math.abs(rawAmount) / Math.pow(10, USDC_DECIMALS);

          if (absAmount < 0.000001) continue;

          if (ownerAddr === address) {
            if (rawAmount < 0) {
              let recipientAddr = 'Contract';
              for (const otherChange of balanceChanges) {
                if (otherChange.coinType !== USDC_COIN_TYPE) continue;
                if (!otherChange.owner || typeof otherChange.owner !== 'object' || !('AddressOwner' in otherChange.owner)) continue;

                const otherOwner = otherChange.owner.AddressOwner;
                const otherAmount = Number(otherChange.amount);

                if (otherOwner !== address && otherAmount > 0) {
                  recipientAddr = otherOwner.slice(0, 6) + '...' + otherOwner.slice(-4);
                  break;
                }
              }

              transactions.push({
                id: tx.digest + '_sent',
                type: 'sent',
                to: recipientAddr,
                amount: absAmount,
                timestamp: new Date(Number(tx.timestampMs)),
                token: 'USDC',
                digest: tx.digest,
              });
            } else if (rawAmount > 0) {
              let senderAddr = 'External';
              for (const otherChange of balanceChanges) {
                if (otherChange.coinType !== USDC_COIN_TYPE) continue;
                if (!otherChange.owner || typeof otherChange.owner !== 'object' || !('AddressOwner' in otherChange.owner)) continue;

                const otherOwner = otherChange.owner.AddressOwner;
                const otherAmount = Number(otherChange.amount);

                if (otherOwner !== address && otherAmount < 0) {
                  senderAddr = otherOwner.slice(0, 6) + '...' + otherOwner.slice(-4);
                  break;
                }
              }

              transactions.push({
                id: tx.digest + '_received',
                type: 'received',
                from: senderAddr,
                amount: absAmount,
                timestamp: new Date(Number(tx.timestampMs)),
                token: 'USDC',
                digest: tx.digest,
              });
            }
          }
        }
      }

      const seenDigests = new Set<string>();
      const uniqueTransactions = transactions.filter(tx => {
        const key = tx.digest + '_' + tx.type;
        if (seenDigests.has(key)) return false;
        seenDigests.add(key);
        return true;
      });

      uniqueTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return uniqueTransactions.slice(0, 20);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  }, [suiClient]);

  // Fetch AVAX transactions using Snowtrace API (indexed, fast, full history)
  const fetchAvaxTransactions = useCallback(async (address: string): Promise<TransactionRecord[]> => {
    if (!address) return [];

    try {
      // Use Snowtrace API for Fuji testnet - provides full indexed history
      const apiUrl = `https://api-testnet.snowtrace.io/api?module=account&action=tokentx&contractaddress=${AVAX_USDC_CONTRACT}&address=${address}&page=1&offset=50&sort=desc`;

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (data.status !== '1' || !data.result) {
        console.warn('Snowtrace API returned no results:', data.message);
        return [];
      }

      const transactions: TransactionRecord[] = data.result.map((tx: any) => {
        const isSent = tx.from.toLowerCase() === address.toLowerCase();
        const amount = parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal) || AVAX_USDC_DECIMALS);
        const counterparty = isSent ? tx.to : tx.from;

        return {
          id: tx.hash + (isSent ? '_sent' : '_received'),
          type: isSent ? 'sent' : 'received',
          ...(isSent
            ? { to: counterparty.slice(0, 6) + '...' + counterparty.slice(-4) }
            : { from: counterparty.slice(0, 6) + '...' + counterparty.slice(-4) }
          ),
          amount,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          token: tx.tokenSymbol || 'USDC',
          digest: tx.hash,
        };
      });

      return transactions.slice(0, 20);
    } catch (error) {
      console.error('Failed to fetch AVAX transactions:', error);
      return [];
    }
  }, []);

  // Fetch REAL balances from blockchain
  const refreshBalance = useCallback(async (forcedAddress?: string) => {
    const currentState = stateRef.current;

    // For AVAX chain, refresh EVM balance
    if (currentState.currentChain === 'AVAX' && wagmiAccount.address) {
      setState(prev => ({ ...prev, isLoadingBalance: true }));
      try {
        // Refetch both USDC and native AVAX balances
        const [usdcResult, nativeResult] = await Promise.all([
          refetchAvaxBalance(),
          refetchAvaxNativeBalance(),
        ]);

        const usdcBalance = usdcResult.data ? Number(usdcResult.data) / Math.pow(10, AVAX_USDC_DECIMALS) : 0;
        const nativeAvax = nativeResult.data ? Number(nativeResult.data.value) / Math.pow(10, 18) : 0;

        // Build coins array with USDC first, then AVAX native
        const avaxCoins: CoinBalance[] = [];

        // Always add USDC first (main token)
        if (usdcBalance > 0) {
          avaxCoins.push({
            coinType: 'AVAX_USDC',
            totalBalance: usdcBalance,
            rawBalance: avaxUsdcBalanceRaw?.toString() || '0',
            symbol: 'USDC',
            decimals: AVAX_USDC_DECIMALS,
            iconUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
          });
        }

        // Add native AVAX
        if (nativeAvax > 0) {
          avaxCoins.push({
            coinType: 'AVAX_NATIVE',
            totalBalance: nativeAvax,
            rawBalance: avaxNativeBalance?.value.toString() || '0',
            symbol: 'AVAX',
            decimals: 18,
            iconUrl: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
          });
        }

        setState(prev => ({
          ...prev,
          usdcBalance,
          suiBalance: nativeAvax, // Reuse suiBalance for native (for gas checks)
          balanceVnd: usdcBalance * USDC_TO_VND_RATE,
          isLoadingBalance: false,
          coins: avaxCoins,
        }));

        // Fetch AVAX transactions
        fetchAvaxTransactions(wagmiAccount.address).then(txHistory => {
          setState(prev => ({ ...prev, transactions: txHistory }));
        }).catch(err => console.warn('Failed to fetch AVAX transactions:', err));
      } catch (error) {
        console.error('Failed to fetch AVAX balance:', error);
        setState(prev => ({ ...prev, isLoadingBalance: false }));
      }
      return;
    }

    // SUI chain balance logic
    let targetAddress = forcedAddress;

    if (!targetAddress) {
      const currentAddress = currentAccount?.address;

      if (currentState.defaultAccountType === 'wallet' && currentState.defaultAccountId) {
        const defaultWallet = currentState.linkedWallets.find(w => w.id === currentState.defaultAccountId);
        if (defaultWallet) {
          targetAddress = defaultWallet.address;
        }
      }

      if (!targetAddress) {
        targetAddress = currentAddress;
      }
    }

    if (!targetAddress) return;

    setState(prev => ({ ...prev, isLoadingBalance: true }));

    try {
      const allBalances = await suiClient.getAllBalances({
        owner: targetAddress,
      });

      const nonZeroCoins = allBalances.filter(c => Number(c.totalBalance) > 0);

      const coinDataPromises = nonZeroCoins.map(async (coin) => {
        let decimals = 9;
        let symbol = 'UNKNOWN';
        let iconUrl: string | null = null;

        if (coin.coinType.includes('::sui::SUI')) {
          decimals = 9;
          symbol = 'SUI';
          iconUrl = 'https://cryptologos.cc/logos/sui-sui-logo.png';
        } else if (coin.coinType.includes('::usdc::USDC') || coin.coinType === USDC_COIN_TYPE) {
          decimals = USDC_DECIMALS;
          symbol = 'USDC';
          iconUrl = 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png';
        } else {
          try {
            const metadata = await suiClient.getCoinMetadata({ coinType: coin.coinType });
            if (metadata) {
              decimals = metadata.decimals;
              symbol = metadata.symbol;
              iconUrl = metadata.iconUrl || null;
            }
          } catch (e) {
            console.warn(`Failed to fetch metadata for ${coin.coinType}`, e);
          }
        }

        const normalizedBalance = Number(coin.totalBalance) / Math.pow(10, decimals);

        return {
          coinType: coin.coinType,
          totalBalance: normalizedBalance,
          rawBalance: coin.totalBalance,
          symbol,
          decimals,
          iconUrl,
        } as CoinBalance;
      });

      const coinList = await Promise.all(coinDataPromises);

      let newSuiBalance = 0;
      let newUsdcBalance = 0;
      for (const coin of coinList) {
        if (coin.coinType.endsWith('::sui::SUI')) {
          newSuiBalance = coin.totalBalance;
        } else if (coin.coinType.includes(USDC_COIN_TYPE) || coin.symbol === 'USDC') {
          newUsdcBalance = coin.totalBalance;
        }
      }

      coinList.sort((a, b) => {
        if (a.symbol === 'USDC') return -1;
        if (b.symbol === 'USDC') return 1;
        if (a.symbol === 'SUI') return -1;
        if (b.symbol === 'SUI') return 1;
        return b.totalBalance - a.totalBalance;
      });

      setState(prev => ({
        ...prev,
        suiBalance: newSuiBalance,
        usdcBalance: newUsdcBalance,
        coins: coinList,
        balanceVnd: newUsdcBalance * USDC_TO_VND_RATE,
        isLoadingBalance: false,
      }));

      fetchTransactions(targetAddress).then(txHistory => {
        setState(prev => ({ ...prev, transactions: txHistory }));
      }).catch(err => console.warn('Failed to fetch transactions:', err));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setState(prev => ({ ...prev, isLoadingBalance: false }));
    }
  }, [currentAccount?.address, fetchTransactions, suiClient, wagmiAccount.address, avaxUsdcBalanceRaw, refetchAvaxBalance]);

  // Auto-refresh balance when account connects or changes
  useEffect(() => {
    refreshBalance();
  }, [currentAccount?.address, wagmiAccount.address, refreshBalance, state.defaultAccountId, state.defaultAccountType, state.linkedWallets, state.currentChain]);

  useEffect(() => {
    setState((prev) => ({ ...prev, isProfileLoading: false }));
  }, []);

  // Validate wallet address format - supports both SUI and EVM
  const isValidWalletAddress = useCallback((address: string): boolean => {
    // EVM address: 0x followed by 40 hex chars (42 total)
    const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
    // SUI address: 0x followed by 64 hex chars (66 total)
    const isSuiAddress = /^0x[a-fA-F0-9]{64}$/.test(address);

    // Validate based on current chain
    if (state.currentChain === 'AVAX') {
      return isEvmAddress;
    } else if (state.currentChain === 'SUI') {
      return isSuiAddress;
    }

    // If no chain selected, accept either format
    return isEvmAddress || isSuiAddress;
  }, [state.currentChain]);

  // Unified wallet address
  const walletAddress = state.currentChain === 'AVAX'
    ? wagmiAccount.address ?? null
    : currentAccount?.address ?? null;

  // Unified isConnected
  const isConnected = state.currentChain === 'AVAX'
    ? wagmiAccount.isConnected
    : Boolean(currentAccount?.address);

  const setUsername = (username: string) => {
    setState(prev => ({ ...prev, username }));
  };

  const setCurrentChain = (chain: ChainType) => {
    setState(prev => ({ ...prev, currentChain: chain }));
  };

  // Send USDC Token - Multi-chain support
  const sendUsdc = async (toAddress: string, amount: number): Promise<{ success: boolean; digest?: string }> => {
    // AVAX Chain - ERC20 Transfer
    if (state.currentChain === 'AVAX') {
      if (!wagmiAccount.address) {
        console.error('No AVAX wallet connected');
        return { success: false };
      }

      if (!isValidWalletAddress(toAddress)) {
        console.error('Invalid recipient address for AVAX');
        return { success: false };
      }

      try {
        const amountInUnits = parseUnits(amount.toString(), AVAX_USDC_DECIMALS);

        const hash = await writeContractAsync({
          address: AVAX_USDC_CONTRACT,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [toAddress as `0x${string}`, amountInUnits],
          account: wagmiAccount.address,
          chain: wagmiAccount.chain,
        });

        const newTransaction: TransactionRecord = {
          id: hash,
          type: 'sent',
          to: toAddress.slice(0, 8) + '...' + toAddress.slice(-4),
          amount,
          timestamp: new Date(),
          token: 'USDC',
          digest: hash,
        };

        setState(prev => ({
          ...prev,
          transactions: [newTransaction, ...prev.transactions],
        }));

        setTimeout(() => refetchAvaxBalance(), 2000);

        return { success: true, digest: hash };
      } catch (error) {
        console.error('Failed to send USDC on AVAX:', error);
        return { success: false };
      }
    }

    // SUI Chain - Original logic
    if (!currentAccount?.address) {
      console.error('No wallet connected');
      return { success: false };
    }

    if (!isValidWalletAddress(toAddress)) {
      console.error('Invalid recipient address');
      return { success: false };
    }

    try {
      const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, USDC_DECIMALS)));

      const coins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: USDC_COIN_TYPE,
      });

      if (coins.data.length === 0) {
        console.error('No USDC coins found');
        return { success: false };
      }

      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));

      if (totalBalance < amountInSmallestUnit) {
        console.error(`Insufficient balance. Required: ${amountInSmallestUnit}, Available: ${totalBalance}`);
        return { success: false };
      }

      const tx = new Transaction();

      const primaryCoin = coins.data[0];
      const restCoins = coins.data.slice(1);

      if (restCoins.length > 0) {
        tx.mergeCoins(
          tx.object(primaryCoin.coinObjectId),
          restCoins.map(coin => tx.object(coin.coinObjectId))
        );
      }

      const [coinToSend] = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [
        tx.pure.u64(amountInSmallestUnit),
      ]);

      tx.transferObjects([coinToSend], tx.pure.address(toAddress));

      return new Promise((resolve) => {
        signAndExecute(
          {
            transaction: tx,
          },
          {
            onSuccess: (result) => {
              const newTransaction: TransactionRecord = {
                id: result.digest,
                type: 'sent',
                to: toAddress.slice(0, 8) + '...' + toAddress.slice(-4),
                amount,
                timestamp: new Date(),
                token: 'USDC',
                digest: result.digest,
              };

              setState(prev => ({
                ...prev,
                transactions: [newTransaction, ...prev.transactions],
              }));

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
    // Disconnect Wagmi if connected
    if (wagmiAccount.isConnected) {
      wagmiDisconnect();
    }

    setState({
      username: null,
      suiBalance: 0,
      usdcBalance: 0,
      balanceVnd: 0,
      transactions: [],
      linkedBanks: [],
      linkedWallets: [],
      defaultAccountId: null,
      defaultAccountType: 'wallet',
      defaultWalletAddress: null,
      contacts: ['@alice', '@bob'],
      kycStatus: 'unverified',
      isLoadingBalance: false,
      isProfileLoading: false,
      rewardPoints: 0,
      referralStats: { totalCommission: 0, f0Volume: 0, f0Count: 0 },
      coins: [],
      currentChain: null,
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
    <WalletContext.Provider
      value={{
        ...state,
        isConnected,
        walletAddress,
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
        setCurrentChain,
        enableSui: ENABLE_SUI,
        enableAvax: ENABLE_AVAX,
        nativeBalance: state.currentChain === 'AVAX'
          ? (avaxNativeBalance ? Number(formatUnits(avaxNativeBalance.value, avaxNativeBalance.decimals)) : 0)
          : state.suiBalance,
        nativeSymbol: state.currentChain === 'AVAX' ? 'AVAX' : 'SUI',
      }}
    >
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
