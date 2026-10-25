import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Database, 
  Smartphone, 
  LogOut, 
  Menu, 
  ShieldCheck, 
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenInstallModal: () => void;
  onOpenDbModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenInstallModal,
  onOpenDbModal
}) => {
  const { isOnlineDb, dbStatusInfo, adminEmail, logoutAdmin } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Mobile hamburger & Logo mobile */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-midnight rounded-lg hover:bg-slate-100 transition"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <img 
              src="/brand/logo-symbol.svg" 
              alt="Logo Ziarah 2027" 
              className="w-8 h-8 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-midnight leading-none">
                ZIARAH <span className="text-teal-deep">2027</span>
              </span>
              <span className="text-[10px] font-semibold text-teal-soft tracking-wider leading-tight">
                AL-QUR'ANIYYAH
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Database Status Pill */}
          <button
            onClick={onOpenDbModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition shadow-sm ${
              isOnlineDb
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Klik untuk panduan status database Supabase"
          >
            {isOnlineDb ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Supabase Online</span>
                <span className="sm:hidden">Online</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">DATA DEMO (Belum Terhubung)</span>
                <span className="sm:hidden font-bold">DEMO</span>
              </>
            )}
          </button>

          {/* PWA Install Button */}
          <button
            onClick={onOpenInstallModal}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-midnight-50 hover:bg-midnight-100 text-midnight rounded-lg text-xs font-semibold border border-midnight-200 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-teal-deep" />
            <span className="hidden md:inline">Pasang di HP</span>
          </button>

          {/* User & Logout */}
          <div className="flex items-center pl-2 border-l border-slate-200 gap-2">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">Admin Utama</span>
              <span className="text-[10px] text-slate-500 truncate max-w-[120px]" title={adminEmail}>
                {adminEmail}
              </span>
            </div>
            <button
              onClick={logoutAdmin}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
              title="Keluar dari sesi Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
