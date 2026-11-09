import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Rombongan, RombonganPaymentTransaction, Jamaah } from '../types';
import { formatRupiah, formatDateId } from '../utils/formatters';
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
  Calendar, 
  CreditCard, 
  TrendingDown, 
  TrendingUp, 
  MessageCircle, 
  Receipt,
  UserCheck,
  Building2,
  Layers,
  ArrowDownRight
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
    deleteRombonganPayment,
    getRombonganFinancialSummary,
    showToast 
  } = useApp();

  // Tab state within modal: Setoran Koordinator vs Riwayat Jamaah
  const [activeTab, setActiveTab] = useState<'koordinator' | 'jamaah'>('koordinator');

  // Financial summary computed dynamically
  const summary = useMemo(() => {
    return getRombonganFinancialSummary(rombongan.id);
  }, [getRombonganFinancialSummary, rombongan.id, jamaahList, rombonganPaymentsList, settings]);

  const assignedBus = useMemo(() => {
    return busesList.find(b => b.id === rombongan.bus_id);
  }, [busesList, rombongan.bus_id]);

  // Members of this rombongan from Data Jamaah
  const members = useMemo(() => {
    return jamaahList.filter(j => j.rombongan_id === rombongan.id);
  }, [jamaahList, rombongan.id]);

  // Coordinator payments for this rombongan
  const coordinatorPayments = useMemo(() => {
    return rombonganPaymentsList.filter(p => p.rombongan_id === rombongan.id);
  }, [rombonganPaymentsList, rombongan.id]);

  // Sub-modal / Form state: Add or Edit Coordinator Payment
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RombonganPaymentTransaction | null>(null);

  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState<number>(500000);
  const [formCoordinatorName, setFormCoordinatorName] = useState(rombongan.coordinator_name || '');
  const [formReceiverName, setFormReceiverName] = useState('Bendahara Utama');
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
    setFormAmount(summary.remainingBill > 0 ? summary.remainingBill : 500000);
    setFormCoordinatorName(rombongan.coordinator_name || 'Koordinator');
    setFormReceiverName('Bendahara Utama');
    setFormMethod('Transfer Bank');
    setFormBank('BSI');
    setFormSender(rombongan.coordinator_name || '');
    setFormNotes(`Setoran tahap ${coordinatorPayments.filter(p => p.status === 'valid').length + 1} - ${rombongan.name}`);
    setFormRef(`KWT-KORD-${Date.now().toString().slice(-4)}`);
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: RombonganPaymentTransaction) => {
    setEditingPayment(p);
    setFormDate(p.date || new Date().toISOString().split('T')[0]);
    setFormAmount(p.amount);
    setFormCoordinatorName(p.coordinator_name || rombongan.coordinator_name || '');
    setFormReceiverName(p.receiver_name || 'Bendahara Utama');
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
      const cashInfo = `[Tunai diserahkan oleh ${formCoordinatorName || rombongan.coordinator_name}]`;
      if (!compiledNotes.startsWith('[Tunai:')) {
        compiledNotes = `${cashInfo} ${compiledNotes}`.trim();
      }
    }

    if (editingPayment) {
      await updateRombonganPayment(editingPayment.id, {
        date: formDate,
        amount: formAmount,
        coordinator_name: formCoordinatorName,
        receiver_name: formReceiverName,
        payment_method: formMethod,
        notes: compiledNotes,
        reference_number: formRef
      });
      showToast('Setoran koordinator berhasil diperbarui!', 'success');
    } else {
      await addRombonganPayment({
        rombongan_id: rombongan.id,
        rombongan_name: rombongan.name,
        coordinator_name: formCoordinatorName,
        receiver_name: formReceiverName,
        date: formDate,
        amount: formAmount,
        payment_method: formMethod,
        notes: compiledNotes,
        reference_number: formRef,
        status: 'valid'
      });
    }

    setIsFormOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPaymentId) return;
    await deleteRombonganPayment(deletingPaymentId);
    setDeletingPaymentId(null);
  };

  // WhatsApp Message Generator
  const waUrl = useMemo(() => {
    if (!rombongan.coordinator_phone) return null;
    const cleanPhone = rombongan.coordinator_phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

    const message = `*REKAPITULASI PEMBAYARAN ZIARAH AKBAR 2027*\n` +
      `*Pondok Pesantren Al-Qur'aniyyah*\n\n` +
      `Kepada Yth. Pimpinan/Koordinator: *${rombongan.coordinator_name || 'Koordinator'}*\n` +
      `Rombongan: *${rombongan.name}*\n` +
      `Jumlah Jamaah: *${summary.totalMembers} Orang*\n\n` +
      `------------------------------------\n` +
      `• *Total Tagihan:* ${formatRupiah(summary.totalBill)}\n` +
      `• *Setoran Mandiri Jamaah:* ${formatRupiah(summary.individualPaid)}\n` +
      `• *Setoran Koordinator:* ${formatRupiah(summary.coordinatorPaid)}\n` +
      `• *Total Pembayaran Diterima:* ${formatRupiah(summary.totalPaid)}\n` +
      `• *Sisa Kekurangan Tagihan:* ${formatRupiah(summary.remainingBill)}\n` +
      `• *Status Pembayaran:* *${summary.paymentStatus.toUpperCase()}* (${summary.percentagePaid}%)\n` +
      `------------------------------------\n\n` +
      `Terima kasih atas kerja sama dan kepercayaannya.\n_Panitia Ziarah Akbar 2027_`;

    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
  }, [rombongan, summary]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-midnight via-midnight-800 to-teal-deep text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-white/10 rounded-xl sm:rounded-2xl border border-white/20">
              <Wallet className="w-5 h-5 text-teal-soft" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] sm:text-xs text-teal-soft font-bold px-2 py-0.5 bg-white/10 rounded-full">
                  {rombongan.id}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-300">Detail Pembayaran & Setoran</span>
              </div>
              <h3 className="font-extrabold text-base sm:text-xl tracking-tight mt-0.5">
                {rombongan.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-slate-700">
          
          {/* Info Koordinator & Status Banner */}
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

          {/* ========================================================= */}
          {/* BAGIAN 1: RINGKASAN PEMBAYARAN (6 KEY METRIC CARDS)       */}
          {/* ========================================================= */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-teal-deep" />
              <span>Bagian 1: Ringkasan Rekapitulasi Pembayaran</span>
            </h4>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
              {/* 1. Total Tagihan */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 block">Total Tagihan</span>
                <div className="text-sm sm:text-base font-black text-midnight mt-0.5 font-mono">
                  {formatRupiah(summary.totalBill)}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 block">{summary.totalMembers} Jamaah</span>
              </div>

              {/* 2. Pembayaran Individual */}
              <div className="bg-white p-3 rounded-2xl border border-sky-200 bg-sky-50/20 shadow-xs">
                <span className="text-[10px] font-semibold text-sky-700 block">Dari Jamaah (Indiv)</span>
                <div className="text-sm sm:text-base font-black text-sky-700 mt-0.5 font-mono">
                  {formatRupiah(summary.individualPaid)}
                </div>
                <span className="text-[9px] text-sky-600 mt-0.5 block">Bayar langsung</span>
              </div>

              {/* 3. Setoran Koordinator */}
              <div className="bg-white p-3 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-xs">
                <span className="text-[10px] font-semibold text-teal-700 block">Setoran Koordinator</span>
                <div className="text-sm sm:text-base font-black text-teal-700 mt-0.5 font-mono">
                  {formatRupiah(summary.coordinatorPaid)}
                </div>
                <span className="text-[9px] text-teal-600 mt-0.5 block">{coordinatorPayments.filter(p => p.status === 'valid').length}x Setoran</span>
              </div>

              {/* 4. Total Uang Masuk */}
              <div className="bg-white p-3 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-800 block">Total Uang Masuk</span>
                <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5 font-mono">
                  {formatRupiah(summary.totalPaid)}
                </div>
                <span className="text-[9px] text-emerald-600 mt-0.5 block">Indiv + Koord</span>
              </div>

              {/* 5. Sisa Tagihan */}
              <div className={`p-3 rounded-2xl border shadow-xs ${
                summary.remainingBill === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50/40 border-rose-200'
              }`}>
                <span className={`text-[10px] font-semibold block ${summary.remainingBill === 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                  Sisa Tagihan
                </span>
                <div className={`text-sm sm:text-base font-black mt-0.5 font-mono ${
                  summary.remainingBill === 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {summary.remainingBill === 0 ? 'LUNAS' : formatRupiah(summary.remainingBill)}
                </div>
                <span className={`text-[9px] mt-0.5 block ${summary.remainingBill === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {summary.remainingBill === 0 ? 'Lunas 100%' : 'Kekurangan'}
                </span>
              </div>

              {/* 6. Persentase Pelunasan */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 block">% Pelunasan</span>
                <div className="text-sm sm:text-base font-black text-teal-deep mt-0.5">
                  {summary.percentagePaid}%
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className={`h-full ${summary.percentagePaid >= 100 ? 'bg-emerald-500' : 'bg-teal-deep'}`}
                    style={{ width: `${Math.min(100, summary.percentagePaid)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2 pt-1">
            <button
              onClick={() => setActiveTab('koordinator')}
              className={`py-2 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'koordinator'
                  ? 'border-midnight text-midnight bg-slate-50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4 text-teal-deep" />
              <span>Bagian 3: Riwayat Setoran Koordinator</span>
              <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold">
                {coordinatorPayments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('jamaah')}
              className={`py-2 px-4 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
                activeTab === 'jamaah'
                  ? 'border-midnight text-midnight bg-slate-50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-sky-600" />
              <span>Bagian 2: Riwayat Pembayaran Jamaah (Individual)</span>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                {members.length}
              </span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: RIWAYAT SETORAN KOORDINATOR                       */}
          {/* ========================================================= */}
          {activeTab === 'koordinator' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h5 className="font-extrabold text-sm text-midnight flex items-center gap-2">
                    <span>Daftar Setoran Pimpinan/Koordinator</span>
                    <span className="text-xs font-normal text-slate-500">
                      Total disetor: <strong className="text-teal-700 font-mono">{formatRupiah(summary.coordinatorPaid)}</strong>
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Setoran uang kolektif dari koordinator ke bendahara secara bertahap dengan nominal bebas.
                  </p>
                </div>

                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Setoran Koordinator</span>
                </button>
              </div>

              {coordinatorPayments.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-teal-50 text-teal-deep rounded-full flex items-center justify-center mx-auto">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800">Belum Ada Setoran Koordinator</h5>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                      Pimpinan rombongan belum menyetorkan dana kolektif ke bendahara.
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
                          <th className="py-2.5 px-3 text-center w-10">No</th>
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">Nama Koordinator</th>
                          <th className="py-2.5 px-3 text-right">Nominal Setoran</th>
                          <th className="py-2.5 px-3">Metode & Kwitansi</th>
                          <th className="py-2.5 px-3">Keterangan</th>
                          <th className="py-2.5 px-3">Petugas Penerima</th>
                          <th className="py-2.5 px-3 text-center">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {coordinatorPayments.map((p, idx) => {
                          const isCancelled = p.status === 'cancelled';

                          return (
                            <tr key={p.id} className={`hover:bg-slate-50/80 transition ${isCancelled ? 'bg-rose-50/20' : ''}`}>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                                {idx + 1}
                              </td>

                              <td className="py-2.5 px-3 text-slate-800 font-medium">
                                {formatDateId(p.date)}
                              </td>

                              <td className="py-2.5 px-3 font-bold text-midnight">
                                {p.coordinator_name || rombongan.coordinator_name || 'Koordinator'}
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <span className={`font-mono font-black text-sm ${
                                  isCancelled ? 'line-through text-slate-400' : 'text-emerald-700'
                                }`}>
                                  {formatRupiah(p.amount)}
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold inline-block mr-1">
                                  {p.payment_method}
                                </span>
                                {p.reference_number && (
                                  <span className="font-mono text-[10px] text-slate-500">
                                    {p.reference_number}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[200px] truncate">
                                {p.notes || '-'}
                              </td>

                              <td className="py-2.5 px-3 text-slate-700 text-xs font-medium">
                                {p.receiver_name || 'Bendahara'}
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
          )}

          {/* ========================================================= */}
          {/* TAB 2: RIWAYAT PEMBAYARAN JAMAAH (INDIVIDUAL)             */}
          {/* ========================================================= */}
          {activeTab === 'jamaah' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-extrabold text-sm text-midnight flex items-center gap-2">
                    <span>Daftar Anggota Jamaah & Status Pembayaran</span>
                    <span className="text-xs font-normal text-slate-500">
                      Total terbayar langsung: <strong className="text-sky-700 font-mono">{formatRupiah(summary.individualPaid)}</strong>
                    </span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Data diambil secara real-time langsung dari menu Data Jamaah.
                  </p>
                </div>
              </div>

              {members.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  Belum ada jamaah yang terdaftar di rombongan ini.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3 text-center w-10">No</th>
                          <th className="py-2.5 px-3">Nama Jamaah</th>
                          <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                          <th className="py-2.5 px-3 text-right">Total Pembayaran</th>
                          <th className="py-2.5 px-3 text-right">Sisa Pembayaran</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.map((j, idx) => {
                          let badgeClass = 'bg-rose-100 text-rose-800';
                          if (j.payment_status === 'Lunas') badgeClass = 'bg-emerald-100 text-emerald-800';
                          if (j.payment_status === 'Cicilan') badgeClass = 'bg-teal-100 text-teal-800';

                          return (
                            <tr key={j.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <span className="font-extrabold text-midnight block">{j.name}</span>
                                <span className="text-[10px] text-slate-400">{j.id} • {j.phone || '-'}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                {formatRupiah(j.bill_amount)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                {formatRupiah(j.total_paid)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                                {formatRupiah(j.remaining_amount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                                  {j.payment_status}
                                </span>
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
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Ziarah Akbar 2027 • Sistem Pembayaran Kolektif Terpadu
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
      {/* SUB-MODAL: Form Tambah / Edit Setoran Koordinator                          */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm sm:text-base">
                  {editingPayment ? 'Edit / Koreksi Setoran Koordinator' : 'Catat Setoran Koordinator Baru'}
                </h4>
                <p className="text-[11px] text-teal-soft">{rombongan.name}</p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-700">
              {/* Tanggal Setoran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Setoran *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-deep text-xs font-medium"
                />
              </div>

              {/* Nama Koordinator & Petugas Penerima */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Koordinator *</label>
                  <input
                    type="text"
                    value={formCoordinatorName}
                    onChange={e => setFormCoordinatorName(e.target.value)}
                    required
                    placeholder="Nama koordinator penyerah"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-deep text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Petugas Penerima *</label>
                  <input
                    type="text"
                    value={formReceiverName}
                    onChange={e => setFormReceiverName(e.target.value)}
                    required
                    placeholder="Nama bendahara penerima"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-deep text-xs font-medium"
                  />
                </div>
              </div>

              {/* Nominal Setoran */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Nominal Setoran (Rp) *</label>
                  {summary.remainingBill > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormAmount(summary.remainingBill)}
                      className="text-[10px] text-teal-deep hover:underline font-bold"
                    >
                      Lunasi Sisa ({formatRupiah(summary.remainingBill)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={formAmount || ''}
                  onChange={e => setFormAmount(Number(e.target.value))}
                  required
                  min={1000}
                  step={1000}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-deep text-sm font-black text-midnight font-mono"
                />
              </div>

              {/* Metode Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Transfer Bank', 'Tunai', 'QRIS'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormMethod(m)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        formMethod === m
                          ? 'bg-teal-deep text-white border-teal-deep shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* No Kwitansi & Keterangan */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Kwitansi / Ref</label>
                  <input
                    type="text"
                    value={formRef}
                    onChange={e => setFormRef(e.target.value)}
                    placeholder="Contoh: KWT-0012"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-deep text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Catatan</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Contoh: Setoran tahap 1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-deep text-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-teal-deep hover:bg-teal-700 rounded-xl transition shadow-md"
                >
                  {editingPayment ? 'Simpan Koreksi' : 'Catat Setoran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: Konfirmasi Hapus Setoran                                       */}
      {/* ========================================================================= */}
      {deletingPaymentId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-800">Hapus Setoran Koordinator?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Data setoran ini akan dihapus dari sistem dan seluruh perhitungan kas rombongan akan disesuaikan otomatis.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeletingPaymentId(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
