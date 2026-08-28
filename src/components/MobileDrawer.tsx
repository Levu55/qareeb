import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../locales/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { Home, LayoutGrid, User, Search, Settings, CircleHelp, LogOut, SwitchCamera, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role, userName, logout, login } = useAppStore();

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSwitchRole = () => {
    login(role === 'user' ? 'helper' : 'user', userName || 'User');
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
    onClose();
  };

  const menuItems = [
    { icon: Home, label: t('home') || 'Home', path: role === 'helper' ? '/helper' : '/user' },
    { icon: LayoutGrid, label: 'Services', path: role === 'helper' ? '/helper/services' : '/user/services' },
    { icon: Search, label: t('bookings') || 'Bookings', path: `/${role}/bookings` },
    { icon: User, label: t('profile') || 'Profile', path: `/${role}/profile` },
    { icon: Settings, label: 'Settings', path: `/${role}/profile` },
    { icon: CircleHelp, label: 'Support', path: `/${role}/profile` },
  ];

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 left-0 w-[280px] bg-white z-50 shadow-2xl flex flex-col transition-transform transform">
        <div className="p-6 bg-brand-teal text-white flex flex-col justify-end h-40 relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=FF6B2C&color=fff`} 
            className="w-16 h-16 rounded-full mb-3 shadow-md border-2 border-white" 
            alt="Avatar"
          />
          <h2 className="text-xl font-bold">{userName || 'User'}</h2>
          <p className="text-sm opacity-90 capitalize">{role}</p>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 space-y-1">
            {menuItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-4 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors font-medium"
              >
                <item.icon className="w-5 h-5 text-gray-400" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-8 px-8">
            <div className="h-px bg-gray-100 w-full mb-4"></div>
            
            <button 
              onClick={handleSwitchRole}
              className="w-full flex items-center gap-4 py-3 text-brand-teal font-medium hover:text-brand-teal/80 transition-colors"
            >
              <SwitchCamera className="w-5 h-5" />
              Switch to {role === 'user' ? 'Helper' : 'Customer'}
            </button>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 py-3 text-red-500 font-medium hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
