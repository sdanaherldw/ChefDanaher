import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';

interface HeaderProps {
  onSettingsClick?: () => void;
  showSettings?: boolean;
}

export function Header({ onSettingsClick, showSettings = true }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">Birdie & Ripsaw's Diner</h1>
        <nav className="header-nav">
          {user && (
            <>
              <span style={{ color: 'var(--color-cream)' }}>
                Welcome, {user.username}
              </span>
              {showSettings && onSettingsClick && (
                <Button variant="ghost" onClick={onSettingsClick}>
                  Settings
                </Button>
              )}
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
