import type { ReactNode } from 'react';
import { Header } from './Header';
import { ToastContainer } from '../UI/Toast';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  onSettingsClick?: () => void;
  showSettingsButton?: boolean;
}

export function Layout({ children, showHeader = true, onSettingsClick, showSettingsButton = true }: LayoutProps) {
  return (
    <div className="app">
      {showHeader && <Header onSettingsClick={onSettingsClick} showSettings={showSettingsButton} />}
      <main className="main-content">{children}</main>
      <ToastContainer />
    </div>
  );
}
