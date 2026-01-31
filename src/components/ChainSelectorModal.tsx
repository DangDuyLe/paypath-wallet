import { useWallet } from '@/context/WalletContext';
import { useConnectWallet } from '@mysten/dapp-kit';
import { useConnect } from 'wagmi';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChainSelectorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChainSelected?: (chain: 'SUI' | 'AVAX') => void;
}

export function ChainSelectorModal({ open, onOpenChange, onChainSelected }: ChainSelectorModalProps) {
    const { enableSui, enableAvax, setCurrentChain } = useWallet();
    const { mutate: connectSui } = useConnectWallet();
    const { connect: connectAvax, connectors } = useConnect();

    const handleSuiConnect = () => {
        setCurrentChain('SUI');
        onOpenChange(false);
        onOpenChange(false);
        // Sui wallet modal will be triggered by the dapp-kit ConnectModal
        onChainSelected?.('SUI');
    };

    const handleAvaxConnect = () => {
        setCurrentChain('AVAX');
        onOpenChange(false);
        // Delegate to parent to show Wallet Selector (or auto-handle if needed)
        onChainSelected?.('AVAX');
    };

    // If only one chain is enabled, auto-select
    if (enableSui && !enableAvax) {
        return null; // Use default Sui connect flow
    }
    if (enableAvax && !enableSui) {
        return null; // Use default EVM connect flow
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>Select Network</AlertDialogTitle>
                    <AlertDialogDescription>
                        Choose which blockchain network you want to connect with.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid gap-3 py-4">
                    {enableSui && (
                        <button
                            onClick={handleSuiConnect}
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                        >
                            <img
                                src="https://cryptologos.cc/logos/sui-sui-logo.png"
                                alt="Sui"
                                className="w-8 h-8"
                            />
                            <div>
                                <div className="font-medium">Sui Network</div>
                                <div className="text-sm text-muted-foreground">Connect with Sui Wallet</div>
                            </div>
                        </button>
                    )}

                    {enableAvax && (
                        <button
                            onClick={handleAvaxConnect}
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                        >
                            <img
                                src="https://cryptologos.cc/logos/avalanche-avax-logo.png"
                                alt="Avalanche"
                                className="w-8 h-8"
                            />
                            <div>
                                <div className="font-medium">Avalanche (Fuji)</div>
                                <div className="text-sm text-muted-foreground">Connect with MetaMask</div>
                            </div>
                        </button>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default ChainSelectorModal;
