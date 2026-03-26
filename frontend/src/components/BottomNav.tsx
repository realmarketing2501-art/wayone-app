import React from 'react';
import { Home, TrendingUp, Users, DollarSign, User } from 'lucide-react';
import { Page } from '../types';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; icon: React.ReactNode; label: string }[] = [
  { page: 'home', icon: <Home size={20} />, label: 'Home' },
  { page: 'invest', icon: <TrendingUp size={20} />, label: 'Invest' },
  { page: 'network', icon: <Users size={20} />, label: 'Rete' },
  { page: 'income', icon: <DollarSign size={20} />, label: 'Income' },
  { page: 'profile', icon: <User size={20} />, label: 'Me' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-base-200 border-t border-base-300 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                isActive ? 'text-primary' : 'text-base-content/50 hover:text-base-content/80'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
