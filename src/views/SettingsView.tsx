import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatRupiah } from '../utils/formatters';
import { 
  Settings, 
  Database, 
  Smartphone, 
  ShieldCheck, 
  Check, 
  Copy, 
  RefreshCw, 
  Save, 
  AlertTriangle,
  ExternalLink,
  Sliders,
  DollarSign
} from 'lucide-react';

interface SettingsViewProps {
  onOpenInstallModal: () => void;
  onOpenDbModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenInstallModal, onOpenDbModal }) => {
  const { 
    settings, 
    updateSettings, 
    isOnlineDb, 
    dbStatusInfo, 
    refreshDbStatus,
    jamaahList,
    updateJamaah,
    showToast 
  } = useApp();

  // Settings states
  const [activityName, setActivityName] = useState(settings.activity_name);
  const [activityYear, setActivityYear] = useState(settings.activity_year);
  const [defaultBill, setDefaultBill] = useState(settings.default_bill_amount);
  const [targetParticipants, setTargetParticipants] = useState(settings.target_participants);

  // Bulk update nominal modal
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      activity_name: activityName,
      activity_year: activityYear,
      default_bill_amount: Number(defaultBill),
      target_participants: Number(targetParticipants)
    });
  };

  const handleApplyToAllUnpaid = async () => {
    // Only update jamaah that haven't paid yet
    let count = 0;
    for (const jm of jamaahList) {
      if (jm.total_paid === 0) {
        await updateJamaah(jm.id, {
          bill_amount: Number(defaultBill)
        });
        count++;
      }
    }
    setIsBulkConfirmOpen(false);
    showToast(`Berhasil menerapkan nominal default ke ${count} jamaah yang belum melakukan pembayaran.`, 'success');
  };

  const handleCopySql = () => {
    const sqlText = `-- Jalankan SQL ini di SQL Editor Supabase
-- File lengkap: src/lib/db-schema.sql
-- Silakan buka file tersebut untuk melihat seluruh definisi tabel, foreign key, dan RLS.`;
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    showToast('Teks SQL disalin!', 'success');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-deep" />
          <span>Pengaturan Sistem & Database</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Konfigurasi nominal default per jamaah, integrasi cloud database Supabase, dan shortcut PWA.
        </p>
      </div>

      {/* Section 1: Nominal Biaya & Kegiatan */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 bg-teal-50 text-teal-deep rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-midnight">Konfigurasi Nominal Biaya Jamaah</h3>
            <p className="text-[11px] text-slate-500">Nilai awal yang otomatis dikenakan pada pendaftaran jamaah baru</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nominal Tagihan Default per Jamaah (Rp) *
              </label>
              <input
                type="number"
                value={defaultBill}
                onChange={e => setDefaultBill(Number(e.target.value))}
                min={0}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-extrabold text-midnight"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Contoh: {formatRupiah(defaultBill)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Peserta Jamaah
              </label>
              <input
                type="number"
                value={targetParticipants}
                onChange={e => setTargetParticipants(Number(e.target.value))}
                min={1}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Skala kapasitas operasional (hingga 3.000 peserta)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kegiatan Ziarah
              </label>
              <input
                type="text"
                value={activityName}
                onChange={e => setActivityName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tahun Pelaksanaan
              </label>
              <input
                type="text"
                value={activityYear}
                onChange={e => setActivityYear(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkConfirmOpen(true)}
              className="text-xs text-teal-deep font-bold hover:underline"
            >
              Terapkan Nominal Baru ke Jamaah Belum Bayar
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Database Supabase Status */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isOnlineDb ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-midnight">Database Online Supabase PostgreSQL</h3>
              <p className="text-[11px] text-slate-500">Penyimpanan persisten online & keamanan Row Level Security</p>
            </div>
          </div>

          <button
            onClick={onOpenDbModal}
            className="text-xs text-teal-deep font-bold hover:underline"
          >
            Buka Panduan Lengkap
          </button>
        </div>

        <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
          isOnlineDb ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          {isOnlineDb ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <span className="font-extrabold text-sm block">
              {isOnlineDb ? 'TERHUBUNG KE SUPABASE' : 'BELUM TERHUBUNG (DATA DEMO AKTIF)'}
            </span>
            <p>{dbStatusInfo.message}</p>
            <p className="text-[11px] text-slate-600">
              Skema file database siap eksekusi tersedia di: <code className="bg-white px-1.5 py-0.5 rounded border font-mono">src/lib/db-schema.sql</code>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={refreshDbStatus}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cek Ulang Koneksi</span>
          </button>
        </div>
      </div>

      {/* Section 3: PWA Shortcut Helper */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-midnight-50 text-midnight rounded-xl">
              <Smartphone className="w-5 h-5 text-teal-deep" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-midnight">Aplikasi Mobile PWA</h3>
              <p className="text-[11px] text-slate-500">Pasang ikon resmi Ziarah 2027 ke layar utama Android & iPhone</p>
            </div>
          </div>

          <button
            onClick={onOpenInstallModal}
            className="px-4 py-2 bg-midnight text-white text-xs font-bold rounded-xl hover:bg-midnight-700 transition shadow-sm"
          >
            Petunjuk Pasang
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Konfirmasi Bulk Update Nominal                                     */}
      {/* ========================================================================= */}
      {isBulkConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Konfirmasi Pembaruan Massal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda ingin memperbarui nominal tagihan menjadi <strong>{formatRupiah(defaultBill)}</strong> kepada seluruh jamaah yang belum melakukan pembayaran?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsBulkConfirmOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleApplyToAllUnpaid}
                className="flex-1 py-2 text-xs font-bold text-white bg-midnight rounded-xl hover:bg-midnight-700"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
