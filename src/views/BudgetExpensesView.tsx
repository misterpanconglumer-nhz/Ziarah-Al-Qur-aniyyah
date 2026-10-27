import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BudgetItem, ExpenseTransaction } from '../types';
import { formatRupiah, formatDateId } from '../utils/formatters';
import { parseBudgetExcel, downloadBudgetTemplate } from '../utils/excel';
import { 
  PieChart, 
  Plus, 
  ArrowUpRight, 
  Layers, 
  Calendar, 
  FileText, 
  Trash2, 
  Ban, 
  CheckCircle, 
  AlertTriangle,
  X,
  TrendingDown,
  Edit,
  FileSpreadsheet,
  Download,
  Upload
} from 'lucide-react';

export const BudgetExpensesView: React.FC = () => {
  const { 
    budgetList, 
    expensesList, 
    addBudgetItem, 
    updateBudgetItem, 
    deleteBudgetItem, 
    addExpense, 
    voidExpense,
    showToast 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'budget' | 'expenses'>('budget');

  // Modals state
  const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [voidingExpId, setVoidingExpId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Excel Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedItemsPreview, setImportedItemsPreview] = useState<Omit<BudgetItem, 'id' | 'created_at'>[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Budget Form
  const [budgetName, setBudgetName] = useState('');
  const [budgetCategory, setBudgetCategory] = useState<BudgetItem['category']>('Transportasi');
  const [budgetVolume, setBudgetVolume] = useState<number>(1);
  const [budgetUnit, setBudgetUnit] = useState('Unit Bus');
  const [budgetUnitPrice, setBudgetUnitPrice] = useState<number>(12500000);
  const [budgetNotes, setBudgetNotes] = useState('');

  // Expense Form
  const [expTitle, setExpTitle] = useState('');
  const [expBudgetId, setExpBudgetId] = useState('');
  const [expCategory, setExpCategory] = useState('Transportasi');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expAmount, setExpAmount] = useState<number>(500000);
  const [expReceipt, setExpReceipt] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Metrics
  const totalBudget = budgetList.reduce((acc, b) => acc + (b.total_budget || 0), 0);
  const validExpenses = expensesList.filter(e => e.status === 'valid');
  const totalRealizedExpenses = validExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalVariance = totalBudget - totalRealizedExpenses;
  const absorptionRate = totalBudget > 0 ? Math.round((totalRealizedExpenses / totalBudget) * 100) : 0;

  const handleOpenAddBudget = () => {
    setEditingBudget(null);
    setBudgetName('');
    setBudgetCategory('Transportasi');
    setBudgetVolume(1);
    setBudgetUnit('Unit');
    setBudgetUnitPrice(1000000);
    setBudgetNotes('');
    setIsAddBudgetModalOpen(true);
  };

  const handleOpenEditBudget = (b: BudgetItem) => {
    setEditingBudget(b);
    setBudgetName(b.name);
    setBudgetCategory(b.category);
    setBudgetVolume(b.volume);
    setBudgetUnit(b.unit);
    setBudgetUnitPrice(b.unit_price);
    setBudgetNotes(b.notes || '');
    setIsAddBudgetModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const items = await parseBudgetExcel(file);
      if (items.length === 0) {
        showToast('Tidak ada pos anggaran yang terdeteksi dari file Excel tersebut.', 'warning');
        return;
      }
      setImportedItemsPreview(items);
      setIsImportModalOpen(true);
    } catch (err: any) {
      showToast(`Gagal membaca Excel: ${err?.message || err}`, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (importedItemsPreview.length === 0) return;
    setIsImporting(true);
    try {
      for (const item of importedItemsPreview) {
        await addBudgetItem(item);
      }
      showToast(`Berhasil mengimpor ${importedItemsPreview.length} pos anggaran ke sistem!`, 'success');
      setIsImportModalOpen(false);
      setImportedItemsPreview([]);
    } catch (err: any) {
      showToast(`Terjadi kesalahan saat menyimpan: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmitBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetName.trim()) {
      showToast('Nama pos anggaran wajib diisi!', 'warning');
      return;
    }

    const calculatedTotal = Number(budgetVolume) * Number(budgetUnitPrice);

    if (editingBudget) {
      await updateBudgetItem(editingBudget.id, {
        name: budgetName,
        category: budgetCategory,
        volume: Number(budgetVolume),
        unit: budgetUnit,
        unit_price: Number(budgetUnitPrice),
        total_budget: calculatedTotal,
        notes: budgetNotes
      });
    } else {
      await addBudgetItem({
        name: budgetName,
        category: budgetCategory,
        volume: Number(budgetVolume),
        unit: budgetUnit,
        unit_price: Number(budgetUnitPrice),
        total_budget: calculatedTotal,
        notes: budgetNotes
      });
    }

    setIsAddBudgetModalOpen(false);
  };

  const handleOpenAddExpense = (presetBudgetId?: string) => {
    setExpBudgetId(presetBudgetId || '');
    const matchedB = budgetList.find(b => b.id === presetBudgetId);
    if (matchedB) {
      setExpCategory(matchedB.category);
      setExpTitle(`Realisasi ${matchedB.name}`);
    } else {
      setExpCategory('Transportasi');
      setExpTitle('');
    }
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpAmount(500000);
    setExpReceipt('');
    setExpNotes('');
    setIsAddExpenseModalOpen(true);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim()) {
      showToast('Judul pengeluaran wajib diisi!', 'warning');
      return;
    }

    await addExpense({
      title: expTitle,
      category: expCategory,
      budget_item_id: expBudgetId || undefined,
      date: expDate,
      amount: Number(expAmount),
      receipt_ref: expReceipt,
      notes: expNotes
    });

    setIsAddExpenseModalOpen(false);
  };

  const handleConfirmVoidExpense = async () => {
    if (!voidingExpId) return;
    if (!voidReason.trim()) {
      showToast('Alasan pembatalan harus diisi!', 'warning');
      return;
    }

    await voidExpense(voidingExpId, voidReason);
    setVoidingExpId(null);
    setVoidReason('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-teal-deep" />
            <span>Anggaran & Realisasi Pengeluaran Kas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemisahan rencana pos anggaran operasional dan realisasi pengeluaran kas aktual.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />

          {activeSubTab === 'budget' ? (
            <>
              <button
                onClick={downloadBudgetTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
                title="Unduh format template Excel rencana anggaran"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Template Excel</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md"
                title="Impor pos anggaran dari file Excel (misal: ZIARAH 2027.xlsx)"
              >
                <Upload className="w-4 h-4 text-emerald-100" />
                <span>Import Excel</span>
              </button>

              <button
                onClick={handleOpenAddBudget}
                className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pos</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleOpenAddExpense()}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pengeluaran Kas</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">Total Rencana Anggaran</span>
          <div className="text-base sm:text-xl font-extrabold text-midnight mt-0.5 sm:mt-1 truncate">{formatRupiah(totalBudget)}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block">{budgetList.length} Pos Alokasi</span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">Realisasi Pengeluaran</span>
          <div className="text-base sm:text-xl font-extrabold text-rose-700 mt-0.5 sm:mt-1 truncate">{formatRupiah(totalRealizedExpenses)}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block">{validExpenses.length} Transaksi Keluar</span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">Sisa Alokasi</span>
          <div className={`text-base sm:text-xl font-extrabold mt-0.5 sm:mt-1 truncate ${totalVariance >= 0 ? 'text-teal-deep' : 'text-rose-600'}`}>
            {formatRupiah(totalVariance)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">
            {totalVariance >= 0 ? 'Anggaran Aman' : 'Melebihi Anggaran'}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">Penyerapan Dana</span>
          <div className="text-base sm:text-xl font-extrabold text-teal-deep mt-0.5 sm:mt-1">{absorptionRate}%</div>
          <div className="w-full bg-slate-100 h-1.5 sm:h-2 rounded-full overflow-hidden mt-1.5 sm:mt-2">
            <div 
              className={`h-full ${absorptionRate > 100 ? 'bg-rose-500' : 'bg-teal-deep'}`}
              style={{ width: `${Math.min(100, absorptionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('budget')}
          className={`py-3 px-5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeSubTab === 'budget'
              ? 'border-midnight text-midnight bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rencana Pos Anggaran ({budgetList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`py-3 px-5 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
            activeSubTab === 'expenses'
              ? 'border-rose-600 text-rose-700 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Realisasi Kas Keluar ({expensesList.length})</span>
        </button>
      </div>

      {/* Content 1: Pos Anggaran Table */}
      {activeSubTab === 'budget' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Nama Pos Anggaran</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Volume & Satuan</th>
                  <th className="py-3 px-4 text-right">Harga Satuan</th>
                  <th className="py-3 px-4 text-right">Total Anggaran</th>
                  <th className="py-3 px-4 text-right">Realisasi Kas</th>
                  <th className="py-3 px-4 text-center">Serapan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budgetList.map(b => {
                  const spent = validExpenses
                    .filter(e => e.budget_item_id === b.id)
                    .reduce((acc, e) => acc + e.amount, 0);
                  const rate = b.total_budget > 0 ? Math.round((spent / b.total_budget) * 100) : 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <span className="font-bold text-midnight block">{b.name}</span>
                        {b.notes && <span className="text-[10px] text-slate-400">{b.notes}</span>}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
                          {b.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-slate-700">
                        {b.volume} {b.unit}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-600 font-medium">
                        {formatRupiah(b.unit_price)}
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-midnight">
                        {formatRupiah(b.total_budget)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-rose-700">
                        {formatRupiah(spent)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rate > 100 ? 'bg-rose-100 text-rose-800' : 'bg-teal-50 text-teal-deep'
                        }`}>
                          {rate}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAddExpense(b.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition"
                            title="Catat Realisasi untuk Pos Ini"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditBudget(b)}
                            className="p-1.5 text-slate-400 hover:text-midnight rounded-lg hover:bg-slate-100 transition"
                            title="Edit Pos Anggaran"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteBudgetItem(b.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Hapus Pos Anggaran"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content 2: Realisasi Pengeluaran Table */}
      {activeSubTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">ID & Tanggal</th>
                  <th className="py-3 px-4">Nama Pengeluaran</th>
                  <th className="py-3 px-4">Kategori & Bukti</th>
                  <th className="py-3 px-4 text-right">Nominal Aktual</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expensesList.map(e => {
                  const isVoid = e.status === 'cancelled';

                  return (
                    <tr key={e.id} className={`hover:bg-slate-50/80 transition ${isVoid ? 'bg-rose-50/20' : ''}`}>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-700 block">{e.id}</span>
                        <span className="text-[10px] text-slate-400">{formatDateId(e.date)}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-midnight block">{e.title}</span>
                        {e.notes && <span className="text-[10px] text-slate-400">{e.notes}</span>}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[10px]">
                            {e.category}
                          </span>
                          {e.receipt_ref && (
                            <span className="text-[10px] text-slate-500 font-mono">Ref: {e.receipt_ref}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-sm">
                        <span className={isVoid ? 'line-through text-slate-400' : 'text-rose-700'}>
                          {formatRupiah(e.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isVoid ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                              VOID
                            </span>
                            {e.cancelled_reason && (
                              <span className="text-[9px] text-rose-600 mt-0.5" title={e.cancelled_reason}>
                                {e.cancelled_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                            Valid
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {!isVoid ? (
                          <button
                            onClick={() => {
                              setVoidingExpId(e.id);
                              setVoidReason('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Batalkan Pengeluaran (Void)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Tambah Pos Anggaran                                                */}
      {/* ========================================================================= */}
      {isAddBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingBudget ? 'Edit Pos Anggaran' : 'Tambah Pos Anggaran Baru'}
              </h3>
              <button
                onClick={() => setIsAddBudgetModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBudget} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pos Anggaran *
                </label>
                <input
                  type="text"
                  value={budgetName}
                  onChange={e => setBudgetName(e.target.value)}
                  required
                  placeholder="Contoh: Sewa Bus Blue Star Jetbus 5"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Biaya
                </label>
                <select
                  value={budgetCategory}
                  onChange={e => setBudgetCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                >
                  <option value="Transportasi">Transportasi</option>
                  <option value="Konsumsi">Konsumsi</option>
                  <option value="Penginapan">Penginapan</option>
                  <option value="Retribusi & Ziarah">Retribusi & Ziarah</option>
                  <option value="Perlengkapan">Perlengkapan</option>
                  <option value="Kesehatan">Kesehatan</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Volume
                  </label>
                  <input
                    type="number"
                    value={budgetVolume}
                    onChange={e => setBudgetVolume(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={budgetUnit}
                    onChange={e => setBudgetUnit(e.target.value)}
                    placeholder="Bus, Paket, Porsi..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Satuan (Rp)
                </label>
                <input
                  type="number"
                  value={budgetUnitPrice}
                  onChange={e => setBudgetUnitPrice(Number(e.target.value))}
                  min={0}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
                <span className="text-[11px] text-teal-deep font-bold mt-1 block">
                  Total Anggaran: {formatRupiah(budgetVolume * budgetUnitPrice)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan
                </label>
                <textarea
                  value={budgetNotes}
                  onChange={e => setBudgetNotes(e.target.value)}
                  rows={2}
                  placeholder="Keterangan peruntukan anggaran..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBudgetModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-midnight rounded-xl hover:bg-midnight-700 transition shadow-md"
                >
                  {editingBudget ? 'Simpan Perubahan' : 'Simpan Pos Anggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Catat Realisasi Pengeluaran Kas                                    */}
      {/* ========================================================================= */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Catat Pengeluaran Kas Aktual</h3>
              <button
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="p-1 text-rose-200 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kaitkan Pos Anggaran (Opsional)
                </label>
                <select
                  value={expBudgetId}
                  onChange={e => {
                    setExpBudgetId(e.target.value);
                    const b = budgetList.find(item => item.id === e.target.value);
                    if (b) {
                      setExpCategory(b.category);
                      if (!expTitle) setExpTitle(`Realisasi ${b.name}`);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  <option value="">-- Pengeluaran Non-Anggaran / Bebas --</option>
                  {budgetList.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({formatRupiah(b.total_budget)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul / Nama Pengeluaran *
                </label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  required
                  placeholder="Contoh: DP Sewa Bus Tahap 1"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nominal Aktual (Rp) *
                  </label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={e => setExpAmount(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40 font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  No. Bukti / Kwitansi / Ref
                </label>
                <input
                  type="text"
                  value={expReceipt}
                  onChange={e => setExpReceipt(e.target.value)}
                  placeholder="Contoh: KWT-PO-99"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Tambahan
                </label>
                <textarea
                  value={expNotes}
                  onChange={e => setExpNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan transfer, dibayarkan kepada siapa..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-700 rounded-xl hover:bg-rose-800 transition shadow-md"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Void Pengeluaran                                                   */}
      {/* ========================================================================= */}
      {voidingExpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-slate-900">Batalkan Pengeluaran (VOID)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Catatan kas keluar akan ditandai VOID dan tidak dihitung dalam realisasi kas aktual.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Pembatalan *
              </label>
              <textarea
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                required
                rows={2}
                placeholder="Contoh: Kesalahan nominal, transaksi dibatalkan vendor..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setVoidingExpId(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmVoidExpense}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700"
              >
                Konfirmasi VOID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Preview Import Anggaran Excel                                      */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Pratinjau Impor Anggaran Excel</h3>
                  <p className="text-[11px] text-teal-soft">
                    {importedItemsPreview.length} Pos Anggaran terdeteksi dari file
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isImporting) {
                    setIsImportModalOpen(false);
                    setImportedItemsPreview([]);
                  }
                }}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Bar */}
            <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <div className="text-xs text-emerald-900">
                <span className="font-bold">Total Rencana Anggaran Baru: </span>
                <span className="font-extrabold text-sm text-emerald-800">
                  {formatRupiah(importedItemsPreview.reduce((sum, item) => sum + (item.total_budget || 0), 0))}
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">
                Format file ZIARAH 2027.xlsx & standar didukung penuh
              </span>
            </div>

            {/* Table of Items */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">No</th>
                    <th className="py-2 px-3">Nama Pos Anggaran</th>
                    <th className="py-2 px-3">Kategori</th>
                    <th className="py-2 px-3 text-center">Vol & Satuan</th>
                    <th className="py-2 px-3 text-right">Harga Satuan</th>
                    <th className="py-2 px-3 text-right">Total Anggaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importedItemsPreview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        {item.notes && <span className="text-[10px] text-slate-400 block">{item.notes}</span>}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-600">
                        {item.volume} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {formatRupiah(item.unit_price)}
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-midnight">
                        {formatRupiah(item.total_budget)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportedItemsPreview([]);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleConfirmImport}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition shadow-md"
              >
                {isImporting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Terapkan & Simpan ke Sistem</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
