import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Mail, ArrowRight, ShieldCheck, Database, Smartphone, Eye, EyeOff } from 'lucide-react';

interface AuthViewProps {
  onOpenInstallModal: () => void;
  onOpenDbModal: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onOpenInstallModal, onOpenDbModal }) => {
  const { loginAdmin, isOnlineDb } = useApp();
  const [email, setEmail] = useState('bendahara@ziarah2027.id');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Silakan masukkan kata sandi admin.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const res = await loginAdmin(password, email);
    if (!res.success) {
      setErrorMessage(res.message);
    }
    setIsLoading(false);
  };

  const handleFillDemo = () => {
    setEmail('bendahara@ziarah2027.id');
    setPassword('adminziarah2027');
  };

  return (
    <div className="min-h-screen bg-offwhite flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top bar info */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={onOpenDbModal}
          className="flex items-center gap-1.5 hover:text-midnight transition"
        >
          <Database className="w-3.5 h-3.5 text-teal-deep" />
          <span>{isOnlineDb ? 'Supabase Online' : 'Status: Data Demo'}</span>
        </button>

        <button
          onClick={onOpenInstallModal}
          className="flex items-center gap-1.5 hover:text-midnight transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-teal-deep" />
          <span>Pasang ke Layar HP</span>
        </button>
      </div>

      {/* Center Login Box */}
      <div className="max-w-md w-full mx-auto my-auto">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 overflow-hidden">
          {/* Logo Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="p-3 bg-midnight/5 rounded-2xl mb-3 shadow-inner">
              <img
                src="/brand/logo-symbol.svg"
                alt="Logo Ziarah 2027"
                className="w-14 h-14 object-contain"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-midnight tracking-tight">
              ZIARAH <span className="text-teal-deep">2027</span>
            </h1>
            <p className="text-xs font-bold text-teal-soft tracking-wider uppercase mt-0.5">
              AL-QUR'ANIYYAH
            </p>
            <p className="text-xs text-slate-500 mt-2 max-w-xs">
              Sistem Operasional Pengelola & Bendahara Ziarah Akbar 2027
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-shake">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Pengelola / Bendahara
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="admin@ziarah2027.id"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 focus:border-teal-deep transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Kata Sandi Admin
                </label>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[11px] text-teal-deep hover:underline font-semibold"
                >
                  Gunakan Password Standar
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 focus:border-teal-deep transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-midnight hover:bg-midnight-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-midnight/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem Operasional'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 justify-center">
            <ShieldCheck className="w-4 h-4 text-teal-deep" />
            <span>Satu admin utama kegiatan. Data dilindungi hak akses.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto text-center text-[11px] text-slate-400 pt-4">
        Ziarah Akbar Al-Qur'aniyyah 2027 &copy; All rights reserved.
      </footer>
    </div>
  );
};
