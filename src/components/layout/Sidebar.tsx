import React from 'react';
import {
  LayoutDashboard,
  Users,
  Layers,
  Bus,
  Grid,
  CreditCard,
  PieChart,
  FileText,
  Settings,
  X
} from 'lucide-react';

export type MainNavId =
  | 'dashboard'
  | 'jamaah'
  | 'rombongan'
  | 'buses'
  | 'seats'
  | 'payments'
  | 'budget'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: MainNavId;
  onSelectTab: (tab: MainNavId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile
}) => {
  const menuItems: { id: MainNavId; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jamaah', label: 'Data Jamaah', icon: Users },
    { id: 'rombongan', label: 'Data Rombongan', icon: Layers },
    { id: 'buses', label: 'Data Bus & Petugas', icon: Bus },
    { id: 'seats', label: 'Denah Kursi', icon: Grid },
    { id: 'payments', label: 'Pembayaran', icon: CreditCard },
    { id: 'budget', label: 'Anggaran & Pengeluaran', icon: PieChart },
    { id: 'reports', label: 'Laporan', icon: FileText },
    { id: 'settings', label: 'Pengaturan', icon: Settings }
  ];

  const handleSelect = (id: MainNavId) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-midnight text-white select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/brand/logo-symbol-dark.svg"
            alt="Logo Simbol"
            className="w-9 h-9 object-contain"
          />
          <div>
            <h1 className="text-sm font-extrabold tracking-tight leading-tight">
              ZIARAH <span className="text-teal-soft">2027</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-300 tracking-wider">
              AL-QUR'ANIYYAH
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Menu List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-teal-soft/80">
          Menu Utama Operasional
        </div>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-teal-deep text-white shadow-md shadow-teal-900/40 font-bold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-teal-soft' : 'text-slate-400 group-hover:text-teal-soft'
                }`}
              />
              <span className="flex-1 text-left tracking-tight">{item.label}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] bg-teal-soft/20 text-teal-soft rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/10 bg-midnight-900/60">
        <div className="text-[11px] text-slate-400">
          <p className="font-semibold text-slate-300">Ziarah Akbar 2027</p>
          <p className="text-[10px]">Sistem Pengelola & Bendahara</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Fixed */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 z-40 shadow-xl">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 max-w-[85vw] h-full"
            onClick={e => e.stopPropagation()}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
