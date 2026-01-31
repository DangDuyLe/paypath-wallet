import { useConnect } from 'wagmi';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Wallet } from 'lucide-react';

interface WalletSelectorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WalletSelectorModal({ open, onOpenChange }: WalletSelectorModalProps) {
    const { connect, connectors } = useConnect();

    const handleConnect = (connectorId: string) => {
        const connector = connectors.find((c) => c.id === connectorId);
        if (connector) {
            connect({ connector });
            onOpenChange(false);
        }
    };

    const injectedConnector = connectors.find((c) => c.id === 'injected' || c.id === 'metaMask');
    const walletConnectConnector = connectors.find((c) => c.id === 'walletConnect');

    if (!open) return null;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>Connect Wallet</AlertDialogTitle>
                    <AlertDialogDescription>
                        Choose a wallet to connect to Avalanche.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid gap-3 py-4">
                    {injectedConnector && (
                        <button
                            onClick={() => handleConnect(injectedConnector.id)}
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                                    alt="MetaMask"
                                    className="w-6 h-6"
                                />
                            </div>
                            <div>
                                <div className="font-medium">MetaMask / Injected</div>
                                <div className="text-sm text-muted-foreground">Browser wallet</div>
                            </div>
                        </button>
                    )}

                    {walletConnectConnector && (
                        <button
                            onClick={() => handleConnect(walletConnectConnector.id)}
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                        >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Wallet className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="font-medium">WalletConnect</div>
                                <div className="text-sm text-muted-foreground">Mobile & Remote</div>
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

export default WalletSelectorModal;
