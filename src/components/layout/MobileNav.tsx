import React from 'react';
import { LayoutDashboard, Users, Bus, Grid, MoreHorizontal } from 'lucide-react';
import { MainNavId } from './Sidebar';

interface MobileNavProps {
  activeTab: MainNavId;
  onSelectTab: (tab: MainNavId) => void;
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMore
}) => {
  const quickItems: { id: MainNavId; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'jamaah', label: 'Jamaah', icon: Users },
    { id: 'buses', label: 'Bus', icon: Bus },
    { id: 'seats', label: 'Kursi', icon: Grid }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {quickItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition ${
                isActive
                  ? 'text-midnight font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? 'bg-teal-50 text-teal-deep' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu */}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl text-slate-400 hover:text-slate-600 transition"
        >
          <div className="p-1">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Semua</span>
        </button>
      </div>
    </nav>
  );
};
