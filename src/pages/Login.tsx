import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

const Login = () => {
  const navigate = useNavigate();
  const { connectWallet, username } = useWallet();
  const { accessToken, isAuthenticating, error, loginWithWallet, loginWithZkLogin, completeZkLoginWithIdToken } =
    useAuth();
  const currentAccount = useCurrentAccount();
  const [hasClickedConnect, setHasClickedConnect] = useState(false);
  const [didAttemptAuth, setDidAttemptAuth] = useState(false);
  const didConsumeZkLoginIdTokenRef = useRef(false);

  useEffect(() => {
    if (currentAccount && hasClickedConnect) {
      connectWallet(currentAccount.address);
    }
  }, [currentAccount, hasClickedConnect, connectWallet]);

  useEffect(() => {
    const run = async () => {
      if (
        currentAccount?.address &&
        hasClickedConnect &&
        !accessToken &&
        !isAuthenticating &&
        !didAttemptAuth
      ) {
        setDidAttemptAuth(true);
        try {
          await loginWithWallet();
        } catch {
          // error is exposed via AuthContext
        }
      }
    };

    run();
  }, [
    currentAccount?.address,
    hasClickedConnect,
    accessToken,
    isAuthenticating,
    didAttemptAuth,
    loginWithWallet,
  ]);

  useEffect(() => {
    if (!accessToken) return;

    const nextPath = username ? '/dashboard' : '/onboarding';

    if (window.location.pathname === nextPath) {
      return;
    }

    navigate(nextPath, { replace: true });
  }, [accessToken, username, navigate]);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;

    const hashSp = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const searchSp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

    const idToken = hashSp.get('id_token') || searchSp.get('id_token');
    const errorParam = hashSp.get('error') || searchSp.get('error');
    const errorDescription = hashSp.get('error_description') || searchSp.get('error_description');

    if (!idToken && !errorParam) {
      return;
    }

    console.log('[zklogin] callback params', {
      hasIdToken: Boolean(idToken),
      error: errorParam,
      errorDescription,
    });

    if (errorParam) {
      window.history.replaceState(null, '', window.location.pathname);
      sessionStorage.removeItem('paypath.zklogin.consumedIdToken');
      return;
    }

    if (idToken) {
      if (didConsumeZkLoginIdTokenRef.current) {
        return;
      }

      didConsumeZkLoginIdTokenRef.current = true;

      if (!accessToken && !isAuthenticating) {
        console.log('[zklogin] calling completeZkLoginWithIdToken', {
          idTokenLen: idToken.length,
          isAuthenticating,
        });

        (async () => {
          try {
            await completeZkLoginWithIdToken(idToken);
            console.log('[zklogin] completeZkLoginWithIdToken done');
            window.history.replaceState(null, '', window.location.pathname);
          } catch (e) {
            console.error('[zklogin] completeZkLoginWithIdToken error', e);
            window.history.replaceState(null, '', window.location.pathname);
            sessionStorage.removeItem('paypath.zklogin.consumedIdToken');
          }
        })();
      }
    }
  }, [accessToken, isAuthenticating, completeZkLoginWithIdToken, navigate]);

  const handleConnectClick = () => {
    setHasClickedConnect(true);
  };

  const handleRetryAuth = async () => {
    setDidAttemptAuth(false);
  };

  return (
    <div className="app-container">
      <div className="page-wrapper justify-between">
        <div className="pt-20" />

        <div className="text-center animate-fade-in">
          <h1 className="display-large mb-4">PayPath</h1>
          <p className="text-muted-foreground text-lg">Send money instantly</p>
        </div>

        <div className="space-y-4 animate-slide-up pb-8">
          <div onClick={handleConnectClick}>
            <div className="sui-connect-wrapper">
              <ConnectButton />
            </div>
          </div>

<div className="flex justify-center">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await loginWithZkLogin();
                } catch {
                  // error handled by context
                }
              }}
              disabled={isAuthenticating}
            >
              Continue with Google (zkLogin)
            </Button>
          </div>
          {hasClickedConnect && (isAuthenticating || error) && (
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                {isAuthenticating ? 'Authenticating…' : error}
              </p>

              {!isAuthenticating && error && (
                <div className="flex justify-center">
                  <Button variant="secondary" size="sm" onClick={handleRetryAuth}>
                    Authenticate again
                  </Button>
                </div>
              )}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">Powered by Sui Blockchain</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
