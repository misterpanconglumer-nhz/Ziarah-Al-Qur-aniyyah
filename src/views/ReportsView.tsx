import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatRupiah, formatDateId, parsePaymentMethodNote } from '../utils/formatters';
import { 
  exportJamaahToExcel, 
  exportPaymentsToExcel, 
  exportRombonganTunggakanToExcel,
  exportUnifiedFinancialToExcel
} from '../utils/excel';
import { 
  exportFinancialReportPDF, 
  exportBusVisualChartPDF,
  exportRombonganTunggakanPDF
} from '../utils/pdf';
import { RombonganPaymentDetailModal } from '../components/RombonganPaymentDetailModal';
import { Rombongan, RombonganFinancialSummary } from '../types';
import { 
  FileText, 
  Download, 
  Printer, 
  Wallet, 
  Users, 
  Bus as BusIcon, 
  Clock, 
  ArrowDownRight, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet,
  Search,
  Filter,
  Layers,
  Phone,
  ExternalLink,
  ChevronRight,
  Calendar,
  Check,
  Eye
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { 
    jamaahList, 
    rombonganList, 
    busesList, 
    paymentsList, 
    rombonganPaymentsList,
    budgetList, 
    expensesList,
    getRombonganFinancialSummary,
    getSeatsForBus,
    showToast 
  } = useApp();

  type ReportTabType = 'tunggakan_rombongan' | 'individual_payments' | 'unified_financial' | 'financial' | 'bus';
  const [activeReportTab, setActiveReportTab] = useState<ReportTabType>('tunggakan_rombongan');

  // Modal Detail Pembayaran Rombongan
  const [selectedRombonganForPayment, setSelectedRombonganForPayment] = useState<Rombongan | null>(null);

  // ==========================================
  // TAB 1: TUNGGAKAN ROMBONGAN DATA & FILTERS
  // ==========================================
  const [rombonganFilterStatus, setRombonganFilterStatus] = useState<'ALL' | 'BELUM_BAYAR' | 'CICILAN' | 'LUNAS'>('ALL');
  const [rombonganSearchQuery, setRombonganSearchQuery] = useState('');
  const [rombonganBusFilter, setRombonganBusFilter] = useState('ALL');

  // Get financial summaries for all rombongan
  const collectiveRombonganList = useMemo(() => {
    return rombonganList;
  }, [rombonganList]);

  const allRombonganSummaries = useMemo<RombonganFinancialSummary[]>(() => {
    return collectiveRombonganList
      .map(r => getRombonganFinancialSummary(r.id))
      // Sort by largest tunggakan descending, then name
      .sort((a, b) => b.remainingBill - a.remainingBill || a.rombongan.name.localeCompare(b.rombongan.name));
  }, [collectiveRombonganList, getRombonganFinancialSummary]);

  // Filtered summaries
  const filteredRombonganSummaries = useMemo(() => {
    const q = rombonganSearchQuery.toLowerCase().trim();
    return allRombonganSummaries.filter(s => {
      // Search
      const matchSearch = 
        !q || 
        s.rombongan.name.toLowerCase().includes(q) ||
        (s.rombongan.coordinator_name && s.rombongan.coordinator_name.toLowerCase().includes(q)) ||
        (s.rombongan.coordinator_phone && s.rombongan.coordinator_phone.includes(q));

      if (!matchSearch) return false;

      // Status
      if (rombonganFilterStatus === 'BELUM_BAYAR' && s.status !== 'BELUM BAYAR') return false;
      if (rombonganFilterStatus === 'CICILAN' && s.status !== 'CICILAN') return false;
      if (rombonganFilterStatus === 'LUNAS' && s.status !== 'LUNAS' && s.status !== 'KELEBIHAN BAYAR') return false;

      // Bus
      if (rombonganBusFilter !== 'ALL' && s.rombongan.bus_id !== rombonganBusFilter) return false;

      return true;
    });
  }, [allRombonganSummaries, rombonganSearchQuery, rombonganFilterStatus, rombonganBusFilter]);

  // Rombongan Stats
  const totalRombonganCount = allRombonganSummaries.length;
  const totalRombonganLunas = allRombonganSummaries.filter(s => s.status === 'LUNAS' || s.status === 'KELEBIHAN BAYAR').length;
  const totalRombonganBelumLunas = allRombonganSummaries.filter(s => s.status === 'BELUM BAYAR' || s.status === 'CICILAN').length;
  const totalTunggakanRombongan = allRombonganSummaries.reduce((acc, s) => acc + s.remainingBill, 0);
  const totalTagihanRombongan = allRombonganSummaries.reduce((acc, s) => acc + s.totalBill, 0);
  const totalSetoranRombongan = allRombonganSummaries.reduce((acc, s) => acc + s.totalPaid, 0);

  // ==========================================
  // TAB 2: INDIVIDUAL PAYMENTS DATA & FILTERS
  // ==========================================
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');
  const [individualFilterStatus, setIndividualFilterStatus] = useState<'ALL' | 'Lunas' | 'Cicilan' | 'Belum Bayar'>('ALL');

  const individualJamaahList = useMemo(() => {
    return jamaahList;
  }, [jamaahList]);

  const filteredIndividualJamaah = useMemo(() => {
    const q = individualSearchQuery.toLowerCase().trim();
    return individualJamaahList.filter(j => {
      const matchSearch = 
        !q ||
        j.name.toLowerCase().includes(q) ||
        j.id.toLowerCase().includes(q) ||
        (j.phone && j.phone.includes(q));

      if (!matchSearch) return false;
      if (individualFilterStatus !== 'ALL' && j.payment_status !== individualFilterStatus) return false;
      return true;
    });
  }, [individualJamaahList, individualSearchQuery, individualFilterStatus]);

  const totalIndividualPaid = Math.max(
    individualJamaahList.reduce((acc, j) => acc + (j.total_paid || 0), 0),
    paymentsList.filter(p => p.status === 'valid').reduce((acc, p) => acc + (p.amount || 0), 0)
  );
  const totalIndividualBills = individualJamaahList.reduce((acc, j) => acc + (j.bill_amount || 0), 0);
  const totalIndividualOutstanding = Math.max(0, totalIndividualBills - totalIndividualPaid);
  const totalIndividualLunas = individualJamaahList.filter(j => j.payment_status === 'Lunas').length;
  const totalIndividualBelumLunas = individualJamaahList.filter(j => j.payment_status !== 'Lunas').length;

  // ==========================================
  // TAB 3: UNIFIED FINANCIAL TRANSACTIONS
  // ==========================================
  const [unifiedTypeFilter, setUnifiedTypeFilter] = useState<'ALL' | 'kolektif' | 'individual'>('ALL');
  const [unifiedMethodFilter, setUnifiedMethodFilter] = useState('ALL');
  const [unifiedStartDate, setUnifiedStartDate] = useState('');
  const [unifiedEndDate, setUnifiedEndDate] = useState('');

  // Build combined list of transactions
  const unifiedTransactions = useMemo(() => {
    // 1. Collective Rombongan Transactions
    const collectiveTrx = rombonganPaymentsList.map(rp => ({
      id: rp.id,
      type: 'kolektif' as const,
      subjectName: rp.rombongan_name || rp.rombongan_id,
      subjectDetail: `Rombongan (${rp.rombongan_id})`,
      date: rp.date,
      amount: rp.amount,
      payment_method: rp.payment_method,
      reference_number: rp.reference_number,
      notes: rp.notes,
      proof_url: rp.receipt_url,
      status: rp.status
    }));

    // 2. Individual Jamaah Transactions
    const individualTrx = paymentsList.map(ip => ({
      id: ip.id,
      type: 'individual' as const,
      subjectName: ip.jamaah_name || ip.jamaah_id,
      subjectDetail: `Jamaah Mandiri (${ip.jamaah_id})`,
      date: ip.date,
      amount: ip.amount,
      payment_method: ip.payment_method,
      reference_number: ip.reference_number,
      notes: ip.notes,
      proof_url: undefined,
      status: ip.status
    }));

    // Merge and sort by date descending
    return [...collectiveTrx, ...individualTrx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rombonganPaymentsList, paymentsList]);

  const filteredUnifiedTransactions = useMemo(() => {
    return unifiedTransactions.filter(t => {
      if (unifiedTypeFilter !== 'ALL' && t.type !== unifiedTypeFilter) return false;
      if (unifiedMethodFilter !== 'ALL' && t.payment_method !== unifiedMethodFilter) return false;
      if (unifiedStartDate && t.date < unifiedStartDate) return false;
      if (unifiedEndDate && t.date > unifiedEndDate) return false;
      return true;
    });
  }, [unifiedTransactions, unifiedTypeFilter, unifiedMethodFilter, unifiedStartDate, unifiedEndDate]);

  const totalUnifiedReceived = filteredUnifiedTransactions
    .filter(t => t.status === 'valid')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalUnifiedKolektif = filteredUnifiedTransactions
    .filter(t => t.type === 'kolektif' && t.status === 'valid')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalUnifiedIndividual = filteredUnifiedTransactions
    .filter(t => t.type === 'individual' && t.status === 'valid')
    .reduce((acc, t) => acc + t.amount, 0);

  // ==========================================
  // TAB 4: GENERAL BUDGET & EXPENSES
  // ==========================================
  const totalCombinedBill = totalTagihanRombongan + totalIndividualBills;
  const totalCombinedPaid = totalSetoranRombongan + totalIndividualPaid;
  const totalCombinedOutstanding = Math.max(0, totalCombinedBill - totalCombinedPaid);

  const totalBudget = budgetList.reduce((acc, b) => acc + (b.total_budget || 0), 0);
  const validExpenses = expensesList.filter(e => e.status === 'valid');
  const totalExpenses = validExpenses.reduce((acc, e) => acc + e.amount, 0);
  const actualCashBalance = totalCombinedPaid - totalExpenses;

  // Handlers for Exports
  const handleExportRombonganExcel = () => {
    exportRombonganTunggakanToExcel(filteredRombonganSummaries);
    showToast('Laporan Pembayaran & Tunggakan Rombongan berhasil diekspor ke Excel!', 'success');
  };

  const handleExportRombonganPDF = () => {
    exportRombonganTunggakanPDF(filteredRombonganSummaries, {
      totalRombongan: totalRombonganCount,
      totalLunas: totalRombonganLunas,
      totalBelumLunas: totalRombonganBelumLunas,
      totalTunggakan: totalTunggakanRombongan,
      totalTagihan: totalTagihanRombongan,
      totalSetoran: totalSetoranRombongan
    });
    showToast('Laporan Tunggakan Rombongan berhasil dicetak ke PDF!', 'success');
  };

  const handleExportUnifiedExcel = () => {
    exportUnifiedFinancialToExcel(filteredUnifiedTransactions);
    showToast('Laporan Keuangan Gabungan berhasil diekspor ke Excel!', 'success');
  };

  const handleExportFinancialPDF = () => {
    exportFinancialReportPDF(
      {
        totalParticipants: jamaahList.length,
        totalTargetBill: totalCombinedBill,
        totalReceived: totalCombinedPaid,
        totalOutstanding: totalCombinedOutstanding,
        totalBudget,
        totalExpenses,
        actualCashBalance
      },
      validExpenses
    );
    showToast('Laporan Keuangan Resmi berhasil dicetak ke PDF!', 'success');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-deep" />
            <span>Pusat Laporan & Rekapitulasi Ziarah 2027</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan pembayaran kolektif rombongan, jamaah individual, rekap gabungan, serta manifes resmi armada.
          </p>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center gap-2">
          {activeReportTab === 'tunggakan_rombongan' && (
            <>
              <button
                onClick={handleExportRombonganExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={handleExportRombonganPDF}
                className="flex items-center gap-1.5 px-3 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF</span>
              </button>
            </>
          )}

          {activeReportTab === 'unified_financial' && (
            <button
              onClick={handleExportUnifiedExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Kas Gabungan</span>
            </button>
          )}

          {activeReportTab === 'financial' && (
            <button
              onClick={handleExportFinancialPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF Neraca</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 no-scrollbar gap-1 sm:gap-2">
        <button
          onClick={() => setActiveReportTab('tunggakan_rombongan')}
          className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
            activeReportTab === 'tunggakan_rombongan'
              ? 'border-midnight text-midnight bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-600" />
          <span>Tunggakan Rombongan</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-extrabold">
            {totalRombonganBelumLunas}
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('individual_payments')}
          className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
            activeReportTab === 'individual_payments'
              ? 'border-midnight text-midnight bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-teal-deep" />
          <span>Pembayaran Individual</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
            {individualJamaahList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveReportTab('unified_financial')}
          className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
            activeReportTab === 'unified_financial'
              ? 'border-midnight text-midnight bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-600" />
          <span>Laporan Kas Gabungan</span>
        </button>

        <button
          onClick={() => setActiveReportTab('financial')}
          className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
            activeReportTab === 'financial'
              ? 'border-midnight text-midnight bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-sky-600" />
          <span>Rekap Kas & Neraca</span>
        </button>

        <button
          onClick={() => setActiveReportTab('bus')}
          className={`py-2.5 px-3 sm:px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 shrink-0 ${
            activeReportTab === 'bus'
              ? 'border-midnight text-midnight bg-white rounded-t-xl shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BusIcon className="w-4 h-4 text-slate-600" />
          <span>Manifest Armada Bus</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LAPORAN PEMBAYARAN DAN TUNGGAKAN ROMBONGAN        */}
      {/* ========================================================= */}
      {activeReportTab === 'tunggakan_rombongan' && (
        <div className="space-y-4">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Card 1 */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 font-semibold block">Total Rombongan</span>
              <div className="text-xl sm:text-2xl font-extrabold text-midnight mt-1">
                {totalRombonganCount} <span className="text-xs font-medium text-slate-400">Kelompok</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Total Tagihan: <strong className="text-slate-700">{formatRupiah(totalTagihanRombongan)}</strong>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] text-emerald-800 font-semibold block">Rombongan Lunas</span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">
                {totalRombonganLunas} <span className="text-xs font-medium text-emerald-600">Lunas</span>
              </div>
              <div className="mt-1 text-[10px] text-emerald-700">
                Setoran Masuk: <strong>{formatRupiah(totalSetoranRombongan)}</strong>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <span className="text-[11px] text-amber-800 font-semibold block">Belum Lunas / Cicilan</span>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">
                {totalRombonganBelumLunas} <span className="text-xs font-medium text-amber-600">Rombongan</span>
              </div>
              <div className="mt-1 text-[10px] text-amber-700">
                Perlu tindak lanjut bendahara
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <span className="text-[11px] text-rose-800 font-semibold block">Total Sisa Tunggakan</span>
              <div className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1">
                {formatRupiah(totalTunggakanRombongan)}
              </div>
              <div className="mt-1 text-[10px] text-rose-700">
                Sisa kekurangan setoran kelompok
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama rombongan, koordinator, atau nomor WhatsApp..."
                value={rombonganSearchQuery}
                onChange={e => setRombonganSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-deep focus:border-teal-deep outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Status */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setRombonganFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    rombonganFilterStatus === 'ALL' ? 'bg-white text-midnight shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setRombonganFilterStatus('BELUM_BAYAR')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    rombonganFilterStatus === 'BELUM_BAYAR' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Belum Bayar
                </button>
                <button
                  onClick={() => setRombonganFilterStatus('CICILAN')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    rombonganFilterStatus === 'CICILAN' ? 'bg-teal-deep text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Masih Cicilan
                </button>
                <button
                  onClick={() => setRombonganFilterStatus('LUNAS')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    rombonganFilterStatus === 'LUNAS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lunas
                </button>
              </div>

              {/* Filter Bus */}
              <select
                value={rombonganBusFilter}
                onChange={e => setRombonganBusFilter(e.target.value)}
                className="py-1.5 px-3 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 outline-hidden"
              >
                <option value="ALL">Semua Armada Bus</option>
                {busesList.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Laporan Tunggakan (11 Kolom Sesuai Persyaratan) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 sm:p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xs sm:text-sm tracking-wide">
                  LAPORAN PEMBAYARAN DAN TUNGGAKAN ROMBONGAN
                </h3>
                <p className="text-[11px] text-teal-soft">
                  Urutan: Sisa tunggakan terbesar di atas • {filteredRombonganSummaries.length} Rombongan Ditampilkan
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3">Nama Rombongan</th>
                    <th className="py-3 px-3">Nama Pimpinan</th>
                    <th className="py-3 px-3">Nomor WhatsApp</th>
                    <th className="py-3 px-3 text-center">Jml Jamaah</th>
                    <th className="py-3 px-3 text-right">Total Tagihan</th>
                    <th className="py-3 px-3 text-right">Total Setoran</th>
                    <th className="py-3 px-3 text-right">Sisa Pembayaran</th>
                    <th className="py-3 px-3 text-center">% Lunas</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRombonganSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Tidak ada data rombongan yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredRombonganSummaries.map((s, idx) => {
                      const cleanPhone = (s.rombongan.coordinator_phone || '').replace(/[^0-9]/g, '');
                      const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}` : null;

                      let statusBadge = 'bg-amber-100 text-amber-800 border-amber-200';
                      if (s.status === 'LUNAS') statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
                      if (s.status === 'CICILAN') statusBadge = 'bg-teal-100 text-teal-800 border-teal-200 font-bold';
                      if (s.status === 'BELUM BAYAR') statusBadge = 'bg-rose-100 text-rose-800 border-rose-200 font-bold';

                      return (
                        <tr key={s.rombongan.id} className="hover:bg-slate-50/80 transition">
                          {/* 1. Nomor */}
                          <td className="py-3 px-3 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>

                          {/* 2. Nama Rombongan */}
                          <td className="py-3 px-3 font-extrabold text-midnight">
                            {s.rombongan.name}
                            {s.rombongan.bus_name && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Armada: {s.rombongan.bus_name}
                              </span>
                            )}
                          </td>

                          {/* 3. Nama Pimpinan */}
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {s.rombongan.coordinator_name || '-'}
                          </td>

                          {/* 4. Nomor WhatsApp */}
                          <td className="py-3 px-3 text-slate-600">
                            {waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
                              >
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{s.rombongan.coordinator_phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* 5. Jumlah Jamaah */}
                          <td className="py-3 px-3 text-center font-bold text-midnight">
                            {s.memberCount} <span className="text-[10px] font-normal text-slate-500">Org</span>
                          </td>

                          {/* 6. Total Tagihan */}
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            {formatRupiah(s.totalBill)}
                          </td>

                          {/* 7. Total Setoran */}
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">
                            {formatRupiah(s.totalPaid)}
                          </td>

                          {/* 8. Sisa Pembayaran */}
                          <td className="py-3 px-3 text-right font-extrabold">
                            <span className={s.remainingBill > 0 ? 'text-rose-600' : 'text-slate-400'}>
                              {formatRupiah(s.remainingBill)}
                            </span>
                          </td>

                          {/* 9. Persentase Pembayaran */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-extrabold text-[11px] text-teal-deep">{s.percentage}%</span>
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full ${s.percentage >= 100 ? 'bg-emerald-500' : 'bg-teal-500'}`}
                                  style={{ width: `${Math.min(100, s.percentage)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 10. Status */}
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${statusBadge}`}>
                              {s.status}
                            </span>
                          </td>

                          {/* 11. Detail */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedRombonganForPayment(s.rombongan)}
                              className="px-2.5 py-1 bg-teal-soft hover:bg-teal-500 text-midnight hover:text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 mx-auto shadow-2xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Detail</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LAPORAN PEMBAYARAN INDIVIDUAL                      */}
      {/* ========================================================= */}
      {activeReportTab === 'individual_payments' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 font-semibold block">Total Jamaah Mandiri</span>
              <div className="text-xl sm:text-2xl font-extrabold text-midnight mt-1">
                {individualJamaahList.length} <span className="text-xs font-medium text-slate-400">Orang</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Pendaftar mandiri non-rombongan
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] text-emerald-800 font-semibold block">Jamaah Lunas</span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">
                {totalIndividualLunas} <span className="text-xs font-medium text-emerald-600">Lunas</span>
              </div>
              <div className="mt-1 text-[10px] text-emerald-700">
                Uang Masuk: <strong>{formatRupiah(totalIndividualPaid)}</strong>
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <span className="text-[11px] text-amber-800 font-semibold block">Belum Lunas / Cicilan</span>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-1">
                {totalIndividualBelumLunas} <span className="text-xs font-medium text-amber-600">Jamaah</span>
              </div>
              <div className="mt-1 text-[10px] text-amber-700">
                Sisa Tagihan: <strong className="text-amber-800">{formatRupiah(totalIndividualOutstanding)}</strong>
              </div>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Export Data</span>
                <p className="text-xs font-bold text-slate-800 mt-0.5">Daftar Mandiri (.xlsx)</p>
              </div>
              <button
                onClick={() => exportJamaahToExcel(filteredIndividualJamaah, 'Laporan_Pembayaran_Jamaah_Mandiri_Ziarah_2027.xlsx')}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama jamaah mandiri atau no telepon..."
                value={individualSearchQuery}
                onChange={e => setIndividualSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-deep outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setIndividualFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  individualFilterStatus === 'ALL' ? 'bg-white text-midnight shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setIndividualFilterStatus('Lunas')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  individualFilterStatus === 'Lunas' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lunas
              </button>
              <button
                onClick={() => setIndividualFilterStatus('Cicilan')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  individualFilterStatus === 'Cicilan' ? 'bg-teal-deep text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cicilan
              </button>
              <button
                onClick={() => setIndividualFilterStatus('Belum Bayar')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  individualFilterStatus === 'Belum Bayar' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Belum Bayar
              </button>
            </div>
          </div>

          {/* Table Individual */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3">Nama Jamaah</th>
                    <th className="py-3 px-3">Nomor Telepon</th>
                    <th className="py-3 px-3">Armada Bus & Kursi</th>
                    <th className="py-3 px-3 text-right">Total Tagihan</th>
                    <th className="py-3 px-3 text-right">Total Pembayaran</th>
                    <th className="py-3 px-3 text-right">Sisa Pembayaran</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIndividualJamaah.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada data jamaah mandiri yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredIndividualJamaah.map((j, idx) => (
                      <tr key={j.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3 font-extrabold text-midnight">
                          {j.name}
                          <span className="block text-[10px] text-slate-400 font-normal">{j.id}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{j.phone || '-'}</td>
                        <td className="py-3 px-3 text-slate-600">
                          {j.bus_name || 'Belum Diatur'}
                          {j.seat_number && <span className="text-[10px] text-teal-deep font-bold ml-1">({j.seat_number})</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">{formatRupiah(j.bill_amount)}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatRupiah(j.total_paid)}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-rose-600">{formatRupiah(j.remaining_amount)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            j.payment_status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' :
                            j.payment_status === 'Cicilan' ? 'bg-teal-100 text-teal-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {j.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PUSAT LAPORAN KEUANGAN GABUNGAN                     */}
      {/* ========================================================= */}
      {activeReportTab === 'unified_financial' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 font-semibold block">Total Kas Masuk Terkumpul</span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">
                {formatRupiah(totalUnifiedReceived)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                {filteredUnifiedTransactions.filter(t => t.status === 'valid').length} Transaksi Valid
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs">
              <span className="text-[11px] text-teal-800 font-semibold block">Dari Kolektif Rombongan</span>
              <div className="text-xl sm:text-2xl font-extrabold text-teal-deep mt-1">
                {formatRupiah(totalUnifiedKolektif)}
              </div>
              <div className="mt-1 text-[10px] text-teal-700">
                Setoran bertahap kelompok majelis & alumni
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-xs">
              <span className="text-[11px] text-sky-800 font-semibold block">Dari Jamaah Individual</span>
              <div className="text-xl sm:text-2xl font-extrabold text-sky-700 mt-1">
                {formatRupiah(totalUnifiedIndividual)}
              </div>
              <div className="mt-1 text-[10px] text-sky-700">
                Pendaftaran & pelunasan mandiri
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setUnifiedTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    unifiedTypeFilter === 'ALL' ? 'bg-white text-midnight shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua Sumber
                </button>
                <button
                  onClick={() => setUnifiedTypeFilter('kolektif')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    unifiedTypeFilter === 'kolektif' ? 'bg-teal-deep text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kolektif Rombongan
                </button>
                <button
                  onClick={() => setUnifiedTypeFilter('individual')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    unifiedTypeFilter === 'individual' ? 'bg-midnight text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Individual Jamaah
                </button>
              </div>

              {/* Method Filter */}
              <select
                value={unifiedMethodFilter}
                onChange={e => setUnifiedMethodFilter(e.target.value)}
                className="py-1.5 px-3 text-xs border border-slate-300 rounded-xl bg-white text-slate-700 outline-hidden"
              >
                <option value="ALL">Semua Metode Pembayaran</option>
                <option value="Tunai">Tunai</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium text-[11px]">Tanggal:</span>
              <input
                type="date"
                value={unifiedStartDate}
                onChange={e => setUnifiedStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={unifiedEndDate}
                onChange={e => setUnifiedEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg outline-hidden"
              />
              {(unifiedStartDate || unifiedEndDate) && (
                <button
                  onClick={() => { setUnifiedStartDate(''); setUnifiedEndDate(''); }}
                  className="text-[10px] text-rose-600 hover:underline font-bold"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table Gabungan */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3">Sumber Pembayaran</th>
                    <th className="py-3 px-3">Nama Rombongan / Jamaah</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3 text-right">Nominal</th>
                    <th className="py-3 px-3">Metode</th>
                    <th className="py-3 px-3">No. Referensi / Kwitansi</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnifiedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Tidak ada transaksi keuangan pada rentang filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredUnifiedTransactions.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          {t.type === 'kolektif' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-200">
                              <Layers className="w-2.5 h-2.5" />
                              <span>KOLEKTIF ROMBONGAN</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              <Users className="w-2.5 h-2.5" />
                              <span>INDIVIDUAL MANDIRI</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-midnight">
                          {t.subjectName}
                          <span className="block text-[10px] text-slate-400 font-normal">{t.subjectDetail}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{formatDateId(t.date)}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                          {formatRupiah(t.amount)}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{t.payment_method}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{t.reference_number || '-'}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'valid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {t.status === 'valid' ? 'Valid' : 'VOID'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px] max-w-[200px] truncate">{t.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: REKAPITULASI KAS & NERACA OPERASIONAL              */}
      {/* ========================================================= */}
      {activeReportTab === 'financial' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm tracking-tight">
                  LAPORAN RINGKASAN KEUANGAN & KAS OPERASIONAL
                </h3>
                <p className="text-[11px] text-teal-soft">
                  Ziarah Akbar Al-Qur'aniyyah 2027 • Status Real-Time Terpadu
                </p>
              </div>
              <button
                onClick={handleExportFinancialPDF}
                className="px-3 py-1.5 bg-teal-deep hover:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PDF</span>
              </button>
            </div>

            <div className="p-6 divide-y divide-slate-100 text-xs">
              <div className="py-3 flex justify-between items-center">
                <span className="font-medium text-slate-600">Total Seluruh Jamaah Terdaftar</span>
                <span className="font-extrabold text-midnight text-sm">
                  {jamaahList.length.toLocaleString('id-ID')} Orang
                </span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-medium text-slate-600 block">Total Target Tagihan (Pemasukan Ditargetkan)</span>
                  <span className="text-[10px] text-slate-400">Total nominal biaya seluruh rombongan & jamaah mandiri</span>
                </div>
                <span className="font-bold text-slate-800 text-sm">
                  {formatRupiah(totalCombinedBill)}
                </span>
              </div>

              <div className="py-3 flex justify-between items-center bg-emerald-50/50 px-2 rounded-lg">
                <div>
                  <span className="font-bold text-emerald-900 block">(+) Total Pembayaran Diterima (Kas Masuk Aktual)</span>
                  <span className="text-[10px] text-emerald-700">Setoran kolektif rombongan + jamaah mandiri masuk bendahara</span>
                </div>
                <span className="font-extrabold text-emerald-700 text-base">
                  {formatRupiah(totalCombinedPaid)}
                </span>
              </div>

              <div className="py-3 flex justify-between items-center bg-rose-50/50 px-2 rounded-lg">
                <div>
                  <span className="font-bold text-rose-900 block">(-) Total Realisasi Kas Keluar (Pengeluaran Aktual)</span>
                  <span className="text-[10px] text-rose-700">DP sewa bus, tol, konsumsi, doorprize, dan retribusi</span>
                </div>
                <span className="font-extrabold text-rose-700 text-base">
                  {formatRupiah(totalExpenses)}
                </span>
              </div>

              <div className="py-4 flex justify-between items-center bg-midnight text-white px-4 rounded-2xl mt-3 shadow-md">
                <div>
                  <span className="font-extrabold text-sm block">(=) SALDO KAS AKTUAL BERSIH SAAT INI</span>
                  <span className="text-[10px] text-teal-soft">Kas Masuk Aktual dikurangi Realisasi Kas Keluar</span>
                </div>
                <span className="font-extrabold text-xl text-teal-soft">
                  {formatRupiah(actualCashBalance)}
                </span>
              </div>

              <div className="py-3 flex justify-between items-center pt-4">
                <div>
                  <span className="font-medium text-amber-900 block">Sisa Tagihan Belum Dibayar (Piutang Jamaah & Rombongan)</span>
                  <span className="text-[10px] text-slate-400">Belum masuk ke kas bendahara</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-700 text-sm">{formatRupiah(totalCombinedOutstanding)}</span>
                  <button
                    onClick={() => setActiveReportTab('tunggakan_rombongan')}
                    className="block text-[10px] text-teal-deep hover:underline font-bold mt-0.5"
                  >
                    Buka Laporan Tunggakan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MANIFEST ARMADA BUS                                */}
      {/* ========================================================= */}
      {activeReportTab === 'bus' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-sm text-midnight">Rekapitulasi Manifest Armada Bus</h3>
          <p className="text-xs text-slate-500">
            Daftar resmi seluruh bus, nama sopir, tour leader, pembimbing, dan alokasi kursi penumpang.
          </p>

          <div className="space-y-3 pt-2">
            {busesList.map(bus => {
              const pass = jamaahList.filter(j => j.bus_id === bus.id);
              const staff = bus.staff || [];

              return (
                <div key={bus.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-midnight text-sm">{bus.name}</h4>
                      <span className="px-2 py-0.5 bg-slate-200 rounded font-semibold text-[10px]">
                        {bus.operator}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Kapasitas: {bus.capacity} Kursi • Terisi: {pass.length + staff.length} Orang
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const seats = getSeatsForBus(bus.id);
                        exportBusVisualChartPDF(bus, seats, bus.staff || [], rombonganList);
                        showToast(`Denah resmi 59 kursi ${bus.name} berhasil diunduh!`, 'success');
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition flex items-center gap-1 shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-deep" />
                      <span>Cetak Denah A4</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Detail Pembayaran Rombongan */}
      {selectedRombonganForPayment && (
        <RombonganPaymentDetailModal
          rombongan={selectedRombonganForPayment}
          isOpen={true}
          onClose={() => setSelectedRombonganForPayment(null)}
        />
      )}
    </div>
  );
};
