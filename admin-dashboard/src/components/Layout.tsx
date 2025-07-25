import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const Layout = () => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <TopBar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-gray-50 to-white relative">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, rgba(59, 130, 246, 0.3) 2px, transparent 0)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>
          
          <div className="relative z-10 container mx-auto px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}; 