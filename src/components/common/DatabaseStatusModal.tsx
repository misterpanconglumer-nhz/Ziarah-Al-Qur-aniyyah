import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({ isOpen, onClose }) => {
  const { isOnlineDb, dbStatusInfo, refreshDbStatus, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  const handleCopyEnvGuide = () => {
    const text = `# File .env atau Vercel Environment Variables:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Contoh konfigurasi .env berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecheck = async () => {
    setChecking(true);
    await refreshDbStatus();
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-midnight text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isOnlineDb ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Status Database Supabase PostgreSQL</h3>
              <p className="text-[11px] text-teal-soft">Penyimpanan Terpusat & Keamanan RLS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator Card */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isOnlineDb 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {isOnlineDb ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold text-sm">
                {isOnlineDb ? 'STATUS: TERHUBUNG KE SUPABASE' : 'STATUS: BELUM TERHUBUNG (DATA DEMO AKTIF)'}
              </div>
              <p>{dbStatusInfo.message}</p>
              {!isOnlineDb && (
                <p className="font-semibold text-amber-800">
                  Perhatian: Data yang diinputkan saat ini adalah simulasi DATA DEMO dan belum tersimpan permanen ke cloud Supabase sampai environment variable dikonfigurasi.
                </p>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          {!isOnlineDb && (
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Panduan Menghubungkan Supabase (3 Langkah):
              </h4>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-midnight flex items-center justify-between">
                    <span>1. Buat Proyek Supabase Gratis</span>
                    <a 
                      href="https://supabase.com" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-teal-deep hover:underline flex items-center gap-1 font-semibold text-[11px]"
                    >
                      Buka Supabase <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p>Daftar di supabase.com, buat proyek baru (misal: <em>ziarah-2027</em>), dan pilih region terdekat (Singapore).</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="font-bold text-midnight">2. Eksekusi Skema Database SQL</div>
                  <p>Buka menu <strong>SQL Editor</strong> di dashboard Supabase Anda, lalu jalankan query skema yang telah kami sediakan di file:</p>
                  <code className="block p-2 bg-slate-800 text-teal-soft rounded-lg font-mono text-[11px]">
                    src/lib/db-schema.sql
                  </code>
                  <p className="text-[11px] text-slate-500">
                    File ini mencakup semua tabel (jamaah, bus, rombongan, transaksi kas, pos anggaran) serta kebijakan keamanan Row Level Security (RLS).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-midnight flex items-center justify-between">
                    <span>3. Masukkan Kredensial API ke .env / Vercel</span>
                    <button
                      onClick={handleCopyEnvGuide}
                      className="text-xs text-teal-deep hover:text-midnight font-bold flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin' : 'Salin Format'}</span>
                    </button>
                  </div>
                  <p>Buka <strong>Project Settings → API</strong> di Supabase, lalu masukkan ke file <code>.env</code> lokal atau Environment Variables di Vercel:</p>
                  <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto">
{`VITE_SUPABASE_URL=https://[PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
                  </pre>
                  <p className="text-[10px] text-slate-500">
                    *Jangan pernah menggunakan secret service_role key pada frontend.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isOnlineDb && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <ShieldCheck className="w-4 h-4" />
                <span>Row Level Security (RLS) Aktif</span>
              </div>
              <p>Data jamaah, kursi, dan transaksi keuangan aman. Akses perubahan hanya dapat dilakukan oleh admin kegiatan yang terautentikasi.</p>
              <p className="text-[11px] text-slate-500">Endpoint Database: <code>{dbStatusInfo.url}</code></p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleRecheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Memeriksa...' : 'Uji Koneksi Ulang'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-midnight text-white text-xs font-bold rounded-xl hover:bg-midnight-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
