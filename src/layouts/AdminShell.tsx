import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from '../locales/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { LayoutDashboard, Users, UserCheck, Briefcase, FileWarning, Settings, LogOut } from 'lucide-react';

export function AdminShell() {
  const { language } = useTranslation();
  const { role, logout } = useAppStore();

  if (role !== 'admin' && role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  const menu = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Users & Helpers', icon: Users, path: '/admin/users' },
    { name: 'CNIC Verification', icon: UserCheck, path: '/admin/cnic' },
    { name: 'Jobs', icon: Briefcase, path: '/admin/jobs' },
    { name: 'Disputes', icon: FileWarning, path: '/admin/disputes' },
    { name: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div 
      className="min-h-screen bg-gray-50 flex w-full font-sans"
      dir={language === 'ur' ? 'rtl' : 'ltr'}
    >
      {/* Sidebar */}
      <aside className="w-64 bg-white border-e border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <span className="text-xl font-bold text-brand-orange">Qareeb {role === 'superadmin' && 'Founder'}</span>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {menu.map((item) => (
            <button
              key={item.name}
              onClick={() => window.location.href = item.path}
              className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <item.icon className="h-5 w-5 me-3 text-gray-400" />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="h-5 w-5 me-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8">
           <div className="flex items-center space-x-4 space-x-reverse">
             <div className="w-8 h-8 rounded-full bg-brand-teal text-white flex items-center justify-center font-bold text-sm">
               {role === 'superadmin' ? 'SA' : 'AD'}
             </div>
           </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
