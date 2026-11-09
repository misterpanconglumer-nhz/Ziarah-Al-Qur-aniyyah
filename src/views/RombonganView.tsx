import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Rombongan } from '../types';
import { formatRupiah } from '../utils/formatters';
import { RombonganPaymentDetailModal } from '../components/RombonganPaymentDetailModal';
import { 
  Layers, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Bus as BusIcon, 
  Phone, 
  X, 
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  CreditCard
} from 'lucide-react';

export const RombonganView: React.FC = () => {
  const { 
    rombonganList, 
    jamaahList, 
    busesList, 
    settings,
    addRombongan, 
    updateRombongan, 
    deleteRombongan,
    getRombonganFinancialSummary,
    showToast 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Lunas' | 'Cicilan' | 'Belum Bayar'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRombongan, setEditingRombongan] = useState<Rombongan | null>(null);
  const [viewingMembersRombongan, setViewingMembersRombongan] = useState<Rombongan | null>(null);
  const [selectedRombonganForPayment, setSelectedRombonganForPayment] = useState<Rombongan | null>(null);
  const [deletingRombId, setDeletingRombId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCoordinator, setFormCoordinator] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBusId, setFormBusId] = useState('');
  const [formFeePerJamaah, setFormFeePerJamaah] = useState<number>(settings.default_bill_amount || 185000);
  const [formPaymentMode, setFormPaymentMode] = useState<'kolektif' | 'individual'>('kolektif');
  const [formNotes, setFormNotes] = useState('');

  // Search and status filter
  const filteredList = useMemo(() => {
    return rombonganList.filter(r => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        r.name.toLowerCase().includes(q) ||
        r.coordinator_name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filterStatus !== 'ALL') {
        const sum = getRombonganFinancialSummary(r.id);
        if (filterStatus === 'Lunas' && sum.paymentStatus !== 'Lunas' && sum.paymentStatus !== 'Kelebihan Bayar') return false;
        if (filterStatus === 'Cicilan' && sum.paymentStatus !== 'Cicilan') return false;
        if (filterStatus === 'Belum Bayar' && sum.paymentStatus !== 'Belum Bayar') return false;
      }

      return true;
    });
  }, [rombonganList, searchTerm, filterStatus, getRombonganFinancialSummary]);

  const handleOpenAdd = () => {
    setEditingRombongan(null);
    setFormName('');
    setFormCoordinator('');
    setFormPhone('');
    setFormBusId('');
    setFormFeePerJamaah(settings.default_bill_amount || 185000);
    setFormPaymentMode('kolektif');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (r: Rombongan) => {
    setEditingRombongan(r);
    setFormName(r.name);
    setFormCoordinator(r.coordinator_name);
    setFormPhone(r.coordinator_phone || '');
    setFormBusId(r.bus_id || '');
    setFormFeePerJamaah(r.fee_per_jamaah || settings.default_bill_amount || 185000);
    setFormPaymentMode(r.payment_mode || (r.name.toLowerCase().includes('umum') ? 'individual' : 'kolektif'));
    setFormNotes(r.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Nama Rombongan wajib diisi!', 'warning');
      return;
    }

    const busObj = busesList.find(b => b.id === formBusId);

    if (editingRombongan) {
      await updateRombongan(editingRombongan.id, {
        name: formName,
        coordinator_name: formCoordinator || 'Koordinator',
        coordinator_phone: formPhone,
        bus_id: formBusId || undefined,
        bus_name: busObj?.name,
        fee_per_jamaah: formFeePerJamaah,
        payment_mode: formPaymentMode,
        notes: formNotes
      });
    } else {
      await addRombongan({
        name: formName,
        coordinator_name: formCoordinator || 'Koordinator',
        coordinator_phone: formPhone,
        bus_id: formBusId || undefined,
        bus_name: busObj?.name,
        fee_per_jamaah: formFeePerJamaah,
        payment_mode: formPaymentMode,
        notes: formNotes
      });
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRombId) return;
    const res = await deleteRombongan(deletingRombId);
    if (res.success) {
      setDeletingRombId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 sm:w-6 h-6 text-teal-deep shrink-0" />
            <span>Data Rombongan & Pembayaran Kolektif</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Kelola kelompok majelis ta'lim, keluarga besar, setoran bertahap pimpinan, dan sisa tagihan.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Rombongan</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari nama rombongan atau koordinator..."
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {(['ALL', 'Lunas', 'Cicilan', 'Belum Bayar'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                filterStatus === st
                  ? 'bg-midnight text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Semua Status' : st}
            </button>
          ))}
          <span className="text-xs text-slate-500 font-semibold ml-2 hidden lg:inline">
            Total: {filteredList.length} Rombongan
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredList.map(r => {
          const members = jamaahList.filter(j => j.rombongan_id === r.id);
          const assignedBus = busesList.find(b => b.id === r.bus_id);
          const summary = getRombonganFinancialSummary(r.id);

          return (
            <div 
              key={r.id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition p-4 sm:p-5 flex flex-col justify-between space-y-3.5"
            >
              <div>
                {/* Header: Nama Rombongan, ID, Status Badge */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-midnight line-clamp-1">{r.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{r.id}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-medium text-slate-500">
                        {r.payment_mode === 'individual' ? 'Mandiri / Individual' : 'Kolektif'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      summary.paymentStatus === 'Lunas'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : summary.paymentStatus === 'Kelebihan Bayar'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : summary.paymentStatus === 'Cicilan'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {summary.paymentStatus}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                      {members.length} Jamaah
                    </span>
                  </div>
                </div>

                {/* Coordinator & Contact */}
                <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Pimpinan / Koord:</span>
                    <span className="font-bold text-slate-800">{r.coordinator_name || 'Koordinator'}</span>
                  </div>
                  {r.coordinator_phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Kontak WhatsApp:</span>
                      <span className="font-mono text-slate-700 font-semibold">{r.coordinator_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Armada Bus:</span>
                    <span className="font-semibold text-midnight">
                      {assignedBus ? assignedBus.name : 'Belum Ditentukan'}
                    </span>
                  </div>
                </div>

                {/* Ringkasan Rekap Pembayaran Rombongan */}
                <div className="mt-3 p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px] font-medium">Total Tagihan ({summary.totalMembers} Jamaah):</span>
                    <span className="font-mono font-bold text-slate-800">{formatRupiah(summary.totalBill)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-1.5 px-2 bg-white rounded-xl border border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Dari Jamaah:</span>
                      <span className="font-mono font-bold text-sky-700">{formatRupiah(summary.individualPaid)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Dari Koordinator:</span>
                      <span className="font-mono font-bold text-teal-700">{formatRupiah(summary.coordinatorPaid)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="text-[11px] font-bold">Total Pembayaran Diterima:</span>
                    <span className="font-mono font-black text-xs">{formatRupiah(summary.totalPaid)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                    <span className="text-slate-700 font-bold text-[11px]">Sisa Tagihan:</span>
                    <span className={`font-mono font-black text-xs ${
                      summary.remainingBill === 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {summary.remainingBill === 0 ? 'LUNAS (Rp 0)' : formatRupiah(summary.remainingBill)}
                    </span>
                  </div>
                </div>

                {/* Progress bar pelunasan setoran */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Pelunasan Setoran</span>
                    <span className="text-teal-deep">{summary.percentagePaid}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        summary.percentagePaid >= 100 ? 'bg-emerald-500' : 'bg-teal-deep'
                      }`}
                      style={{ width: `${Math.min(100, summary.percentagePaid)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Tombol Detail Pembayaran (Utama) & Aksi Lain */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedRombonganForPayment(r)}
                  className="w-full py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Wallet className="w-3.5 h-3.5 text-teal-700" />
                  <span>Detail Pembayaran & Setoran</span>
                </button>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setViewingMembersRombongan(r)}
                    className="text-xs text-slate-600 hover:text-midnight font-bold hover:underline flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Daftar Anggota</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1.5 text-slate-400 hover:text-midnight rounded-lg hover:bg-slate-100 transition"
                      title="Edit Rombongan"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingRombId(r.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Hapus Rombongan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Tambah / Edit Rombongan                                            */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingRombongan ? `Edit: ${editingRombongan.name}` : 'Tambah Rombongan Baru'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Rombongan *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  placeholder="Contoh: Majelis Ta'lim Al-Huda"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Koordinator / Penanggung Jawab
                </label>
                <input
                  type="text"
                  value={formCoordinator}
                  onChange={e => setFormCoordinator(e.target.value)}
                  placeholder="Contoh: H. Ahmad Subarjo"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor HP / WhatsApp Koordinator
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarif per Jamaah (Rp)
                  </label>
                  <input
                    type="number"
                    value={formFeePerJamaah || ''}
                    onChange={e => setFormFeePerJamaah(Number(e.target.value))}
                    min={1000}
                    step={1000}
                    placeholder="185000"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mode Pembayaran
                  </label>
                  <select
                    value={formPaymentMode}
                    onChange={e => setFormPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  >
                    <option value="kolektif">Kolektif Rombongan</option>
                    <option value="individual">Mandiri / Individual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alokasi Armada Bus
                </label>
                <select
                  value={formBusId}
                  onChange={e => setFormBusId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                >
                  <option value="">Belum Dialokasikan</option>
                  {busesList.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.operator})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan / Domisili
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Wilayah, titik kumpul, atau catatan lain..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-midnight hover:bg-midnight-700 rounded-xl transition shadow-md"
                >
                  {editingRombongan ? 'Simpan Perubahan' : 'Tambahkan Rombongan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Daftar Anggota Rombongan                                           */}
      {/* ========================================================================= */}
      {viewingMembersRombongan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm">
                  Anggota: {viewingMembersRombongan.name}
                </h3>
                <span className="text-xs text-slate-400">
                  Total {jamaahList.filter(j => j.rombongan_id === viewingMembersRombongan.id).length} Jamaah Terdaftar
                </span>
              </div>
              <button
                onClick={() => setViewingMembersRombongan(null)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1">
              {jamaahList.filter(j => j.rombongan_id === viewingMembersRombongan.id).length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada jamaah yang dialokasikan ke rombongan ini.
                </div>
              ) : (
                jamaahList
                  .filter(j => j.rombongan_id === viewingMembersRombongan.id)
                  .map((j, idx) => (
                    <div key={j.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                          <span className="font-bold text-midnight">{j.name}</span>
                          {j.seat_number && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded">
                              Kursi {j.seat_number}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{j.phone || 'Tanpa HP'}</span>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          j.payment_status === 'Lunas' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : j.payment_status === 'Cicilan'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {j.payment_status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          {formatRupiah(j.bill_amount)}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setViewingMembersRombongan(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Detail Pembayaran Kolektif Rombongan                               */}
      {/* ========================================================================= */}
      {selectedRombonganForPayment && (
        <RombonganPaymentDetailModal
          rombongan={selectedRombonganForPayment}
          onClose={() => setSelectedRombonganForPayment(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: Konfirmasi Hapus Rombongan                                         */}
      {/* ========================================================================= */}
      {deletingRombId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-800 text-sm">Hapus Rombongan Ini?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Data rombongan akan dihapus. Jamaah yang terdaftar dalam rombongan ini tidak akan terhapus, namun status rombongannya akan dikosongkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingRombId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md"
              >
                Hapus Rombongan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
