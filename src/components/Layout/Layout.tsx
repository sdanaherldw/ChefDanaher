import type { ReactNode } from 'react';
import { Header } from './Header';
import { ToastContainer } from '../UI/Toast';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  onSettingsClick?: () => void;
  onFullMenuClick?: () => void;
  onLogoClick?: () => void;
  showSettings?: boolean;
  showFullMenu?: boolean;
}

export function Layout({
  children,
  showHeader = true,
  onSettingsClick,
  onFullMenuClick,
  onLogoClick,
  showSettings = true,
  showFullMenu = true,
}: LayoutProps) {
  return (
    <div className="app">
      {showHeader && (
        <Header
          onSettingsClick={onSettingsClick}
          onFullMenuClick={onFullMenuClick}
          onLogoClick={onLogoClick}
          showSettings={showSettings}
          showFullMenu={showFullMenu}
        />
      )}
      <main className="main-content">{children}</main>
      <ToastContainer />
    </div>
  );
}
