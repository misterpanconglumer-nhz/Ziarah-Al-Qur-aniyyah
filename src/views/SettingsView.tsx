import React, { useState, useEffect } from 'react';
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
  DollarSign,
  Bus,
  Users,
  Sparkles,
  KeyRound,
  Lock
} from 'lucide-react';

interface SettingsViewProps {
  onOpenInstallModal: () => void;
  onOpenDbModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenInstallModal, onOpenDbModal }) => {
  const { 
    settings, 
    updateSettings,
    syncFleetAndBudget, 
    isOnlineDb, 
    dbStatusInfo, 
    refreshDbStatus,
    jamaahList,
    updateJamaah,
    changeAdminPassword,
    adminEmail,
    showToast 
  } = useApp();

  // Settings states
  const [activityName, setActivityName] = useState(settings.activity_name);
  const [activityYear, setActivityYear] = useState(settings.activity_year);
  const [defaultBill, setDefaultBill] = useState(settings.default_bill_amount);
  const [targetParticipants, setTargetParticipants] = useState(settings.target_participants);

  // Master Auto-Sync states
  const [totalBuses, setTotalBuses] = useState(settings.total_buses || 40);
  const [seatsPerBus, setSeatsPerBus] = useState(settings.seats_per_bus || 59);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync internal form states with global settings when data arrives from Supabase/cache
  useEffect(() => {
    if (settings.activity_name) setActivityName(settings.activity_name);
    if (settings.activity_year) setActivityYear(settings.activity_year);
    if (settings.default_bill_amount) setDefaultBill(settings.default_bill_amount);
    if (settings.target_participants) setTargetParticipants(settings.target_participants);
    if (settings.total_buses) setTotalBuses(settings.total_buses);
    if (settings.seats_per_bus) setSeatsPerBus(settings.seats_per_bus);
  }, [settings]);

  const calculatedTarget = totalBuses * seatsPerBus;
  const estimatedIncome = calculatedTarget * defaultBill;

  const handleSaveMasterSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const res = await syncFleetAndBudget(Number(totalBuses), Number(seatsPerBus));
      if (res?.targetParticipants) {
        setTargetParticipants(res.targetParticipants);
      }
      if (Number(defaultBill) !== settings.default_bill_amount) {
        await updateSettings({ default_bill_amount: Number(defaultBill) }, { silent: true });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Bulk update nominal modal
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      activity_name: activityName,
      activity_year: activityYear,
      default_bill_amount: Number(defaultBill),
      target_participants: Number(targetParticipants),
      total_buses: Number(totalBuses),
      seats_per_bus: Number(seatsPerBus)
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast('Harap isi semua kolom kata sandi!', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok!', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter!', 'warning');
      return;
    }

    setIsChangingPass(true);
    const res = await changeAdminPassword(oldPassword, newPassword);
    if (res.success) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setIsChangingPass(false);
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

      {/* Section Master: Master Konfigurasi Bus & Peserta (Auto-Sync) */}
      <div className="bg-gradient-to-br from-white to-teal-50/40 rounded-3xl border border-teal-200/80 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-teal-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-midnight text-teal-soft rounded-2xl shadow-sm">
              <Bus className="w-5 h-5 text-teal-soft" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-midnight flex items-center gap-1.5">
                <span>Master Konfigurasi Armada Bus & Total Peserta</span>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-[10px] rounded-full font-extrabold">Auto-Sync</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Ubah di 1 titik ini untuk menyesuaikan seluruh armada bus, target peserta, dan pos anggaran secara otomatis
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveMasterSync} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Jumlah Armada Bus *</span>
                <Bus className="w-3.5 h-3.5 text-teal-deep" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={totalBuses}
                  onChange={e => setTotalBuses(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={100}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-extrabold text-midnight"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Bus</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Contoh: 40 Bus pariwisata</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Kapasitas Kursi per Bus *</span>
                <Users className="w-3.5 h-3.5 text-blue-600" />
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={seatsPerBus}
                  onChange={e => setSeatsPerBus(Math.max(10, Number(e.target.value)))}
                  min={10}
                  max={80}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-extrabold text-midnight"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Kursi</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Standar: 59 kursi (Jetbus 5)</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Biaya per Jamaah (Rp) *</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </label>
              <input
                type="number"
                value={defaultBill}
                onChange={e => setDefaultBill(Number(e.target.value))}
                min={0}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-extrabold text-emerald-700"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Saat ini: {formatRupiah(defaultBill)}</span>
            </div>
          </div>

          {/* Live Sync Preview */}
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Total Armada</span>
              <span className="text-base font-extrabold text-midnight">{totalBuses} Bus</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Kapasitas / Bus</span>
              <span className="text-base font-extrabold text-teal-deep">{seatsPerBus} Kursi</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Target Total Peserta</span>
              <span className="text-base font-extrabold text-blue-700">{calculatedTarget.toLocaleString('id-ID')} Jamaah</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Target Kas Masuk</span>
              <span className="text-base font-extrabold text-emerald-700">{formatRupiah(estimatedIncome)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-500">
              💡 Mengubah angka di atas akan langsung mensinkronkan armada bus di <strong>Data Bus</strong> dan pos anggaran berbasis bus (sewa bus, tol, tips sopir, parkir) di <strong>Anggaran</strong>.
            </p>
            <button
              type="submit"
              disabled={isSyncing}
              className="w-full sm:w-auto px-5 py-2.5 bg-midnight hover:bg-midnight-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mensinkronkan Seluruh Sistem...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-teal-soft" />
                  <span>Terapkan & Sinkronkan Otomatis</span>
                </>
              )}
            </button>
          </div>
        </form>
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

      {/* Section 2: Ganti Password Admin */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 bg-midnight-50 text-midnight rounded-xl">
            <KeyRound className="w-5 h-5 text-teal-deep" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-midnight">Keamanan Akun & Ganti Password Admin</h3>
            <p className="text-[11px] text-slate-500">Perbarui kata sandi login pengelola/bendahara kegiatan ({adminEmail})</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kata Sandi Lama *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama Anda..."
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Kata sandi default awal: <code>adminziarah2027</code></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kata Sandi Baru *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter..."
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Konfirmasi Kata Sandi Baru *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru..."
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isChangingPass}
              className="px-5 py-2.5 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isChangingPass ? 'Memperbarui...' : 'Simpan Kata Sandi Baru'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 3: Database Supabase Status */}
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
