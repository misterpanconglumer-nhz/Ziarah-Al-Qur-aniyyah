import React, { useState } from 'react';
import { X, Smartphone, CheckCircle2, Share, MoreVertical, ShieldAlert } from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 bg-midnight text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Smartphone className="w-5 h-5 text-teal-soft" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Pasang Aplikasi ke Layar Utama</h3>
              <p className="text-[11px] text-teal-soft/90">Akses Cepat Offline-Ready PWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setPlatform('android')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${
              platform === 'android'
                ? 'bg-white text-midnight border-b-2 border-teal-deep'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>📱</span> Android (Chrome)
          </button>
          <button
            onClick={() => setPlatform('ios')}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${
              platform === 'ios'
                ? 'bg-white text-midnight border-b-2 border-teal-deep'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>🍏</span> iPhone (Safari)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          <div className="flex items-center gap-3 p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
            <img 
              src="/brand/app-icon-192.png" 
              alt="Icon Ziarah 2027" 
              className="w-12 h-12 rounded-xl shadow-md shrink-0" 
            />
            <div>
              <h4 className="font-bold text-xs text-midnight">Ziarah 2027</h4>
              <p className="text-[11px] text-slate-600">Ziarah Akbar Al-Qur'aniyyah 2027</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-teal-deep text-white text-[9px] font-bold rounded-full">
                Progressive Web App
              </span>
            </div>
          </div>

          {platform === 'android' ? (
            <div className="space-y-3">
              <h5 className="font-bold text-xs text-slate-800">Langkah Pemasangan di Android:</h5>
              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-midnight text-white text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Buka website produksi ini menggunakan browser <strong>Google Chrome</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-midnight text-white text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    Tekan tombol menu titik tiga <MoreVertical className="w-3.5 h-3.5 inline text-slate-700" /> di pojok kanan atas browser.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-midnight text-white text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Pilih <strong>"Install app"</strong> atau <strong>"Tambahkan ke layar utama"</strong> (Add to Home screen).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-midnight text-white text-[10px] font-bold shrink-0 mt-0.5">
                    4
                  </span>
                  <span>Konfirmasi pemasangan. Ikon resmi Ziarah 2027 akan otomatis muncul di layar utama smartphone Anda.</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <h5 className="font-bold text-xs text-slate-800">Langkah Pemasangan di iPhone (iOS):</h5>
              <ol className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-midnight text-white text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Buka website produksi menggunakan browser <strong>Safari</strong> (bukan Chrome/in-app browser).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-midnight text-white text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span className="flex items-center gap-1 flex-wrap">
                    Tekan tombol Bagikan <Share className="w-3.5 h-3.5 inline text-teal-deep" /> (Share) di bilah bawah Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-midnight text-white text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Gulir ke bawah dan pilih opsi <strong>"Add to Home Screen"</strong> (Tambahkan ke Layar Utama).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-midnight text-white text-[10px] font-bold shrink-0 mt-0.5">
                    4
                  </span>
                  <span>Tekan <strong>"Add"</strong> di pojok kanan atas. Aplikasi akan tampil layaknya aplikasi native tanpa frame browser.</span>
                </li>
              </ol>
            </div>
          )}

          {/* Security Note */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Catatan Keamanan:</strong> PWA ini terintegrasi autentikasi ketat. Membuka dari shortcut layar utama tetap mewajibkan sesi admin aktif demi melindungi data jamaah dan keuangan.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-midnight text-white text-xs font-bold rounded-xl hover:bg-midnight-700 transition"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
