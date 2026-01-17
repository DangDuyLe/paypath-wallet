import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ScanLine, History } from 'lucide-react';

const MobileBottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path: string) => location.pathname === path;

    // Only show on dashboard (home) page
    if (location.pathname !== '/dashboard') {
        return null;
    }

    return (
        <nav className="mobile-bottom-nav">
            {/* Home */}
            <button
                onClick={() => navigate('/dashboard')}
                className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
            >
                <Home className="nav-icon" />
                <span className="nav-label">Home</span>
            </button>

            {/* Scan QR - Center button */}
            <button
                onClick={() => navigate('/send')}
                className="nav-item-center"
            >
                <div className="scan-btn">
                    <ScanLine className="w-5 h-5" />
                </div>
                <span className="nav-label">Scan</span>
            </button>

            {/* History */}
            <button
                onClick={() => navigate('/dashboard')}
                className={`nav-item ${isActive('/history') ? 'active' : ''}`}
            >
                <History className="nav-icon" />
                <span className="nav-label">History</span>
            </button>
        </nav>
    );
};

export default MobileBottomNav;
