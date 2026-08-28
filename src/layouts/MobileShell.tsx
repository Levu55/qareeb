import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from '../locales/useTranslation';
import { TopNavbar } from '../components/TopNavbar';
import { useAppStore } from '../store/useAppStore';

export function MobileShell({ children }: { children?: React.ReactNode }) {
  const { language } = useTranslation();
  const location = useLocation();
  const role = useAppStore(state => state.role);
  const isAuthPage = location.pathname.includes('/auth') || !role || role === 'guest';

  return (
    <div 
      className="min-h-screen bg-gray-100 flex justify-center w-full"
      dir={language === 'ur' ? 'rtl' : 'ltr'}
    >
      <div className="w-full md:max-w-full bg-white min-h-screen relative shadow-sm flex flex-col border-x border-gray-200">
        {!isAuthPage && <TopNavbar />}
        <div className="flex-1 overflow-y-auto flex flex-col mx-auto w-full max-w-7xl relative pb-20 md:pb-0">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
}
