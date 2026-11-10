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
  FileText,
  PieChart,
  BarChart3,
  Award,
  AlertTriangle
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

  // ==========================================
  // 1. INFORMASI JAMAAH
  // ==========================================
  const totalJamaah = jamaahList.length;
  const totalRombongan = rombonganList.length;
  const totalJamaahLunas = jamaahList.filter(j => j.payment_status === 'Lunas').length;
  const totalJamaahCicilan = jamaahList.filter(j => j.payment_status === 'Cicilan').length;
  const totalJamaahBelumBayar = jamaahList.filter(j => j.payment_status === 'Belum Bayar').length;
  const totalJamaahBelumLunas = totalJamaahCicilan + totalJamaahBelumBayar;

  // ==========================================
  // 2. INFORMASI KEUANGAN TERPADU (SINKRON 100%)
  // ==========================================
  // A. Total Tagihan Seluruh Jamaah
  const totalBills = jamaahList.reduce((acc, j) => acc + (j.bill_amount || 0), 0);

  // B. Total Pembayaran Individual (Semua setoran langsung dari jamaah)
  const totalIndividualPaid = Math.max(
    jamaahList.reduce((acc, j) => acc + (j.total_paid || 0), 0),
    paymentsList
      .filter(p => p.status === 'valid')
      .reduce((acc, p) => acc + (p.amount || 0), 0)
  );

  // C. Total Setoran Koordinator (Semua setoran kolektif dari rombongan)
  const totalCoordinatorPaid = rombonganPaymentsList
    .filter(p => p.status === 'valid')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  // D. Total Uang Masuk Keseluruhan (Individual + Koordinator)
  const totalReceived = totalIndividualPaid + totalCoordinatorPaid;

  // E. Total Sisa Tagihan (Tunggakan Keseluruhan)
  const totalOutstanding = Math.max(0, totalBills - totalReceived);

  // F. Persentase Pelunasan Keseluruhan
  const overallPercentage = totalBills > 0 ? Math.min(100, Math.round((totalReceived / totalBills) * 100)) : 0;

  // Anggaran & Pengeluaran Kas
  const totalBudget = budgetList.reduce((acc, b) => acc + (b.total_budget || 0), 0);
  const totalExpenses = expensesList
    .filter(e => e.status === 'valid')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  // Saldo Kas Bersih Aktual: Total Uang Masuk (Gabungan) - Realisasi Kas Keluar
  const actualCashBalance = totalReceived - totalExpenses;

  // ==========================================
  // 3. GRAFIK & REKAP PEMBAYARAN PER ROMBONGAN
  // ==========================================
  const allRombonganSummaries = rombonganList.map(r => getRombonganFinancialSummary(r.id));
  
  // Urutan tertinggi (persentase pelunasan tertinggi & terbayar terbesar)
  const sortedByHighestPayment = [...allRombonganSummaries].sort(
    (a, b) => b.percentagePaid - a.percentagePaid || b.totalPaid - a.totalPaid
  );

  // Urutan sisa tunggakan terbesar (perlu ditindaklanjuti bendahara)
  const sortedByHighestOutstanding = [...allRombonganSummaries].sort(
    (a, b) => b.remainingBill - a.remainingBill
  );

  // Porsi Kontribusi Kas: Individual vs Kolektif
  const individualPercentageOfReceived = totalReceived > 0 ? Math.round((totalIndividualPaid / totalReceived) * 100) : 0;
  const coordinatorPercentageOfReceived = totalReceived > 0 ? Math.round((totalCoordinatorPaid / totalReceived) * 100) : 0;

  // Seat stats
  const totalBus = busesList.length;
  const totalBusCapacity = busesList.reduce((acc, b) => acc + (b.capacity || 0), 0);
  let totalAssignedSeats = 0;
  Object.values(busSeatsMap).forEach(seats => {
    totalAssignedSeats += seats.filter(s => s.role !== 'empty' && s.role !== 'driver' && s.role !== 'door' && s.occupant_id).length;
  });
  const emptySeats = Math.max(0, totalBusCapacity - totalAssignedSeats);

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
          <img src="/brand/logo-official.png" alt="watermark" className="w-44 sm:w-80 h-44 sm:h-80 object-contain" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-full text-[11px] font-semibold text-teal-soft mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sistem Operasional Ziarah Akbar 2027</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Dashboard Eksekutif & Keuangan Terpadu
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 mt-1.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
            Monitoring sinkron pembayaran individual jamaah mandiri, setoran kolektif koordinator rombongan, serta arus kas aktual tanpa duplikasi.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => onNavigate('rombongan')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-teal-soft text-midnight font-bold rounded-lg sm:rounded-xl text-xs hover:bg-white transition shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Data Rombongan</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-400 text-slate-900 font-bold rounded-lg sm:rounded-xl text-xs hover:bg-amber-300 transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Laporan Tunggakan Rombongan</span>
            </button>
            <button
              onClick={() => onNavigate('payments')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg sm:rounded-xl text-xs transition border border-white/20"
            >
              <Wallet className="w-3.5 h-3.5 text-teal-soft" />
              <span>Pusat Pembayaran</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. INFORMASI KEUANGAN (6 KARTU RESMI)                     */}
      {/* ========================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-teal-deep" />
            <span>Informasi Keuangan & Arus Kas Terpadu</span>
          </h3>
          <span className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:inline">
            Sinkronisasi Otomatis: Individual + Koordinator
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
          {/* Card 1: Total Tagihan Seluruh Jamaah */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold block">Total Tagihan (Target)</span>
            <div className="text-base sm:text-xl font-black text-slate-800 mt-1 font-mono">
              {formatRupiah(totalBills)}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{totalJamaah} Jamaah Terdaftar</span>
          </div>

          {/* Card 2: Total Pembayaran Individual */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-sky-200 bg-sky-50/20 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-sky-700 font-semibold block">Pembayaran Individual</span>
            <div className="text-base sm:text-xl font-black text-sky-700 mt-1 font-mono">
              {formatRupiah(totalIndividualPaid)}
            </div>
            <span className="text-[10px] text-sky-600 mt-0.5 block">{paymentsList.filter(p => p.status === 'valid').length} Trx Jamaah</span>
          </div>

          {/* Card 3: Total Setoran Koordinator */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-teal-700 font-semibold block">Setoran Koordinator</span>
            <div className="text-base sm:text-xl font-black text-teal-700 mt-1 font-mono">
              {formatRupiah(totalCoordinatorPaid)}
            </div>
            <span className="text-[10px] text-teal-600 mt-0.5 block">{rombonganPaymentsList.filter(p => p.status === 'valid').length} Trx Rombongan</span>
          </div>

          {/* Card 4: Total Uang Masuk Keseluruhan */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-emerald-800 font-bold block">Total Uang Masuk</span>
            <div className="text-base sm:text-xl font-black text-emerald-700 mt-1 font-mono">
              {formatRupiah(totalReceived)}
            </div>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Individual + Kolektif</span>
          </div>

          {/* Card 5: Total Sisa Tagihan */}
          <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs ${
            totalOutstanding === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50/30 border-rose-200'
          }`}>
            <span className={`text-[10px] sm:text-[11px] font-semibold block ${totalOutstanding === 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
              Total Sisa Tagihan
            </span>
            <div className={`text-base sm:text-xl font-black mt-1 font-mono ${totalOutstanding === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatRupiah(totalOutstanding)}
            </div>
            <span className={`text-[10px] mt-0.5 block ${totalOutstanding === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalOutstanding === 0 ? 'Lunas 100%' : 'Tunggakan Kas'}
            </span>
          </div>

          {/* Card 6: Persentase Pelunasan */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold block">% Pelunasan</span>
            <div className="text-base sm:text-xl font-black text-teal-deep mt-1 font-mono">
              {overallPercentage}%
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
              <div 
                className={`h-full ${overallPercentage >= 100 ? 'bg-emerald-500' : 'bg-teal-deep'}`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. INFORMASI JAMAAH                                       */}
      {/* ========================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-teal-deep" />
            <span>Informasi Jamaah & Distribusi Status</span>
          </h3>
          <button
            onClick={() => onNavigate('jamaah')}
            className="text-[11px] text-teal-deep hover:underline font-bold"
          >
            Lihat Semua Jamaah
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {/* Total Jamaah Terdaftar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold block">Total Jamaah Terdaftar</span>
            <div className="text-xl sm:text-2xl font-black text-midnight mt-1">
              {totalJamaah} <span className="text-xs font-normal text-slate-400">Orang</span>
            </div>
          </div>

          {/* Total Rombongan */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold block">Total Rombongan</span>
            <div className="text-xl sm:text-2xl font-black text-midnight mt-1">
              {totalRombongan} <span className="text-xs font-normal text-slate-400">Kelompok</span>
            </div>
          </div>

          {/* Total Jamaah Lunas */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-emerald-800 font-bold block">Jamaah Lunas</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
              {totalJamaahLunas} <span className="text-xs font-normal text-emerald-600">Orang</span>
            </div>
            <span className="text-[10px] text-emerald-600">
              {totalJamaah > 0 ? Math.round((totalJamaahLunas / totalJamaah) * 100) : 0}% Jamaah
            </span>
          </div>

          {/* Total Jamaah yang Masih Cicilan */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs">
            <span className="text-[10px] sm:text-[11px] text-teal-800 font-bold block">Masih Cicilan</span>
            <div className="text-xl sm:text-2xl font-black text-teal-700 mt-1">
              {totalJamaahCicilan} <span className="text-xs font-normal text-teal-600">Orang</span>
            </div>
            <span className="text-[10px] text-teal-600">
              {totalJamaah > 0 ? Math.round((totalJamaahCicilan / totalJamaah) * 100) : 0}% Jamaah
            </span>
          </div>

          {/* Total Jamaah Belum Bayar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] sm:text-[11px] text-rose-800 font-bold block">Belum Bayar (Belum Lunas: {totalJamaahBelumLunas})</span>
            <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
              {totalJamaahBelumBayar} <span className="text-xs font-normal text-rose-600">Orang</span>
            </div>
            <span className="text-[10px] text-rose-600">
              {totalJamaah > 0 ? Math.round((totalJamaahBelumBayar / totalJamaah) * 100) : 0}% Jamaah
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. GRAFIK DASHBOARD & REKAP PER ROMBONGAN                  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        
        {/* Panel Kiri: Grafik Komposisi Pembayaran & Perkembangan Kas */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-teal-deep" />
              <span>Komposisi Pembayaran: Individual vs Koordinator</span>
            </h4>
            <span className="text-[10px] text-slate-400">Total: {formatRupiah(totalReceived)}</span>
          </div>

          {/* Visual Stacked Bar Chart */}
          <div className="space-y-2">
            <div className="w-full bg-slate-100 h-6 rounded-xl overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${individualPercentageOfReceived}%` }}
                className="bg-sky-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all"
                title={`Individual: ${formatRupiah(totalIndividualPaid)} (${individualPercentageOfReceived}%)`}
              >
                {individualPercentageOfReceived > 15 ? `${individualPercentageOfReceived}%` : ''}
              </div>
              <div 
                style={{ width: `${coordinatorPercentageOfReceived}%` }}
                className="bg-teal-600 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all"
                title={`Koordinator: ${formatRupiah(totalCoordinatorPaid)} (${coordinatorPercentageOfReceived}%)`}
              >
                {coordinatorPercentageOfReceived > 15 ? `${coordinatorPercentageOfReceived}%` : ''}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-sky-800 font-bold block">Pembayaran Individual</span>
                  <span className="font-mono font-bold text-sky-900">{formatRupiah(totalIndividualPaid)}</span>
                </div>
                <span className="text-xs font-black text-sky-700">{individualPercentageOfReceived}%</span>
              </div>

              <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-800 font-bold block">Setoran Koordinator</span>
                  <span className="font-mono font-bold text-teal-900">{formatRupiah(totalCoordinatorPaid)}</span>
                </div>
                <span className="text-xs font-black text-teal-700">{coordinatorPercentageOfReceived}%</span>
              </div>
            </div>
          </div>

          {/* Status Saldo Kas Bersih */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Saldo Kas Aktual (Uang Masuk - Kas Keluar):</span>
              <span className={`text-sm sm:text-base font-black ${actualCashBalance >= 0 ? 'text-teal-deep' : 'text-rose-600'}`}>
                {formatRupiah(actualCashBalance)}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <span>Pengeluaran: </span>
              <strong className="text-rose-600">{formatRupiah(totalExpenses)}</strong>
            </div>
          </div>
        </div>

        {/* Panel Kanan: Rekap Rombongan Tertinggi & Terendah */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Rekap Pelunasan & Tunggakan Rombongan</span>
            </h4>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[11px] text-teal-deep hover:underline font-bold"
            >
              Lihat Laporan Lengkap
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Top 1 Pembayaran Tertinggi */}
            {sortedByHighestPayment.length > 0 && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-black text-[9px] rounded">TERTINGGI</span>
                    <span className="font-bold text-emerald-900">{sortedByHighestPayment[0].rombongan.name}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 mt-0.5 block">
                    Koord: {sortedByHighestPayment[0].rombongan.coordinator_name || '-'} • {sortedByHighestPayment[0].totalMembers} Jamaah
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-800 block text-xs">
                    {formatRupiah(sortedByHighestPayment[0].totalPaid)}
                  </span>
                  <span className="text-[10px] font-black text-emerald-600">{sortedByHighestPayment[0].percentagePaid}% Lunas</span>
                </div>
              </div>
            )}

            {/* Top 1 Tunggakan Terbesar */}
            {sortedByHighestOutstanding.length > 0 && sortedByHighestOutstanding[0].remainingBill > 0 && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 bg-rose-600 text-white font-black text-[9px] rounded">SISA TUNGGAKAN TERBESAR</span>
                    <span className="font-bold text-rose-900">{sortedByHighestOutstanding[0].rombongan.name}</span>
                  </div>
                  <span className="text-[10px] text-rose-700 mt-0.5 block">
                    Koord: {sortedByHighestOutstanding[0].rombongan.coordinator_name || '-'} • {sortedByHighestOutstanding[0].totalMembers} Jamaah
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-rose-800 block text-xs">
                    {formatRupiah(sortedByHighestOutstanding[0].remainingBill)}
                  </span>
                  <span className="text-[10px] text-rose-600 font-semibold">Perlu tindak lanjut</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Operasional Armada Bus */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <BusIcon className="w-4 h-4 text-teal-deep" />
            <span>Kesiapan Operasional Armada Bus</span>
          </h4>
          <span className="text-[11px] text-slate-400">Total {totalBus} Armada Bus</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500">Total Armada:</span>
            <strong className="text-midnight">{totalBus} Unit</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500">Total Kapasitas:</span>
            <strong className="text-slate-800">{totalBusCapacity} Kursi</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500">Kursi Terisi:</span>
            <strong className="text-emerald-700">{totalAssignedSeats} Kursi</strong>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-slate-500">Kursi Kosong:</span>
            <strong className="text-amber-700">{emptySeats} Kursi</strong>
          </div>
        </div>
      </div>

    </div>
  );
};
