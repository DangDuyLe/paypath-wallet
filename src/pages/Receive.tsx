import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/context/WalletContext';
import { useState } from 'react';
import { Copy, Share2, Check, Settings } from 'lucide-react';

const Receive = () => {
  const navigate = useNavigate();
  const { username, isConnected } = useWallet();
  const [copied, setCopied] = useState(false);

  if (!username) {
    navigate('/onboarding', { replace: true });
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`@${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PayPath',
          text: `Send me money: @${username}`,
          url: `https://paypath.app/@${username}`,
        });
      } catch (err) {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="app-container">
      <div className="page-wrapper">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <h1 className="text-xl font-bold">Receive</h1>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost">Done</button>
        </div>

        {/* QR Code Area */}
        <div className="flex-1 flex flex-col items-center justify-center animate-slide-up">
          {/* QR Placeholder */}
          <div className="w-64 h-64 border-2 border-foreground flex items-center justify-center mb-8">
            <div className="grid grid-cols-8 gap-1 p-4 w-full h-full">
              {Array.from({ length: 64 }).map((_, i) => {
                const hash = (username.charCodeAt(i % username.length) * (i + 1)) % 3;
                return (
                  <div
                    key={i}
                    className={`w-full h-full ${hash === 0 ? 'bg-foreground' : 'bg-transparent'}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Username */}
          <p className="display-medium text-center mb-2">@{username}</p>
          <p className="text-muted-foreground">Your PayPath ID</p>

          {/* Actions */}
          <div className="flex gap-4 mt-8 w-full max-w-xs">
            <button onClick={handleCopy} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={handleShare} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>

        {/* Footer note */}
        <button
          onClick={() => navigate('/settings')}
          className="text-center text-sm text-muted-foreground mt-8 animate-fade-in flex items-center justify-center gap-2 hover:text-foreground transition-colors"
        >
          <Settings className="w-4 h-4" />
          Manage receiving preferences
        </button>
      </div>
    </div>
  );
};

export default Receive;
