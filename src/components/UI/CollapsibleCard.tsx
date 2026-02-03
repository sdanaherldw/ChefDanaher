import { useState, useEffect, type ReactNode } from 'react';

interface CollapsibleCardProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleCard({
  id,
  title,
  defaultOpen = true,
  children,
}: CollapsibleCardProps) {
  const storageKey = `collapsible-${id}`;

  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      return stored === 'true';
    }
    return defaultOpen;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(isOpen));
  }, [isOpen, storageKey]);

  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <div className="collapsible-card">
      <button
        type="button"
        className="collapsible-header"
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <h3 className="collapsible-title">{title}</h3>
        <span className={`collapsible-chevron ${isOpen ? 'open' : ''}`}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div className={`collapsible-content ${isOpen ? 'open' : ''}`}>
        <div className="collapsible-inner">{children}</div>
      </div>
    </div>
  );
}
