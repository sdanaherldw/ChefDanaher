import { useAuth } from '../../context/AuthContext';
import { Button } from '../UI/Button';

export function Header() {
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
