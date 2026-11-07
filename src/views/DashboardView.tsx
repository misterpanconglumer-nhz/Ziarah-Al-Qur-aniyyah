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
  Plus,
  UserCheck,
  UserX,
  FileText
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
    rombonganPaymentsList,
    budgetList, 
    expensesList,
    busSeatsMap,
    getRombonganFinancialSummary
  } = useApp();

  // Metrics Calculations
  const totalJamaah = jamaahList.length;
  const totalRombongan = rombonganList.length;
  const totalBus = busesList.length;
  const totalBusCapacity = busesList.reduce((acc, b) => acc + (b.capacity || 0), 0);

  // Participant breakdown: Kolektif vs Individual
  const individualRombonganIds = new Set(
    rombonganList.filter(r => r.payment_mode === 'individual' || r.id === 'RMB-01').map(r => r.id)
  );
  const jamaahIndividualList = jamaahList.filter(j => individualRombonganIds.has(j.rombongan_id));
  const jamaahRombonganList = jamaahList.filter(j => !individualRombonganIds.has(j.rombongan_id));
  const totalJamaahIndividual = jamaahIndividualList.length;
  const totalJamaahRombongan = jamaahRombonganList.length;

  // Individual payments stats
  const individualBills = jamaahIndividualList.reduce((acc, j) => acc + (j.bill_amount || 0), 0);
  const individualPaid = paymentsList
    .filter(p => p.status === 'valid')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const individualOutstanding = Math.max(0, individualBills - individualPaid);
  const individualLunasCount = jamaahIndividualList.filter(j => j.payment_status === 'Lunas').length;
  const individualBelumLunasCount = jamaahIndividualList.filter(j => j.payment_status !== 'Lunas').length;

  // Collective Rombongan stats
  const collectiveRombonganList = rombonganList.filter(r => r.payment_mode !== 'individual' && r.id !== 'RMB-01');
  const rombonganSummaries = collectiveRombonganList.map(r => getRombonganFinancialSummary(r.id));
  const collectiveBills = rombonganSummaries.reduce((acc, s) => acc + s.totalBill, 0);
  const collectivePaid = rombonganSummaries.reduce((acc, s) => acc + s.totalPaid, 0);
  const collectiveOutstanding = Math.max(0, collectiveBills - collectivePaid);

  const rombonganLunasCount = rombonganSummaries.filter(s => s.status === 'LUNAS').length;
  const rombonganCicilanCount = rombonganSummaries.filter(s => s.status === 'CICILAN').length;
  const rombonganBelumBayarCount = rombonganSummaries.filter(s => s.status === 'BELUM BAYAR').length;

  // Combined Financial Totals (Zero Double Counting)
  const totalBills = collectiveBills + individualBills;
  const totalReceived = collectivePaid + individualPaid;
  const totalOutstanding = Math.max(0, totalBills - totalReceived);

  // Budget & Expenses
  const totalBudget = budgetList.reduce((acc, b) => acc + (b.total_budget || 0), 0);
  const totalExpenses = expensesList
    .filter(e => e.status === 'valid')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  // Saldo aktual: Kas Masuk Valid (Gabungan) - Kas Keluar Valid
  const actualCashBalance = totalReceived - totalExpenses;

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
            Pantau pembayaran kolektif rombongan & jamaah individual, penempatan kursi armada bus, serta arus kas masuk aktual dalam satu dasbor terpadu.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-400 text-slate-900 font-bold rounded-lg sm:rounded-xl text-xs hover:bg-amber-300 transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Laporan Tunggakan Rombongan</span>
            </button>
            <button
              onClick={() => onNavigate('rombongan')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-teal-soft text-midnight font-bold rounded-lg sm:rounded-xl text-xs hover:bg-white transition shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Data Rombongan</span>
            </button>
            <button
              onClick={() => onNavigate('payments')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg sm:rounded-xl text-xs transition border border-white/20"
            >
              <Wallet className="w-3.5 h-3.5 text-teal-soft" />
              <span>Pusat Pembayaran</span>
            </button>
            <button
              onClick={() => onNavigate('seats')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg sm:rounded-xl text-xs transition border border-white/20"
            >
              <Grid className="w-3.5 h-3.5 text-teal-soft" />
              <span>Denah Kursi Bus</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Health Section (Combined Rekapitulasi Keuangan) */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-teal-deep" />
            <span>Rekapitulasi Keuangan & Arus Kas Terpadu</span>
          </h3>
          <span className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:inline">
            Integrasi Pembayaran Kolektif + Individual Tanpa Duplikasi
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
          {/* Card 1: Saldo Kas Bersih */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold">Saldo Kas Aktual</span>
              <div className="p-1.5 bg-teal-50 text-teal-deep rounded-lg">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className={`text-base sm:text-2xl font-extrabold ${actualCashBalance >= 0 ? 'text-teal-deep' : 'text-rose-600'}`}>
              {formatRupiah(actualCashBalance)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between">
              <span>Pengeluaran:</span>
              <span className="font-semibold text-rose-600">{formatRupiah(totalExpenses)}</span>
            </div>
          </div>

          {/* Card 2: Total Uang Masuk Gabungan */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold">Total Uang Masuk</span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-emerald-700">
              {formatRupiah(totalReceived)}
            </div>
            <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Kolektif: <strong className="text-emerald-700">{formatRupiah(collectivePaid)}</strong></span>
              <span>Indiv: <strong className="text-slate-700">{formatRupiah(individualPaid)}</strong></span>
            </div>
          </div>

          {/* Card 3: Total Tagihan Gabungan */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold">Total Tagihan (Target)</span>
              <div className="p-1.5 bg-sky-50 text-sky-700 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-slate-800">
              {formatRupiah(totalBills)}
            </div>
            <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Kolektif: {formatRupiah(collectiveBills)}</span>
              <span>Indiv: {formatRupiah(individualBills)}</span>
            </div>
          </div>

          {/* Card 4: Sisa Pembayaran / Tunggakan */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold">Total Sisa Tunggakan</span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-extrabold text-amber-700">
              {formatRupiah(totalOutstanding)}
            </div>
            <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500 flex items-center justify-between">
              <span>Tingkat Pelunasan:</span>
              <span className="font-bold text-teal-deep">
                {totalBills > 0 ? Math.round((totalReceived / totalBills) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Comparison: Kolektif Rombongan vs Jamaah Individual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Box A: Status Pembayaran Rombongan Kolektif */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-deep" />
                <span>Status Pembayaran Rombongan (Kolektif)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total {collectiveRombonganList.length} Rombongan • {totalJamaahRombongan} Jamaah Rombongan
              </p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[11px] text-teal-deep hover:underline font-bold"
            >
              Laporan Tunggakan
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl text-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-800">Lunas</span>
              <div className="text-base sm:text-xl font-extrabold text-emerald-700 mt-0.5">{rombonganLunasCount}</div>
              <span className="text-[9px] sm:text-[10px] text-emerald-600">Rombongan</span>
            </div>

            <div className="p-2.5 sm:p-3 bg-teal-50 border border-teal-200 rounded-xl sm:rounded-2xl text-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-teal-800">Cicilan</span>
              <div className="text-base sm:text-xl font-extrabold text-teal-700 mt-0.5">{rombonganCicilanCount}</div>
              <span className="text-[9px] sm:text-[10px] text-teal-600">Rombongan</span>
            </div>

            <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl text-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-800">Belum Bayar</span>
              <div className="text-base sm:text-xl font-extrabold text-amber-700 mt-0.5">{rombonganBelumBayarCount}</div>
              <span className="text-[9px] sm:text-[10px] text-amber-600">Rombongan</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl sm:rounded-2xl text-xs space-y-1.5 border border-slate-100">
            <div className="flex justify-between text-slate-600">
              <span>Setoran Masuk Kolektif:</span>
              <strong className="text-emerald-700">{formatRupiah(collectivePaid)}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Sisa Tagihan Rombongan:</span>
              <strong className="text-amber-700">{formatRupiah(collectiveOutstanding)}</strong>
            </div>
          </div>
        </div>

        {/* Box B: Status Pembayaran Jamaah Individual */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-midnight" />
                <span>Status Jamaah Mandiri (Individual)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total {totalJamaahIndividual} Jamaah Mandiri terdaftar
              </p>
            </div>
            <button
              onClick={() => onNavigate('jamaah')}
              className="text-[11px] text-teal-deep hover:underline font-bold"
            >
              Lihat Data Jamaah
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl sm:rounded-2xl text-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-800">Lunas</span>
              <div className="text-base sm:text-xl font-extrabold text-emerald-700 mt-0.5">{individualLunasCount}</div>
              <span className="text-[9px] sm:text-[10px] text-emerald-600">
                {totalJamaahIndividual > 0 ? Math.round((individualLunasCount / totalJamaahIndividual) * 100) : 0}% Jamaah
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl text-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-800">Belum Lunas</span>
              <div className="text-base sm:text-xl font-extrabold text-rose-700 mt-0.5">{individualBelumLunasCount}</div>
              <span className="text-[9px] sm:text-[10px] text-rose-600">
                {totalJamaahIndividual > 0 ? Math.round((individualBelumLunasCount / totalJamaahIndividual) * 100) : 0}% Jamaah
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl sm:rounded-2xl text-xs space-y-1.5 border border-slate-100">
            <div className="flex justify-between text-slate-600">
              <span>Kas Masuk Jamaah Mandiri:</span>
              <strong className="text-emerald-700">{formatRupiah(individualPaid)}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Sisa Tagihan Mandiri:</span>
              <strong className="text-amber-700">{formatRupiah(individualOutstanding)}</strong>
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
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Total Seluruh Jamaah</span>
                <span className="text-base sm:text-xl font-extrabold text-midnight block leading-tight">{totalJamaah}</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
              <span>Rombongan: <strong>{totalJamaahRombongan}</strong></span>
              <span>Mandiri: <strong>{totalJamaahIndividual}</strong></span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-midnight/5 text-midnight rounded-xl">
                <BusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Total Armada Bus</span>
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
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Total Rombongan</span>
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
    </div>
  );
};
