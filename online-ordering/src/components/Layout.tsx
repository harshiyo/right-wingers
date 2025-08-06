import React from 'react';
import TopBar from './ui/TopBar';

interface LayoutProps {
  children: React.ReactNode;
  showLogo?: boolean;
}

export default function Layout({ children, showLogo = false }: LayoutProps) {
  return (
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Subtle accent elements */}
      <div className="pointer-events-none select-none absolute top-0 right-0 z-0 opacity-30">
        <div className="w-96 h-96 bg-gradient-to-br from-red-100 to-orange-100 rounded-full blur-3xl"></div>
      </div>
      <div className="pointer-events-none select-none absolute bottom-0 left-0 z-0 opacity-20">
        <div className="w-80 h-80 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-full blur-3xl"></div>
      </div>
      
      <header className="relative z-10">
        <TopBar showLogo={showLogo} />
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
} 