import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Jamaah, DuplicateStatus } from '../types';
import { formatRupiah, formatDateId, formatPhoneNumber } from '../utils/formatters';
import { exportJamaahToExcel, downloadJamaahTemplate, parseJamaahExcel, ImportParsedRow } from '../utils/excel';
import { checkDuplicateName } from '../utils/duplicateDetection';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Phone, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  X,
  Bus as BusIcon,
  HelpCircle,
  AlertOctagon
} from 'lucide-react';

export const JamaahView: React.FC = () => {
  const { 
    jamaahList, 
    rombonganList, 
    busesList, 
    settings,
    addJamaah, 
    updateJamaah, 
    deleteJamaah, 
    bulkImportJamaah,
    resolveDuplicateStatus,
    paymentsList,
    showToast
  } = useApp();

  // Search, Filter, Sort, Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRombongan, setFilterRombongan] = useState('ALL');
  const [filterBus, setFilterBus] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDuplicate, setFilterDuplicate] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJamaah, setEditingJamaah] = useState<Jamaah | null>(null);
  const [viewingHistoryJamaah, setViewingHistoryJamaah] = useState<Jamaah | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Form states for manual Add / Edit
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRombonganId, setFormRombonganId] = useState('');
  const [formBillAmount, setFormBillAmount] = useState<number>(settings.default_bill_amount);
  const [formInitialPayment, setFormInitialPayment] = useState<number>(0);
  const [formBusId, setFormBusId] = useState('');
  const [formSeatNumber, setFormSeatNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Live duplicate warning for form input
  const liveDuplicateCheck = useMemo(() => {
    if (!formName || formName.trim().length < 3) return null;
    return checkDuplicateName(
      formName, 
      formPhone, 
      jamaahList, 
      editingJamaah ? editingJamaah.id : undefined
    );
  }, [formName, formPhone, jamaahList, editingJamaah]);

  // Import State
  const [importRows, setImportRows] = useState<ImportParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importFileSummary, setImportFileSummary] = useState<any | null>(null);

  // Filtered Jamaah
  const filteredList = useMemo(() => {
    return jamaahList.filter(item => {
      // Search
      const searchNorm = searchTerm.toLowerCase();
      const matchSearch = 
        item.name.toLowerCase().includes(searchNorm) ||
        item.id.toLowerCase().includes(searchNorm) ||
        (item.phone && item.phone.includes(searchNorm)) ||
        (item.rombongan_name && item.rombongan_name.toLowerCase().includes(searchNorm));

      if (!matchSearch) return false;

      // Filter Rombongan
      if (filterRombongan !== 'ALL' && item.rombongan_id !== filterRombongan) return false;

      // Filter Bus
      if (filterBus !== 'ALL') {
        if (filterBus === 'UNASSIGNED') {
          if (item.bus_id) return false;
        } else if (item.bus_id !== filterBus) {
          return false;
        }
      }

      // Filter Payment Status
      if (filterStatus !== 'ALL' && item.payment_status !== filterStatus) return false;

      // Filter Duplicate
      if (filterDuplicate !== 'ALL') {
        if (filterDuplicate === 'NEEDS_REVIEW' && item.duplicate_status !== 'unreviewed') return false;
        if (filterDuplicate === 'DUPLICATE' && item.duplicate_status !== 'confirmed_duplicate') return false;
      }

      return true;
    });
  }, [jamaahList, searchTerm, filterRombongan, filterBus, filterStatus, filterDuplicate]);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  // Reset Form
  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormRombonganId(rombonganList[0]?.id || '');
    setFormBillAmount(settings.default_bill_amount);
    setFormInitialPayment(0);
    setFormBusId('');
    setFormSeatNumber('');
    setFormNotes('');
    setEditingJamaah(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (j: Jamaah) => {
    setEditingJamaah(j);
    setFormName(j.name);
    setFormPhone(j.phone || '');
    setFormRombonganId(j.rombongan_id);
    setFormBillAmount(j.bill_amount);
    setFormInitialPayment(0);
    setFormBusId(j.bus_id || '');
    setFormSeatNumber(j.seat_number || '');
    setFormNotes(j.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Nama Lengkap wajib diisi!', 'warning');
      return;
    }

    if (!formRombonganId) {
      showToast('Silakan pilih rombongan!', 'warning');
      return;
    }

    if (editingJamaah) {
      // Update
      await updateJamaah(editingJamaah.id, {
        name: formName,
        phone: formPhone,
        rombongan_id: formRombonganId,
        bill_amount: formBillAmount,
        bus_id: formBusId || undefined,
        seat_number: formSeatNumber || undefined,
        notes: formNotes
      });
    } else {
      // Add
      await addJamaah(
        {
          name: formName,
          phone: formPhone,
          rombongan_id: formRombonganId,
          bill_amount: formBillAmount,
          bus_id: formBusId || undefined,
          seat_number: formSeatNumber || undefined,
          notes: formNotes
        },
        formInitialPayment
      );
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deleteJamaah(deletingId);
    setDeletingId(null);
  };

  // Import handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseJamaahExcel(file, settings.default_bill_amount);
      
      // Perform duplicate cross-check for uploaded rows
      const checkedRows = rows.map(r => {
        const dup = checkDuplicateName(r.name, r.phone, jamaahList);
        return {
          ...r,
          isDuplicateCandidate: dup.isDuplicate,
          duplicateReason: dup.reason
        };
      });

      setImportRows(checkedRows);
      setImportFileSummary({
        total: checkedRows.length,
        valid: checkedRows.filter(r => r.isValid).length,
        invalid: checkedRows.filter(r => !r.isValid).length,
        duplicates: checkedRows.filter(r => r.isDuplicateCandidate).length
      });
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExecuteImport = async () => {
    if (importRows.length === 0) return;
    setIsImporting(true);

    const validRows = importRows.filter(r => r.isValid);
    const result = await bulkImportJamaah(validRows);

    setIsImporting(false);
    setIsImportModalOpen(false);
    setImportRows([]);
    setImportFileSummary(null);

    showToast(
      `Selesai Import: ${result.successful} berhasil disimpan, ${result.duplicates} kandidat perlu diperiksa.`,
      result.successful > 0 ? 'success' : 'warning'
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-deep" />
            <span>Data Jamaah Ziarah 2027</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola pendaftaran hingga 3.000 peserta, rombongan, dan penempatan kursi bus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unduh Template */}
          <button
            onClick={() => downloadJamaahTemplate(settings.default_bill_amount)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition shadow-sm"
            title="Unduh format file Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Template Excel</span>
          </button>

          {/* Import Excel */}
          <button
            onClick={() => {
              setImportRows([]);
              setImportFileSummary(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-deep border border-teal-200 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={() => exportJamaahToExcel(filteredList)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          {/* Tambah Manual */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jamaah</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col gap-2">
          {/* Search Box */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, ID jamaah, nomor telepon, rombongan..."
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 focus:border-teal-deep transition"
            />
          </div>

          {/* Filters: 2 Columns on Mobile, 4 on Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Filter Rombongan */}
            <select
              value={filterRombongan}
              onChange={e => {
                setFilterRombongan(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
            >
              <option value="ALL">Semua Rombongan</option>
              {rombonganList.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {/* Filter Bus */}
            <select
              value={filterBus}
              onChange={e => {
                setFilterBus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
            >
              <option value="ALL">Semua Bus</option>
              <option value="UNASSIGNED">Belum Dapat Bus</option>
              {busesList.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Filter Status Biaya */}
            <select
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
            >
              <option value="ALL">Semua Status Bayar</option>
              <option value="Lunas">Lunas</option>
              <option value="Cicilan">Cicilan</option>
              <option value="Belum Bayar">Belum Bayar</option>
            </select>

            {/* Filter Duplikat */}
            <select
              value={filterDuplicate}
              onChange={e => {
                setFilterDuplicate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
            >
              <option value="ALL">Semua Duplikasi</option>
              <option value="NEEDS_REVIEW">Perlu Diperiksa</option>
              <option value="DUPLICATE">Duplikat Terkonfirmasi</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Menampilkan <strong>{filteredList.length}</strong> dari <strong>{jamaahList.length}</strong> jamaah terdaftar</span>
          {(searchTerm || filterRombongan !== 'ALL' || filterBus !== 'ALL' || filterStatus !== 'ALL' || filterDuplicate !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRombongan('ALL');
                setFilterBus('ALL');
                setFilterStatus('ALL');
                setFilterDuplicate('ALL');
                setCurrentPage(1);
              }}
              className="text-teal-deep hover:underline font-semibold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">ID & Nama Jamaah</th>
                <th className="py-3 px-4">Kontak Telepon</th>
                <th className="py-3 px-4">Rombongan</th>
                <th className="py-3 px-4">Bus & Kursi</th>
                <th className="py-3 px-4 text-right">Tagihan</th>
                <th className="py-3 px-4 text-right">Terbayar</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data jamaah yang sesuai.
                  </td>
                </tr>
              ) : (
                pagedList.map(j => {
                  return (
                    <tr key={j.id} className="hover:bg-slate-50/80 transition">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-midnight flex items-center gap-1.5">
                          <span>{j.name}</span>
                          {j.duplicate_status === 'unreviewed' && (
                            <span 
                              className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded-md animate-pulse"
                              title="Kandidat nama mirip/duplikat, perlu diperiksa"
                            >
                              Duplikat?
                            </span>
                          )}
                          {j.duplicate_status === 'confirmed_duplicate' && (
                            <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-md">
                              Duplikat
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{j.id}</span>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {j.phone ? formatPhoneNumber(j.phone) : '-'}
                      </td>

                      {/* Rombongan */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {j.rombongan_name || '-'}
                      </td>

                      {/* Bus & Seat */}
                      <td className="py-3 px-4">
                        {j.bus_name ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-midnight-50 text-midnight font-bold rounded text-[11px]">
                              {j.bus_name}
                            </span>
                            <span className="px-1.5 py-0.5 bg-teal-50 text-teal-deep font-mono font-bold rounded text-[10px]">
                              {j.seat_number || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Belum diatur</span>
                        )}
                      </td>

                      {/* Bill */}
                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        {formatRupiah(j.bill_amount)}
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {formatRupiah(j.total_paid)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            j.payment_status === 'Lunas'
                              ? 'bg-emerald-100 text-emerald-800'
                              : j.payment_status === 'Cicilan'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {j.payment_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingHistoryJamaah(j)}
                            className="p-1.5 text-slate-400 hover:text-teal-deep rounded-lg hover:bg-slate-100 transition"
                            title="Riwayat Pembayaran"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(j)}
                            className="p-1.5 text-slate-400 hover:text-midnight rounded-lg hover:bg-slate-100 transition"
                            title="Edit Data"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingId(j.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Hapus Jamaah"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {pagedList.length === 0 ? (
          <div className="bg-white p-8 text-center text-slate-400 rounded-2xl border border-slate-200">
            Tidak ditemukan data jamaah.
          </div>
        ) : (
          pagedList.map(j => (
            <div 
              key={j.id} 
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-midnight text-sm flex items-center gap-1.5 flex-wrap">
                    <span>{j.name}</span>
                    {j.duplicate_status === 'unreviewed' && (
                      <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded-md">
                        Duplikat?
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{j.id} • {j.rombongan_name || 'Umum'}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    j.payment_status === 'Lunas'
                      ? 'bg-emerald-100 text-emerald-800'
                      : j.payment_status === 'Cicilan'
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {j.payment_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Armada & Kursi:</span>
                  <span className="font-semibold text-slate-700">
                    {j.bus_name ? `${j.bus_name} (${j.seat_number || '-'})` : 'Belum diatur'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Terbayar / Tagihan:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(j.total_paid)}</span>
                  <span className="text-[10px] text-slate-400 block">dari {formatRupiah(j.bill_amount)}</span>
                </div>
              </div>

              {/* Action Buttons for Mobile */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setViewingHistoryJamaah(j)}
                  className="px-2.5 py-1 text-xs text-teal-deep font-semibold bg-teal-50 rounded-lg"
                >
                  Riwayat
                </button>
                <button
                  onClick={() => handleOpenEdit(j)}
                  className="px-2.5 py-1 text-xs text-midnight font-semibold bg-slate-100 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingId(j.id)}
                  className="px-2.5 py-1 text-xs text-rose-600 font-semibold bg-rose-50 rounded-lg"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200">
        <span className="text-xs text-slate-500">
          Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Tambah / Edit Jamaah Manual                                        */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingJamaah ? `Edit Jamaah: ${editingJamaah.name}` : 'Tambah Jamaah Baru'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 max-h-[80vh] overflow-y-auto space-y-3.5">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  placeholder="Contoh: Ahmad Fauzi"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />

                {/* Live Duplicate Warning Indicator */}
                {liveDuplicateCheck?.isDuplicate && (
                  <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Peringatan Potensi Duplikasi:</strong> {liveDuplicateCheck.reason}.
                      <p className="text-[10px] text-rose-600 mt-0.5">
                        Anda tetap dapat melanjutkan jika ini memang orang yang berbeda.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Nomor Telepon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Telepon (WhatsApp)
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              {/* Rombongan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Rombongan *
                </label>
                <select
                  value={formRombonganId}
                  onChange={e => setFormRombonganId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                >
                  <option value="">-- Pilih Rombongan --</option>
                  {rombonganList.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Nominal Tagihan & Pembayaran Awal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nominal Tagihan (Rp)
                  </label>
                  <input
                    type="number"
                    value={formBillAmount}
                    onChange={e => setFormBillAmount(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                  <span className="text-[10px] text-slate-400">Default: Rp {settings.default_bill_amount.toLocaleString()}</span>
                </div>

                {!editingJamaah && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pembayaran Awal (Rp)
                    </label>
                    <input
                      type="number"
                      value={formInitialPayment}
                      onChange={e => setFormInitialPayment(Number(e.target.value))}
                      min={0}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                    />
                    <span className="text-[10px] text-slate-400">0 jika belum bayar</span>
                  </div>
                )}
              </div>

              {/* Penempatan Bus & Kursi (Opsional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Armada Bus (Opsional)
                  </label>
                  <select
                    value={formBusId}
                    onChange={e => setFormBusId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  >
                    <option value="">Belum Ditentukan</option>
                    {busesList.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Kursi
                  </label>
                  <input
                    type="text"
                    value={formSeatNumber}
                    onChange={e => setFormSeatNumber(e.target.value)}
                    placeholder="Contoh: 3A"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Tambahan
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan khusus, lansia, vegetarian, dll..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-midnight rounded-xl hover:bg-midnight-700 transition shadow-md"
                >
                  {editingJamaah ? 'Simpan Perubahan' : 'Simpan Jamaah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Import Excel & Preview Duplikasi                                  */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-soft" />
                <h3 className="font-bold text-sm">Import Jamaah dari File Excel (.xlsx)</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
              {/* File upload prompt */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-teal-deep mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Pilih atau Seret File Excel (.xlsx) ke sini</p>
                <p className="text-[11px] text-slate-400 mt-1">Gunakan template resmi untuk hasil valid</p>
              </div>

              {/* Summary Stats after parsing */}
              {importFileSummary && (
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Total Baris</span>
                    <span className="font-extrabold text-midnight text-base">{importFileSummary.total}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-600 block">Valid</span>
                    <span className="font-extrabold text-emerald-700 text-base">{importFileSummary.valid}</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-[10px] text-rose-600 block">Error</span>
                    <span className="font-extrabold text-rose-700 text-base">{importFileSummary.invalid}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-600 block">Duplikat?</span>
                    <span className="font-extrabold text-amber-700 text-base">{importFileSummary.duplicates}</span>
                  </div>
                </div>
              )}

              {/* Preview Rows Table */}
              {importRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr className="text-[10px] font-bold text-slate-600 uppercase">
                        <th className="p-2">Baris</th>
                        <th className="p-2">Nama</th>
                        <th className="p-2">Rombongan</th>
                        <th className="p-2 text-right">Tagihan</th>
                        <th className="p-2 text-right">Bayar Awal</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importRows.map((r, i) => (
                        <tr key={i} className={!r.isValid ? 'bg-rose-50/50' : r.isDuplicateCandidate ? 'bg-amber-50/50' : ''}>
                          <td className="p-2 font-mono text-[10px] text-slate-400">{r.rowNumber}</td>
                          <td className="p-2">
                            <span className="font-bold text-slate-800">{r.name || '(Kosong)'}</span>
                            {r.isDuplicateCandidate && (
                              <p className="text-[10px] text-amber-700 font-semibold">{r.duplicateReason}</p>
                            )}
                            {r.errors.length > 0 && (
                              <p className="text-[10px] text-rose-600 font-semibold">{r.errors.join(', ')}</p>
                            )}
                          </td>
                          <td className="p-2 text-slate-600">{r.rombonganName}</td>
                          <td className="p-2 text-right font-medium">{formatRupiah(r.billAmount)}</td>
                          <td className="p-2 text-right font-bold text-emerald-700">{formatRupiah(r.initialPayment)}</td>
                          <td className="p-2 text-center">
                            {r.isValid ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                Siap
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                                Gagal
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => downloadJamaahTemplate(settings.default_bill_amount)}
                className="text-xs text-teal-deep font-bold hover:underline"
              >
                Unduh Format Template
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={importRows.length === 0 || isImporting}
                  className="px-5 py-2 text-xs font-bold text-white bg-midnight rounded-xl hover:bg-midnight-700 disabled:opacity-50 transition shadow-md"
                >
                  {isImporting ? 'Menyimpan Data...' : `Simpan ${importRows.filter(r => r.isValid).length} Data Valid`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Riwayat Pembayaran & Peninjauan Duplikat                           */}
      {/* ========================================================================= */}
      {viewingHistoryJamaah && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{viewingHistoryJamaah.name}</h3>
                <p className="text-[11px] text-teal-soft">{viewingHistoryJamaah.id} • {viewingHistoryJamaah.rombongan_name}</p>
              </div>
              <button
                onClick={() => setViewingHistoryJamaah(null)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
              {/* Duplicate review control if needed */}
              {viewingHistoryJamaah.duplicate_status === 'unreviewed' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Konfirmasi Deteksi Duplikasi:</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Sistem mendeteksi kemiripan nama atau nomor telepon. Tentukan status orang ini:
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        await resolveDuplicateStatus(viewingHistoryJamaah.id, 'confirmed_different');
                        setViewingHistoryJamaah(prev => prev ? { ...prev, duplicate_status: 'confirmed_different' } : null);
                      }}
                      className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      Orang Berbeda
                    </button>
                    <button
                      onClick={async () => {
                        await resolveDuplicateStatus(viewingHistoryJamaah.id, 'confirmed_duplicate');
                        setViewingHistoryJamaah(prev => prev ? { ...prev, duplicate_status: 'confirmed_duplicate' } : null);
                      }}
                      className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700"
                    >
                      Duplikat Ganda
                    </button>
                  </div>
                </div>
              )}

              {/* Financial summary card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-bold text-slate-800">{formatRupiah(viewingHistoryJamaah.bill_amount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Telah Dibayar:</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(viewingHistoryJamaah.total_paid)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-200 pt-1.5">
                  <span className="text-slate-500">Sisa Tunggakan:</span>
                  <span className="font-extrabold text-amber-700">{formatRupiah(viewingHistoryJamaah.remaining_amount)}</span>
                </div>
              </div>

              {/* Transactions log */}
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Riwayat Transaksi Masuk
              </h4>
              <div className="space-y-2">
                {paymentsList.filter(p => p.jamaah_id === viewingHistoryJamaah.id).length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Belum ada transaksi pembayaran.</p>
                ) : (
                  paymentsList
                    .filter(p => p.jamaah_id === viewingHistoryJamaah.id)
                    .map(p => (
                      <div key={p.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className={p.status === 'valid' ? 'text-emerald-700' : 'text-slate-400 line-through'}>
                            {formatRupiah(p.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{formatDateId(p.date)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{p.payment_method} • {p.reference_number || '-'}</span>
                          <span className={p.status === 'valid' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-bold'}>
                            {p.status === 'valid' ? 'Berhasil' : 'DIBATALKAN'}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingHistoryJamaah(null)}
                className="px-4 py-2 text-xs font-bold bg-midnight text-white rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Konfirmasi Hapus Jamaah                                            */}
      {/* ========================================================================= */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Konfirmasi Hapus Jamaah</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data jamaah ini? Kursi yang ditempati akan otomatis dikosongkan.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
