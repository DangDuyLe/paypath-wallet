import { createNetworkConfig, SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { avalancheFuji, avalanche } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import '@mysten/dapp-kit/dist/index.css';

// Environment variables for chain configuration
const ENABLE_SUI = import.meta.env.VITE_ENABLE_SUI !== '0';
const ENABLE_AVAX = import.meta.env.VITE_ENABLE_AVAX === '1';
const AVAX_CHAIN_ID = parseInt(import.meta.env.VITE_AVAX_CHAIN_ID || '43113', 10);
const AVAX_RPC_URL = import.meta.env.VITE_AVAX_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Sui network config
const { networkConfig } = createNetworkConfig({
    localnet: { url: getFullnodeUrl('localnet') },
    devnet: { url: getFullnodeUrl('devnet') },
    testnet: { url: getFullnodeUrl('testnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
});

// Determine Avalanche chain based on env
const avaxChain = AVAX_CHAIN_ID === 43114 ? avalanche : avalancheFuji;

// Wagmi config for EVM chains
// Note: Using injected() instead of metaMask() to avoid MetaMask SDK auto-initialization
// When AVAX is disabled, connectors will be empty so no wallet can connect
const wagmiConfig = createConfig({
    chains: [avaxChain],
    connectors: ENABLE_AVAX ? [
        injected(),
        ...(WALLETCONNECT_PROJECT_ID ? [walletConnect({
            projectId: WALLETCONNECT_PROJECT_ID,
            showQrModal: true,
            metadata: {
                name: 'HiddenPay',
                description: 'HiddenPay DApp',
                url: 'https://hiddenpay.app',
                icons: ['https://avatars.githubusercontent.com/u/37784886']
            }
        })] : []),
    ] : [],
    transports: {
        [avalancheFuji.id]: http(AVAX_RPC_URL),
        [avalanche.id]: http(AVAX_RPC_URL),
    },
});

// Shared QueryClient for both Sui and Wagmi
const queryClient = new QueryClient();

interface Web3ProviderProps {
    children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
                    <SuiWalletProvider autoConnect={ENABLE_SUI}>
                        {children}
                    </SuiWalletProvider>
                </SuiClientProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

// Export wagmi config for external use if needed
export { wagmiConfig };
