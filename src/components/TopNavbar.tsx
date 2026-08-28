import { QareebLogo } from './ui/QareebLogo';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../locales/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { Home, Search, MessageCircle, User, LayoutGrid } from 'lucide-react';

export function TopNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const role = useAppStore(state => state.role);
  const userName = useAppStore(state => state.userName);

  const tabs = [
    { name: t('home'), icon: Home, path: role === 'helper' ? '/helper' : '/user' },
    { name: 'Services', icon: LayoutGrid, path: role === 'helper' ? '/helper/services' : '/user/services' },
    { name: t('bookings') || 'Bookings', icon: Search, path: `/${role}/bookings` },
    { name: t('messages') || 'Messages', icon: MessageCircle, path: `/${role}/messages` },
    { name: t('profile') || 'Profile', icon: User, path: `/${role}/profile` },
  ];

  if (!role) return null;

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
    <div className="hidden md:flex w-full bg-white border-b border-gray-100 h-20 items-center justify-between px-8 sticky top-0 z-50 shadow-sm shrink-0">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(role === 'helper' ? '/helper' : '/user')}>
        <QareebLogo className="h-14 md:h-16 w-auto" />
      </div>

      <div className="flex items-center gap-8">
        {tabs.map((tab, idx) => {
          const isActive = location.pathname === tab.path || (tab.path.includes('/user') && location.pathname === '/user' && tab.name === t('home'));
          return (
            <button
              key={idx}
              onClick={() => handleNav(tab.path)}
              className={cn(
                "flex items-center gap-2 font-medium transition-colors hover:text-brand-orange",
                isActive ? "text-brand-orange" : "text-gray-500"
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {role === 'user' && (
          <button 
            onClick={() => navigate('/user/post')}
            className="bg-brand-orange text-white px-5 py-2.5 rounded-full font-semibold hover:bg-orange-600 transition-colors shadow-sm shadow-brand-orange/20"
          >
            Post a Job
          </button>
        )}
        <div className="flex items-center gap-3 cursor-pointer pl-4 border-l border-gray-200" onClick={() => navigate(`/${role}/profile`)}>
          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-gray-900">{userName || 'User'}</p>
            <p className="text-xs text-gray-500 capitalize">{role}</p>
          </div>
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'User')}&background=FF6B2C&color=fff`} className="w-10 h-10 rounded-full shadow-sm" />
        </div>
      </div>
    </div>
  );
}
