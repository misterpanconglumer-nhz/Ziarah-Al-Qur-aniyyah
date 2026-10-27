import React from 'react';
import { useApp } from '../context/AppContext';
import { formatRupiah } from '../utils/formatters';
import { 
  Users, 
  Layers, 
  Bus as BusIcon, 
  Grid, 
  Wallet, 
  CheckCircle, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import { MainNavId } from '../components/layout/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: MainNavId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { 
    isOnlineDb, 
    jamaahList, 
    rombonganList, 
    busesList, 
    paymentsList, 
    budgetList, 
    expensesList,
    busSeatsMap
  } = useApp();

  // Metrics Calculations
  const totalJamaah = jamaahList.length;
  const totalRombongan = rombonganList.length;
  const totalBus = busesList.length;
  const totalBusCapacity = busesList.reduce((acc, b) => acc + (b.capacity || 0), 0);

  // Seat stats
  let totalAssignedSeats = 0;
  Object.values(busSeatsMap).forEach(seats => {
    totalAssignedSeats += seats.filter(s => s.role !== 'empty' && s.role !== 'driver' && s.role !== 'door' && s.occupant_id).length;
  });
  const emptySeats = Math.max(0, totalBusCapacity - totalAssignedSeats);

  // Staff stats
  let totalTourLeaders = 0;
  let totalPembimbing = 0;
  busesList.forEach(b => {
    (b.staff || []).forEach(s => {
      if (s.role === 'tour_leader') totalTourLeaders++;
      if (s.role === 'pembimbing') totalPembimbing++;
    });
  });

  // Financial stats
  const totalBills = jamaahList.reduce((acc, j) => acc + (j.bill_amount || 0), 0);
  const totalReceived = paymentsList
    .filter(p => p.status === 'valid')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalOutstanding = Math.max(0, totalBills - totalReceived);

  const totalBudget = budgetList.reduce((acc, b) => acc + (b.total_budget || 0), 0);
  const totalExpenses = expensesList
    .filter(e => e.status === 'valid')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  // Saldo aktual: Kas Masuk Valid - Kas Keluar Valid
  const actualCashBalance = totalReceived - totalExpenses;

  // Payment Breakdown
  const lunasCount = jamaahList.filter(j => j.payment_status === 'Lunas').length;
  const cicilanCount = jamaahList.filter(j => j.payment_status === 'Cicilan').length;
  const belumBayarCount = jamaahList.filter(j => j.payment_status === 'Belum Bayar').length;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-8">
      {/* Demo Banner if offline */}
      {!isOnlineDb && (
        <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2.5 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-amber-500 text-white font-extrabold text-[9px] sm:text-[10px] rounded-md tracking-wider">
              DEMO
            </span>
            <span className="text-[11px] sm:text-xs">Data simulasi contoh. Database Supabase belum dikonfigurasi.</span>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="text-amber-900 font-bold underline hover:text-amber-950 shrink-0 text-[11px]"
          >
            Hubungkan DB
          </button>
        </div>
      )}

      {/* Hero Welcome & Quick Actions */}
      <div className="bg-gradient-to-r from-midnight via-midnight-800 to-teal-deep rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-5 sm:opacity-10 pointer-events-none flex items-center pr-4 sm:pr-8">
          <img src="/brand/logo-symbol-dark.svg" alt="watermark" className="w-44 sm:w-80 h-44 sm:h-80 object-contain" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-full text-[11px] font-semibold text-teal-soft mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sistem Operasional Ziarah Akbar 2027</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Selamat Datang, Pengelola & Bendahara
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-1.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
            Pantau seluruh data jamaah, penempatan kursi puluhan armada bus, serta arus kas masuk dan realisasi pengeluaran dalam satu dasbor terpadu.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => onNavigate('jamaah')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-teal-soft text-midnight font-bold rounded-lg sm:rounded-xl text-xs hover:bg-white transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Jamaah</span>
            </button>
            <button
              onClick={() => onNavigate('payments')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg sm:rounded-xl text-xs transition border border-white/20"
            >
              <Wallet className="w-3.5 h-3.5 text-teal-soft" />
              <span>Catat Pembayaran</span>
            </button>
            <button
              onClick={() => onNavigate('seats')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg sm:rounded-xl text-xs transition border border-white/20"
            >
              <Grid className="w-3.5 h-3.5 text-teal-soft" />
              <span>Kelola Denah Kursi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Health Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-teal-deep" />
            <span>Ringkasan Keuangan & Arus Kas</span>
          </h3>
          <span className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:inline">Saldo = Kas Masuk - Kas Keluar</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
          {/* Card 1: Saldo Kas Bersih */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold">Saldo Kas Bersih</span>
              <div className="p-1.5 bg-teal-50 text-teal-deep rounded-lg">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className={`text-base sm:text-2xl font-extrabold ${actualCashBalance >= 0 ? 'text-teal-deep' : 'text-rose-600'}`}>
              {formatRupiah(actualCashBalance)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between">
              <span>Masuk:</span>
              <span className="font-bold text-emerald-600">{formatRupiah(totalReceived)}</span>
            </div>
          </div>

          {/* Card 2: Total Pembayaran Diterima */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold">Kas Masuk</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-emerald-700">
              {formatRupiah(totalReceived)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between">
              <span>Tagihan:</span>
              <span className="font-semibold text-slate-700">{formatRupiah(totalBills)}</span>
            </div>
          </div>

          {/* Card 3: Sisa Piutang / Tunggakan */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold">Sisa Tunggakan</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-amber-700">
              {formatRupiah(totalOutstanding)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between">
              <span>Progres Lunas:</span>
              <span className="font-bold text-teal-deep">
                {totalBills > 0 ? Math.round((totalReceived / totalBills) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Card 4: Realisasi Pengeluaran */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold">Pengeluaran Kas</span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-rose-700">
              {formatRupiah(totalExpenses)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between">
              <span>Rencana:</span>
              <span className="font-semibold text-slate-700">{formatRupiah(totalBudget)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Metrics Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <BusIcon className="w-4 h-4 text-teal-deep" />
            <span>Kesiapan Operasional & Armada Bus</span>
          </h3>
          <span className="text-[10px] sm:text-[11px] text-slate-500">Skala 3.000 peserta</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-deep rounded-xl">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Total Jamaah</span>
                <span className="text-base sm:text-xl font-extrabold text-midnight block leading-tight">{totalJamaah}</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
              <span>Target: 3.000</span>
              <span className="font-bold text-teal-deep">{Math.round((totalJamaah / 3000) * 100)}%</span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-midnight/5 text-midnight rounded-xl">
                <BusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Total Bus</span>
                <span className="text-base sm:text-xl font-extrabold text-midnight block leading-tight">{totalBus} Unit</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
              <span>Kapasitas:</span>
              <span className="font-bold text-slate-700">{totalBusCapacity} Kursi</span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Grid className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Kursi Terisi</span>
                <span className="text-base sm:text-xl font-extrabold text-emerald-700 block leading-tight">{totalAssignedSeats}</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
              <span>Kosong:</span>
              <span className="font-bold text-amber-600">{emptySeats}</span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Rombongan</span>
                <span className="text-base sm:text-xl font-extrabold text-midnight block leading-tight">{totalRombongan}</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
              <span>Petugas Bus:</span>
              <span className="font-bold text-midnight">{totalTourLeaders + totalPembimbing} Org</span>
            </div>
          </div>
        </div>
      </div>
      {/* Split Cards: Staff & Status Pelunasan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Status Pelunasan Jamaah */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Distribusi Status Pembayaran Jamaah
            </h4>
            <button
              onClick={() => onNavigate('jamaah')}
              className="text-[11px] text-teal-deep hover:underline font-bold"
            >
              Lihat Detail
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl text-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-800">Lunas</span>
              <div className="text-base sm:text-xl font-extrabold text-emerald-700 mt-0.5">{lunasCount}</div>
              <span className="text-[9px] sm:text-[10px] text-emerald-600">
                {totalJamaah > 0 ? Math.round((lunasCount / totalJamaah) * 100) : 0}%
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-teal-50 border border-teal-200 rounded-xl sm:rounded-2xl text-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-teal-800">Cicilan</span>
              <div className="text-base sm:text-xl font-extrabold text-teal-700 mt-0.5">{cicilanCount}</div>
              <span className="text-[9px] sm:text-[10px] text-teal-600">
                {totalJamaah > 0 ? Math.round((cicilanCount / totalJamaah) * 100) : 0}%
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl text-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-800">Belum Bayar</span>
              <div className="text-base sm:text-xl font-extrabold text-amber-700 mt-0.5">{belumBayarCount}</div>
              <span className="text-[9px] sm:text-[10px] text-amber-600">
                {totalJamaah > 0 ? Math.round((belumBayarCount / totalJamaah) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Progress bar visual */}
          <div className="space-y-1 pt-1 sm:pt-2">
            <div className="w-full bg-slate-100 rounded-full h-2.5 sm:h-3 overflow-hidden flex">
              <div 
                style={{ width: `${totalJamaah > 0 ? (lunasCount / totalJamaah) * 100 : 0}%` }} 
                className="bg-emerald-500 h-full transition-all"
                title={`Lunas: ${lunasCount}`}
              />
              <div 
                style={{ width: `${totalJamaah > 0 ? (cicilanCount / totalJamaah) * 100 : 0}%` }} 
                className="bg-teal-soft h-full transition-all"
                title={`Cicilan: ${cicilanCount}`}
              />
              <div 
                style={{ width: `${totalJamaah > 0 ? (belumBayarCount / totalJamaah) * 100 : 0}%` }} 
                className="bg-amber-400 h-full transition-all"
                title={`Belum Bayar: ${belumBayarCount}`}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-medium px-1">
              <span>0%</span>
              <span>Kesiapan Biaya 100%</span>
            </div>
          </div>
        </div>

        {/* Petugas Bus Summary */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Petugas Operasional Armada Bus
            </h4>
            <button
              onClick={() => onNavigate('buses')}
              className="text-[11px] text-teal-deep hover:underline font-bold"
            >
              Atur Petugas
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 bg-teal-deep text-white rounded-lg sm:rounded-xl">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase">Tour Leader</p>
                <p className="text-base sm:text-xl font-extrabold text-midnight">{totalTourLeaders} Org</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400">Ditetapkan per bus</p>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 bg-midnight text-teal-soft rounded-lg sm:rounded-xl">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase">Pembimbing</p>
                <p className="text-base sm:text-xl font-extrabold text-midnight">{totalPembimbing} Org</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400">Ulama & Asatidz</p>
              </div>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] text-slate-600">
            <p className="font-semibold text-slate-800">Catatan Penempatan:</p>
            <p className="mt-0.5">
              Tour leader dan pembimbing ditetapkan pada armada bus, terintegrasi ke manifes & denah kursi resmi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
