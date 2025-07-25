import React from 'react';
import TopBar from './ui/TopBar';

interface LayoutProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

export default function Layout({ children, showLogo = false }: LayoutProps) {
  return (
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-br from-[#fff5ea] via-[#fffbe6] to-[#fff6f0]">
      {/* Blurred pizza accent */}
      <div className="pointer-events-none select-none absolute bottom-0 right-0 z-0 opacity-60" style={{filter:'blur(8px)'}}>
        <svg width="320" height="320" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="160" cy="160" rx="140" ry="90" fill="#ffe5b4" fillOpacity="0.5" />
          <ellipse cx="200" cy="200" rx="60" ry="40" fill="#ffd6a0" fillOpacity="0.4" />
          <path d="M80 220 Q160 100 240 220" stroke="#ffb347" strokeWidth="18" fill="none" opacity="0.18" />
          <circle cx="160" cy="170" r="18" fill="#ffb347" fillOpacity="0.18" />
        </svg>
      </div>
      <header className="relative z-10">
        <TopBar showLogo={showLogo} />
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
} 