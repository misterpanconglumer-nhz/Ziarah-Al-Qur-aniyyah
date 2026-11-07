import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Rombongan, RombonganPaymentTransaction } from '../types';
import { formatRupiah, formatDateId, formatDateTimeId } from '../utils/formatters';
import { 
  X, 
  Wallet, 
  Plus, 
  Users, 
  Phone, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  Calendar, 
  CreditCard, 
  FileText, 
  Building2,
  QrCode,
  ArrowDownRight,
  TrendingDown,
  TrendingUp,
  ExternalLink,
  MessageCircle,
  Receipt
} from 'lucide-react';

interface RombonganPaymentDetailModalProps {
  rombongan: Rombongan;
  isOpen?: boolean;
  onClose: () => void;
}

export const RombonganPaymentDetailModal: React.FC<RombonganPaymentDetailModalProps> = ({
  rombongan,
  onClose
}) => {
  const { 
    jamaahList, 
    busesList, 
    settings, 
    rombonganPaymentsList, 
    addRombonganPayment, 
    updateRombonganPayment, 
    voidRombonganPayment, 
    deleteRombonganPayment,
    getRombonganFinancialSummary,
    showToast 
  } = useApp();

  // Financial summary computed dynamically
  const summary = useMemo(() => {
    return getRombonganFinancialSummary(rombongan.id);
  }, [getRombonganFinancialSummary, rombongan.id, jamaahList, rombonganPaymentsList, settings]);

  const assignedBus = useMemo(() => {
    return busesList.find(b => b.id === rombongan.bus_id);
  }, [busesList, rombongan.bus_id]);

  // Payments for this rombongan
  const payments = useMemo(() => {
    return rombonganPaymentsList.filter(p => p.rombongan_id === rombongan.id);
  }, [rombonganPaymentsList, rombongan.id]);

  // Sub-modal / Form state: Add or Edit Payment
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RombonganPaymentTransaction | null>(null);

  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState<number>(500000);
  const [formMethod, setFormMethod] = useState<'Tunai' | 'Transfer Bank' | 'QRIS' | 'Lainnya'>('Transfer Bank');
  const [formBank, setFormBank] = useState('BSI');
  const [formSender, setFormSender] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formRef, setFormRef] = useState('');

  // Delete confirmation modal state
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingPayment(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    // Default suggestion: sisa tagihan if > 0, else 500.000
    setFormAmount(summary.remainingBill > 0 ? summary.remainingBill : 500000);
    setFormMethod('Transfer Bank');
    setFormBank('BSI');
    setFormSender(rombongan.coordinator_name || '');
    setFormNotes(`Setoran tahap ${payments.filter(p => p.status === 'valid').length + 1} - ${rombongan.name}`);
    setFormRef(`KWT-${Date.now().toString().slice(-4)}`);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: RombonganPaymentTransaction) => {
    setEditingPayment(p);
    setFormDate(p.date || new Date().toISOString().split('T')[0]);
    setFormAmount(p.amount);
    setFormMethod(p.payment_method);
    setFormNotes(p.notes || '');
    setFormRef(p.reference_number || '');
    setIsFormOpen(true);
  };

  // Submit Form
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formAmount <= 0) {
      showToast('Nominal setoran harus lebih besar dari Rp 0!', 'warning');
      return;
    }

    let compiledNotes = formNotes.trim();
    if (formMethod === 'Transfer Bank') {
      const bankInfo = `[Transfer: ${formBank}${formSender ? ` a/n ${formSender}` : ''}]`;
      if (!compiledNotes.startsWith('[Transfer:')) {
        compiledNotes = `${bankInfo} ${compiledNotes}`.trim();
      }
    } else if (formMethod === 'Tunai') {
      const cashInfo = `[Tunai: Pimpinan ${rombongan.coordinator_name}]`;
      if (!compiledNotes.startsWith('[Tunai:')) {
        compiledNotes = `${cashInfo} ${compiledNotes}`.trim();
      }
    }

    if (editingPayment) {
      await updateRombonganPayment(editingPayment.id, {
        date: formDate,
        amount: formAmount,
        payment_method: formMethod,
        reference_number: formRef || undefined,
        notes: compiledNotes
      });
    } else {
      await addRombonganPayment({
        rombongan_id: rombongan.id,
        rombongan_name: rombongan.name,
        date: formDate,
        amount: formAmount,
        payment_method: formMethod,
        reference_number: formRef || undefined,
        notes: compiledNotes,
        status: 'valid'
      });
    }

    setIsFormOpen(false);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingPaymentId) return;
    await deleteRombonganPayment(deletingPaymentId);
    setDeletingPaymentId(null);
  };

  // Format WhatsApp number
  const cleanPhone = (rombongan.coordinator_phone || '').replace(/\D/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(`Assalamu'alaikum Wr. Wb. ${rombongan.coordinator_name}, berikut update rekap pembayaran kolektif ${rombongan.name} untuk Ziarah 2027: Total Tagihan: ${formatRupiah(summary.totalBill)}, Total Terbayar: ${formatRupiah(summary.totalPaid)}, Sisa Tagihan: ${formatRupiah(summary.remainingBill)}. Status: ${summary.paymentStatus}. Terima kasih.`)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-midnight to-teal-950 text-white flex items-center justify-between shrink-0 border-b border-teal-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-teal-500/20 text-teal-300 rounded-xl sm:rounded-2xl border border-teal-400/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-lg text-white">
                  Detail Pembayaran Kolektif: {rombongan.name}
                </h3>
                <span className="px-2 py-0.5 bg-white/10 rounded-full font-mono text-[10px] text-teal-200">
                  {rombongan.id}
                </span>
              </div>
              <p className="text-[11px] text-teal-200/80 mt-0.5">
                Kelola setoran bertahap rombongan, pantau sisa tunggakan, dan riwayat kwitansi setoran.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">

          {/* Rombongan Info Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs flex-1">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Pimpinan / Koordinator</span>
                <span className="font-bold text-slate-800 block text-sm mt-0.5">{rombongan.coordinator_name || 'Koordinator'}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Nomor WhatsApp / HP</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-slate-700">
                    {rombongan.coordinator_phone || '-'}
                  </span>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold transition"
                      title="Kirim Rekapitulasi via WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-700" />
                      <span>Chat WA</span>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Alokasi Armada Bus</span>
                <span className="font-bold text-midnight block mt-0.5">
                  {assignedBus ? assignedBus.name : 'Belum Ditentukan'}
                </span>
              </div>
            </div>

            <div className="pt-2 md:pt-0 md:pl-4 border-t md:border-t-0 md:border-l border-slate-200 flex items-center justify-between md:justify-end gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                summary.paymentStatus === 'Lunas'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : summary.paymentStatus === 'Kelebihan Bayar'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : summary.paymentStatus === 'Cicilan'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {summary.paymentStatus}
              </span>
            </div>
          </div>

          {/* 4 Financial Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {/* 1. Jumlah Jamaah */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <span>Jumlah Jamaah</span>
              </span>
              <div className="text-lg sm:text-2xl font-black text-slate-800 mt-1">
                {summary.totalMembers} <span className="text-xs font-semibold text-slate-400">Orang</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Tarif: {formatRupiah(summary.feePerJamaah)} / jamaah
              </span>
            </div>

            {/* 2. Total Tagihan */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-midnight" />
                <span>Total Tagihan</span>
              </span>
              <div className="text-base sm:text-xl font-black text-midnight mt-1 font-mono">
                {formatRupiah(summary.totalBill)}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                {summary.totalMembers} × {formatRupiah(summary.feePerJamaah)}
              </span>
            </div>

            {/* 3. Total Setoran Masuk */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Total Setoran Masuk</span>
              </span>
              <div className="text-base sm:text-xl font-black text-emerald-700 mt-1 font-mono">
                {formatRupiah(summary.totalPaid)}
              </div>
              <span className="text-[10px] text-emerald-600 mt-1 block">
                {summary.validPaymentsCount} Kali Setoran
              </span>
            </div>

            {/* 4. Sisa Tagihan (Tunggakan) */}
            <div className={`p-3 sm:p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
              summary.remainingBill === 0
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-rose-50/40 border-rose-200'
            }`}>
              <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                summary.remainingBill === 0 ? 'text-emerald-800' : 'text-rose-700'
              }`}>
                <TrendingDown className={`w-3.5 h-3.5 ${summary.remainingBill === 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span>Sisa Tagihan</span>
              </span>
              <div className={`text-base sm:text-xl font-black mt-1 font-mono ${
                summary.remainingBill === 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {summary.remainingBill === 0 ? 'LUNAS (Rp 0)' : formatRupiah(summary.remainingBill)}
              </div>
              <span className={`text-[10px] mt-1 block font-medium ${
                summary.remainingBill === 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {summary.remainingBill === 0 ? 'Semua tagihan lunas' : 'Belum terlunasi'}
              </span>
            </div>
          </div>

          {/* Pelunasan Progress Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-700 flex items-center gap-1.5">
                <span>Progress Pelunasan Rombongan:</span>
                <span className="text-teal-deep">{summary.percentagePaid}%</span>
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {formatRupiah(summary.totalPaid)} / {formatRupiah(summary.totalBill)}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  summary.percentagePaid >= 100 ? 'bg-emerald-500' : 'bg-teal-deep'
                }`}
                style={{ width: `${Math.min(100, summary.percentagePaid)}%` }}
              />
            </div>
          </div>

          {/* Section: Riwayat Setoran Bertahap */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-midnight flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-deep" />
                  <span>Riwayat Seluruh Setoran Rombongan</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                    {payments.length} Transaksi
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Pimpinan rombongan dapat menyetor dana bertahap dengan nominal bebas kapan saja.
                </p>
              </div>

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Pembayaran</span>
              </button>
            </div>

            {/* Table or Empty State */}
            {payments.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-teal-50 text-teal-deep rounded-full flex items-center justify-center mx-auto">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800">Belum Ada Setoran Tercatat</h5>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                    Rombongan ini belum memiliki riwayat setoran cicilan maupun pelunasan.
                  </p>
                </div>
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Setoran Pertama</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">No & ID</th>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3 text-right">Nominal Setoran</th>
                        <th className="py-2.5 px-3">Metode & Bukti</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p, idx) => {
                        const isCancelled = p.status === 'cancelled';

                        return (
                          <tr key={p.id} className={`hover:bg-slate-50/80 transition ${isCancelled ? 'bg-rose-50/20' : ''}`}>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-slate-700 block">{p.id}</span>
                              <span className="text-[10px] text-slate-400">Setoran #{payments.length - idx}</span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="font-medium text-slate-800 block">{formatDateId(p.date)}</span>
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <span className={`font-mono font-black text-sm block ${
                                isCancelled ? 'line-through text-slate-400' : 'text-emerald-700'
                              }`}>
                                {formatRupiah(p.amount)}
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold inline-block">
                                {p.payment_method}
                              </span>
                              {p.reference_number && (
                                <span className="font-mono text-[10px] text-slate-500 block mt-0.5">
                                  Ref: {p.reference_number}
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="text-slate-700 text-xs block">{p.notes || '-'}</span>
                              {isCancelled && p.cancelled_reason && (
                                <span className="text-[10px] text-rose-600 block mt-0.5 font-semibold">
                                  Alasan Batal: {p.cancelled_reason}
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isCancelled ? 'VOID (Batal)' : 'Valid Masuk'}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  className="p-1.5 text-slate-400 hover:text-midnight rounded-lg hover:bg-slate-100 transition"
                                  title="Edit Transaksi Setoran"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingPaymentId(p.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                  title="Hapus Transaksi Setoran"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Ziarah Akbar 2027 • Sistem Pembayaran Kolektif Rombongan
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-MODAL: Form Tambah / Edit Setoran Kolektif                             */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-teal-300" />
                <span>{editingPayment ? 'Edit Setoran Kolektif' : 'Tambah Pembayaran Setoran Rombongan'}</span>
              </h4>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-4 space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                <span className="text-[10px] text-slate-400 block font-semibold">Rombongan Target</span>
                <span className="font-bold text-midnight block">{rombongan.name}</span>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>Sisa Tagihan Saat Ini:</span>
                  <span className="font-bold text-rose-600 font-mono">{formatRupiah(summary.remainingBill)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tanggal Pembayaran *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Nominal Setoran (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                  <input
                    type="number"
                    value={formAmount || ''}
                    onChange={e => setFormAmount(Number(e.target.value))}
                    min={1000}
                    step={1000}
                    required
                    placeholder="Contoh: 500000"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-midnight focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>Terbilang:</span>
                  <span className="font-mono font-bold text-teal-deep">{formatRupiah(formAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Metode Pembayaran *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Transfer Bank', 'Tunai', 'QRIS', 'Lainnya'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormMethod(m)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        formMethod === m
                          ? 'bg-midnight text-white border-midnight shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m === 'Transfer Bank' && <Building2 className="w-3.5 h-3.5" />}
                      {m === 'Tunai' && <Wallet className="w-3.5 h-3.5" />}
                      {m === 'QRIS' && <QrCode className="w-3.5 h-3.5" />}
                      {m === 'Lainnya' && <CreditCard className="w-3.5 h-3.5" />}
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formMethod === 'Transfer Bank' && (
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold mb-1">Bank Tujuan</label>
                    <select
                      value={formBank}
                      onChange={e => setFormBank(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                      <option value="BCA">BCA</option>
                      <option value="Mandiri">Mandiri</option>
                      <option value="BRI">BRI</option>
                      <option value="BNI">BNI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10px] font-semibold mb-1">Rekening / Pengirim</label>
                    <input
                      type="text"
                      value={formSender}
                      onChange={e => setFormSender(e.target.value)}
                      placeholder="Nama pengirim"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nomor Kwitansi / Referensi (Opsional)</label>
                <input
                  type="text"
                  value={formRef}
                  onChange={e => setFormRef(e.target.value)}
                  placeholder="Contoh: KWT-0012 atau No. Ref Transfer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Keterangan / Catatan</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan, titipan pimpinan, dll..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-midnight hover:bg-midnight-700 text-white font-bold rounded-xl transition shadow-md"
                >
                  {editingPayment ? 'Simpan Perubahan' : 'Catat Setoran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: Konfirmasi Hapus Transaksi Setoran                              */}
      {/* ========================================================================= */}
      {deletingPaymentId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">Hapus Transaksi Setoran?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Data transaksi ID <strong className="font-mono text-slate-700">{deletingPaymentId}</strong> akan dihapus permanen dari sistem dan saldo rombongan akan dihitung ulang.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingPaymentId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                Hapus Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
