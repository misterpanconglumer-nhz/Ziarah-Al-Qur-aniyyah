import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatRupiah, formatDateId } from '../utils/formatters';
import { exportJamaahToExcel, exportPaymentsToExcel } from '../utils/excel';
import { exportFinancialReportPDF } from '../utils/pdf';
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
  FileSpreadsheet
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { 
    jamaahList, 
    rombonganList, 
    busesList, 
    paymentsList, 
    budgetList, 
    expensesList,
    showToast 
  } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'financial' | 'jamaah' | 'bus'>('financial');

  // Financial calculations
  const totalTargetBill = jamaahList.reduce((acc, j) => acc + (j.bill_amount || 0), 0);
  const validPayments = paymentsList.filter(p => p.status === 'valid');
  const totalReceived = validPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalOutstanding = Math.max(0, totalTargetBill - totalReceived);

  const totalBudget = budgetList.reduce((acc, b) => acc + (b.total_budget || 0), 0);
  const validExpenses = expensesList.filter(e => e.status === 'valid');
  const totalExpenses = validExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Saldo aktual: Kas Masuk - Kas Keluar
  const actualCashBalance = totalReceived - totalExpenses;

  const handleExportFinancialPDF = () => {
    exportFinancialReportPDF(
      {
        totalParticipants: jamaahList.length,
        totalTargetBill,
        totalReceived,
        totalOutstanding,
        totalBudget,
        totalExpenses,
        actualCashBalance
      },
      validExpenses
    );
    showToast('Laporan Keuangan Resmi berhasil diekspor ke PDF!', 'success');
  };

  const handleExportOutstandingExcel = () => {
    const debtors = jamaahList.filter(j => j.payment_status !== 'Lunas');
    exportJamaahToExcel(debtors, 'Laporan_Tunggakan_Jamaah_Ziarah_2027.xlsx');
    showToast('Daftar tunggakan jamaah berhasil diekspor ke Excel!', 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-deep" />
            <span>Pusat Laporan & Rekapitulasi Eksekutif</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unduh laporan resmi PDF & Excel untuk evaluasi pengelola, bendahara, dan pembina kegiatan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFinancialPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Keuangan</span>
          </button>
        </div>
      </div>

      {/* Strict Accounting Warning Card */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-3 text-xs text-teal-950">
        <ShieldCheck className="w-5 h-5 text-teal-deep shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold text-teal-900">Ketentuan Akuntansi & Integritas Kas:</strong>
          Sistem secara tegas memisahkan <strong>Total Tagihan Jamaah (Target)</strong> dari <strong>Kas Masuk Aktual (Pembayaran Diterima)</strong>. Tagihan yang belum terbayar tidak dihitung sebagai uang masuk untuk mencegah salah perhitungan saldo kas bersih.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveReportTab('financial')}
          className={`py-3 px-5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeReportTab === 'financial'
              ? 'border-midnight text-midnight bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Rekapitulasi Kas & Neraca</span>
        </button>

        <button
          onClick={() => setActiveReportTab('jamaah')}
          className={`py-3 px-5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeReportTab === 'jamaah'
              ? 'border-midnight text-midnight bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Laporan Jamaah & Rombongan</span>
        </button>

        <button
          onClick={() => setActiveReportTab('bus')}
          className={`py-3 px-5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeReportTab === 'bus'
              ? 'border-midnight text-midnight bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BusIcon className="w-4 h-4" />
          <span>Manifest Armada & Petugas</span>
        </button>
      </div>

      {/* Tab 1: Financial Report */}
      {activeReportTab === 'financial' && (
        <div className="space-y-6">
          {/* Main Statement Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm tracking-tight">
                  LAPORAN RINGKASAN KEUANGAN & KAS OPERASIONAL
                </h3>
                <p className="text-[11px] text-teal-soft">
                  Ziarah Akbar Al-Qur'aniyyah 2027 • Status Real-Time
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
              {/* Row 1 */}
              <div className="py-3 flex justify-between items-center">
                <span className="font-medium text-slate-600">Total Jamaah Terdaftar</span>
                <span className="font-extrabold text-midnight text-sm">
                  {jamaahList.length.toLocaleString('id-ID')} Orang
                </span>
              </div>

              {/* Row 2 */}
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-medium text-slate-600 block">Total Target Tagihan (Pemasukan Ditargetkan)</span>
                  <span className="text-[10px] text-slate-400">Total nominal biaya jamaah terdaftar</span>
                </div>
                <span className="font-bold text-slate-800 text-sm">
                  {formatRupiah(totalTargetBill)}
                </span>
              </div>

              {/* Row 3 */}
              <div className="py-3 flex justify-between items-center bg-emerald-50/50 px-2 rounded-lg">
                <div>
                  <span className="font-bold text-emerald-900 block">(+) Total Pembayaran Diterima (Kas Masuk Aktual)</span>
                  <span className="text-[10px] text-emerald-700">Uang tunai, transfer, dan QRIS yang telah masuk</span>
                </div>
                <span className="font-extrabold text-emerald-700 text-base">
                  {formatRupiah(totalReceived)}
                </span>
              </div>

              {/* Row 4 */}
              <div className="py-3 flex justify-between items-center bg-rose-50/50 px-2 rounded-lg">
                <div>
                  <span className="font-bold text-rose-900 block">(-) Total Realisasi Kas Keluar (Pengeluaran Aktual)</span>
                  <span className="text-[10px] text-rose-700">DP bus, cetak buku doa, konsumsi, dan retribusi</span>
                </div>
                <span className="font-extrabold text-rose-700 text-base">
                  {formatRupiah(totalExpenses)}
                </span>
              </div>

              {/* Row 5: Saldo Bersih */}
              <div className="py-4 flex justify-between items-center bg-midnight text-white px-4 rounded-2xl mt-3 shadow-md">
                <div>
                  <span className="font-extrabold text-sm block">(=) SALDO KAS AKTUAL BERSIH SAAT INI</span>
                  <span className="text-[10px] text-teal-soft">Kas Masuk Aktual dikurangi Kas Keluar Aktual</span>
                </div>
                <span className="font-extrabold text-xl text-teal-soft">
                  {formatRupiah(actualCashBalance)}
                </span>
              </div>

              {/* Row 6: Piutang / Tunggakan */}
              <div className="py-3 flex justify-between items-center pt-4">
                <div>
                  <span className="font-medium text-amber-900 block">Sisa Tagihan Belum Dibayar (Piutang Jamaah)</span>
                  <span className="text-[10px] text-slate-400">Belum masuk ke kas bendahara</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-700 text-sm">{formatRupiah(totalOutstanding)}</span>
                  <button
                    onClick={handleExportOutstandingExcel}
                    className="block text-[10px] text-teal-deep hover:underline font-bold mt-0.5"
                  >
                    Unduh Rekap Piutang
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Jamaah & Rombongan Report */}
      {activeReportTab === 'jamaah' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-midnight">Laporan Status Jamaah & Rombongan</h3>
              <p className="text-xs text-slate-500">Ekspor data komprehensif ke format Microsoft Excel (.xlsx)</p>
            </div>
            <button
              onClick={() => exportJamaahToExcel(jamaahList)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Seluruh Jamaah</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {rombonganList.map(r => {
              const members = jamaahList.filter(j => j.rombongan_id === r.id);
              const lunas = members.filter(j => j.payment_status === 'Lunas').length;

              return (
                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-midnight">{r.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      Koordinator: {r.coordinator_name} • {members.length} Anggota
                    </p>
                    <p className="text-[10px] text-teal-deep font-semibold mt-1">
                      Pelunasan: {lunas}/{members.length} Jamaah Lunas
                    </p>
                  </div>
                  <button
                    onClick={() => exportJamaahToExcel(members, `Laporan_${r.name.replace(/\s+/g, '_')}.xlsx`)}
                    className="p-2 text-emerald-800 hover:bg-emerald-100 rounded-xl transition border border-emerald-300"
                    title="Export Excel Rombongan Ini"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Bus & Manifest */}
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
                      onClick={() => exportFinancialReportPDF({
                        totalParticipants: pass.length,
                        totalTargetBill,
                        totalReceived,
                        totalOutstanding,
                        totalBudget,
                        totalExpenses,
                        actualCashBalance
                      })}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Denah</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
