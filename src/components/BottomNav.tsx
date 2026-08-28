import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, LayoutGrid, User } from 'lucide-react';
import { useTranslation } from '../locales/useTranslation';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const role = useAppStore(state => state.role);

  const tabs = [
    { name: t('home'), icon: Home, path: role === 'helper' ? '/helper' : '/user' },
    { name: 'Services', icon: LayoutGrid, path: role === 'helper' ? '/helper/services' : '/user/services' },
    { name: 'post', icon: null, path: '/user/post' }, // Center action
    { name: t('bookings') || 'Bookings', icon: Search, path: `/${role}/bookings` },
    { name: t('profile') || 'Profile', icon: User, path: `/${role}/profile` },
  ];

  const handleNav = (path: string) => {
    if (path.includes('#')) {
      const [route, hash] = path.split('#');
      if (location.pathname === route) {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(route);
        setTimeout(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      navigate(path);
    }
  };

  return (
    <div className="md:hidden absolute bottom-0 left-0 right-0 h-20 bg-white border-t border-gray-100 flex items-center justify-around px-2 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      {tabs.map((tab, idx) => {
        if (tab.name === 'post') {
          return role === 'user' ? (
            <button
              key="post"
              onClick={() => handleNav(tab.path)}
              className="relative -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange text-white shadow-lg shadow-brand-orange/30 hover:scale-105 transition-transform shrink-0"
            >
              <Search className="h-6 w-6" />
            </button>
          ) : (
            <div key="spacer" className="w-14 shrink-0" /> // Empty space for helper
          );
        }

        const isActive = location.pathname === tab.path || (tab.path.includes('/user') && location.pathname === '/user' && tab.name === t('home'));
        const Icon = tab.icon!;
        
        return (
          <button
            key={idx}
            onClick={() => handleNav(tab.path)}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors",
              isActive ? "text-brand-orange" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-[10px] font-medium truncate w-full text-center">{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
}
