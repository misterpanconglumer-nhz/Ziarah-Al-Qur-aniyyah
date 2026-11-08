import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentReceipt } from '../types';
import { formatRupiah, formatDateId, terbilang } from '../utils/formatters';
import { exportPaymentReceiptPDF } from '../utils/pdf';
import { 
  Receipt, 
  Plus, 
  Search, 
  Printer, 
  Download, 
  Share2, 
  Calendar, 
  User, 
  Layers, 
  Phone, 
  DollarSign, 
  FileText, 
  CreditCard, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Sparkles, 
  RefreshCw,
  Send,
  X,
  Clock,
  Check
} from 'lucide-react';

export const ReceiptsView: React.FC = () => {
  const { 
    receiptsList, 
    addReceipt, 
    deleteReceipt, 
    generateNextReceiptNumber,
    jamaahList, 
    rombonganList,
    settings,
    adminEmail,
    showToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Form State
  const [receiptNumber, setReceiptNumber] = useState<string>(() => generateNextReceiptNumber());
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [participantName, setParticipantName] = useState('');
  const [rombonganName, setRombonganName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(settings.default_bill_amount || 185000);
  const [description, setDescription] = useState('Pelunasan Pembayaran Ziarah Akbar Al-Qur\'aniyyah 2027');
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer Bank' | 'QRIS' | 'Lainnya'>('Tunai');
  const [receivedBy, setReceivedBy] = useState('Bendahara Ziarah 2027');
  const [notes, setNotes] = useState('');

  // Auto-complete search state
  const [jamaahSearch, setJamaahSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter & Search History State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);

  // Preview & Print Modal
  const [previewReceipt, setPreviewReceipt] = useState<PaymentReceipt | null>(null);

  // Filter candidate jamaah for autocomplete
  const candidateJamaah = useMemo(() => {
    if (!jamaahSearch.trim()) return [];
    const q = jamaahSearch.toLowerCase();
    return jamaahList.filter(j => 
      j.name.toLowerCase().includes(q) || 
      (j.phone && j.phone.includes(q)) ||
      (j.rombongan_name && j.rombongan_name.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [jamaahList, jamaahSearch]);

  // Live terbilang
  const liveTerbilang = useMemo(() => {
    return terbilang(amount);
  }, [amount]);

  // Filtered History
  const filteredReceipts = useMemo(() => {
    return receiptsList.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchSearch = 
        r.participant_name.toLowerCase().includes(q) ||
        r.receipt_number.toLowerCase().includes(q) ||
        (r.rombongan_name && r.rombongan_name.toLowerCase().includes(q)) ||
        (r.phone && r.phone.includes(q)) ||
        r.description.toLowerCase().includes(q);

      const matchMethod = filterMethod === 'all' || r.payment_method === filterMethod;
      const matchDate = !filterDate || r.payment_date === filterDate;

      return matchSearch && matchMethod && matchDate;
    });
  }, [receiptsList, searchQuery, filterMethod, filterDate]);

  // Stats
  const totalNominal = useMemo(() => {
    return receiptsList.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  }, [receiptsList]);

  const handleSelectJamaah = (j: (typeof jamaahList)[0]) => {
    setParticipantName(j.name);
    setJamaahSearch(j.name);
    setRombonganName(j.rombongan_name || '');
    setPhone(j.phone || '');
    if (j.bill_amount) {
      setAmount(j.bill_amount);
    }
    setDescription(`Pembayaran Ziarah Akbar 2027 - ${j.rombongan_name || 'Umum'}`);
    setIsDropdownOpen(false);
  };

  const handleResetForm = () => {
    setReceiptNumber(generateNextReceiptNumber());
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setParticipantName('');
    setJamaahSearch('');
    setRombonganName('');
    setPhone('');
    setAmount(settings.default_bill_amount || 185000);
    setDescription('Pelunasan Pembayaran Ziarah Akbar Al-Qur\'aniyyah 2027');
    setPaymentMethod('Tunai');
    setReceivedBy('Bendahara Ziarah 2027');
    setNotes('');
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName.trim()) {
      showToast('Nama peserta wajib diisi!', 'warning');
      return;
    }
    if (!amount || amount <= 0) {
      showToast('Nominal pembayaran harus lebih dari Rp 0!', 'warning');
      return;
    }

    try {
      const created = await addReceipt({
        payment_date: paymentDate,
        participant_name: participantName.trim(),
        rombongan_name: rombonganName.trim() || undefined,
        phone: phone.trim() || undefined,
        amount: Number(amount),
        terbilang: liveTerbilang,
        description: description.trim(),
        payment_method: paymentMethod,
        received_by: receivedBy.trim() || 'Bendahara Kegiatan',
        notes: notes.trim() || undefined
      });

      // Open print/preview modal immediately
      setPreviewReceipt(created);
      handleResetForm();
    } catch (err: any) {
      showToast(`Gagal menerbitkan kwitansi: ${err?.message || err}`, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingReceiptId) return;
    await deleteReceipt(deletingReceiptId);
    setDeletingReceiptId(null);
  };

  const handleSendWhatsApp = (r: PaymentReceipt) => {
    let cleanPhone = (r.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const message = `*BUKTI PEMBAYARAN RESMI - ZIARAH AKBAR 2027*
*PONDOK PESANTREN AL-QUR'ANIYYAH*

No. Kwitansi : ${r.receipt_number}
Tanggal      : ${formatDateId(r.payment_date)}
Nama Peserta : ${r.participant_name} ${r.rombongan_name ? `(${r.rombongan_name})` : ''}
Uang Sejumlah: *${formatRupiah(r.amount)}*
Terbilang    : _# ${r.terbilang} #_
Keperluan    : ${r.description}
Metode Bayar : ${r.payment_method}
Diterima Oleh: ${r.received_by}

_Tanda terima ini merupakan bukti sah pembayaran Ziarah Akbar Al-Qur'aniyyah 2027._
Terima kasih atas keikutsertaan Anda. Semoga berkah dan mabrur. Aamiin.`;

    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Print CSS Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-receipt-container, .print-receipt-container * {
            visibility: visible !important;
          }
          .print-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header & Subtitle */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <div className="p-2 bg-midnight text-teal-soft rounded-xl shadow-xs">
              <Receipt className="w-5 h-5 text-teal-soft" />
            </div>
            <span>Kwitansi & Bukti Pembayaran</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Terbitkan, cetak, dan kelola kwitansi resmi tanda terima pembayaran peserta Ziarah Akbar Al-Qur'aniyyah 2027.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'create'
                ? 'bg-white text-midnight shadow-xs'
                : 'text-slate-600 hover:text-midnight'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Kwitansi</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'history'
                ? 'bg-white text-midnight shadow-xs'
                : 'text-slate-600 hover:text-midnight'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Riwayat ({receiptsList.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FORM BUAT KWITANSI                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'create' && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-7 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-deep animate-pulse" />
                <h3 className="font-extrabold text-sm text-midnight">Formulir Pembuatan Kwitansi Baru</h3>
              </div>
              <span className="px-2.5 py-1 bg-midnight/5 text-midnight rounded-lg text-xs font-mono font-bold">
                {receiptNumber}
              </span>
            </div>

            <form onSubmit={handleSubmitReceipt} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* No Kwitansi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Nomor Kwitansi *</span>
                    <span className="text-[10px] text-teal-deep font-semibold">Otomatis / Unik</span>
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-mono font-bold text-midnight"
                  />
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pembayaran *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Nama Peserta Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Telah Diterima Dari (Nama Peserta) *</span>
                  <span className="text-[10px] text-slate-400">Ketik untuk mencari dari Data Jamaah</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: H. Ahmad Zaki atau pilih dari daftar jamaah..."
                    value={jamaahSearch || participantName}
                    onChange={e => {
                      setJamaahSearch(e.target.value);
                      setParticipantName(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-bold text-midnight pr-10"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Autocomplete Dropdown */}
                {isDropdownOpen && candidateJamaah.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {candidateJamaah.map(j => (
                      <div
                        key={j.id}
                        onClick={() => handleSelectJamaah(j)}
                        className="p-2.5 px-3.5 hover:bg-teal-50 cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <p className="text-xs font-bold text-midnight">{j.name}</p>
                          <p className="text-[10px] text-slate-400">
                            Rombongan: <span className="font-medium text-slate-600">{j.rombongan_name || 'Umum'}</span> • HP: {j.phone || '-'}
                          </p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-lg shrink-0">
                          Pilih
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rombongan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Rombongan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rombongan Majelis Al-Ikhlas"
                    value={rombonganName}
                    onChange={e => setRombonganName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 text-slate-800"
                  />
                </div>

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Nomor WhatsApp (Opsional)</span>
                    <span className="text-[10px] text-slate-400">Untuk kirim tanda terima WA</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 text-slate-800"
                  />
                </div>
              </div>

              {/* Nominal Pembayaran & Terbilang */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Uang Sejumlah (Nominal Pembayaran) *
                  </label>
                  {/* Quick Pill Amounts */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[50000, 100000, 185000].map(val => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border transition ${
                          amount === val
                            ? 'bg-midnight text-white border-midnight'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {formatRupiah(val)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={amount}
                    onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full pl-11 pr-4 py-2.5 text-base sm:text-lg bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-extrabold text-midnight"
                  />
                </div>

                {/* Terbilang Banner */}
                <div className="p-2.5 px-3 bg-teal-50/80 border border-teal-200/90 rounded-xl text-teal-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block mb-0.5">
                    Terbilang Otomatis:
                  </span>
                  <p className="text-xs font-bold italic text-midnight leading-snug">
                    # {liveTerbilang} #
                  </p>
                </div>
              </div>

              {/* Keterangan Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Untuk Pembayaran (Keterangan) *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  placeholder="Contoh: Pelunasan Ziarah Akbar 2027 Bus 01"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-semibold text-slate-800"
                />
                {/* Suggestions */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {[
                    'Pelunasan Ziarah Akbar 2027',
                    'DP Awal Pendaftaran Ziarah 2027',
                    'Cicilan Pembayaran Tahap 2',
                    'Titipan Pelunasan Rombongan'
                  ].map(sug => (
                    <button
                      type="button"
                      key={sug}
                      onClick={() => setDescription(sug)}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Metode Pembayaran */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Metode Pembayaran *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-bold text-midnight"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {/* Nama Petugas Penerima */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Petugas Penerima *
                  </label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={e => setReceivedBy(e.target.value)}
                    required
                    placeholder="Nama bendahara atau petugas"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Catatan Internal (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Diterima langsung di posko pendaftaran"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-midnight hover:bg-midnight-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-teal-soft" />
                  <span>Simpan & Terbitkan Kwitansi</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Summary Info (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Live Preview Card */}
            <div className="bg-gradient-to-br from-midnight to-midnight-800 text-white rounded-3xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <img src="/brand/logo-symbol-dark.svg" alt="Logo" className="w-6 h-6 object-contain" />
                  <span className="text-xs font-bold text-teal-soft">ZIARAH 2027</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-white/10 text-slate-200 rounded-full font-mono font-bold">
                  {receiptNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-300 block">Telah Diterima Dari:</span>
                <p className="text-sm font-extrabold text-white truncate">
                  {participantName || 'Nama Jamaah / Peserta'}
                </p>
                {rombonganName && (
                  <p className="text-[11px] text-teal-soft truncate">{rombonganName}</p>
                )}
              </div>

              <div className="p-3 bg-white/10 rounded-2xl space-y-1">
                <span className="text-[10px] text-slate-300 block">Uang Sejumlah:</span>
                <p className="text-xl font-black text-white">
                  {formatRupiah(amount)}
                </p>
                <p className="text-[10px] text-teal-soft italic line-clamp-2">
                  # {liveTerbilang} #
                </p>
              </div>

              <div className="text-[11px] text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span className="font-semibold text-white">{formatDateId(paymentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode:</span>
                  <span className="font-semibold text-teal-soft">{paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Penerima:</span>
                  <span className="font-semibold text-white truncate">{receivedBy}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 text-center">
                🔒 Data kwitansi tersimpan terpisah & aman di cloud Supabase.
              </div>
            </div>

            {/* Quick Stat Pill */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-3">
              <h4 className="text-xs font-bold text-midnight flex items-center justify-between">
                <span>Statistik Kwitansi</span>
                <Receipt className="w-4 h-4 text-teal-deep" />
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">Total Terbit</span>
                  <span className="text-base font-extrabold text-midnight">{receiptsList.length} Lembar</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">Total Nominal</span>
                  <span className="text-xs font-extrabold text-emerald-700 truncate block">{formatRupiah(totalNominal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT & CARI KWITANSI                                            */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="no-print space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Cari nama peserta, no kwitansi, atau rombongan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 text-slate-800 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={filterMethod}
                onChange={e => setFilterMethod(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
              >
                <option value="all">Semua Metode</option>
                <option value="Tunai">Tunai</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="QRIS">QRIS</option>
              </select>

              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
                title="Filter Tanggal"
              />

              {(searchQuery || filterMethod !== 'all' || filterDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterMethod('all');
                    setFilterDate('');
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Table of Receipts */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            {filteredReceipts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-700">Belum Ada Kwitansi yang Ditemukan</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {receiptsList.length === 0 
                    ? 'Anda belum menerbitkan kwitansi pembayaran. Klik tombol "Buat Kwitansi" untuk mulai membuat kwitansi baru.'
                    : 'Tidak ada data kwitansi yang cocok dengan filter pencarian Anda.'}
                </p>
                {receiptsList.length === 0 && (
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-midnight text-white text-xs font-bold rounded-xl hover:bg-midnight-700 transition"
                  >
                    + Buat Kwitansi Baru
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">No. Kwitansi</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Nama Peserta</th>
                      <th className="py-3 px-4">Nominal</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4">Metode</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredReceipts.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-midnight text-xs">
                          {r.receipt_number}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {formatDateId(r.payment_date)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{r.participant_name}</span>
                          {r.rombongan_name && (
                            <span className="text-[10px] text-teal-deep font-medium block">
                              {r.rombongan_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                          {formatRupiah(r.amount)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={r.description}>
                          {r.description}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.payment_method === 'Tunai'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {r.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Lihat / Cetak */}
                            <button
                              onClick={() => setPreviewReceipt(r)}
                              className="p-1.5 text-midnight hover:bg-slate-100 rounded-lg transition"
                              title="Lihat & Cetak Kwitansi"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Download PDF */}
                            <button
                              onClick={() => exportPaymentReceiptPDF(r)}
                              className="p-1.5 text-teal-deep hover:bg-teal-50 rounded-lg transition"
                              title="Unduh PDF Kwitansi"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Kirim WA */}
                            <button
                              onClick={() => handleSendWhatsApp(r)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Kirim Ringkasan ke WhatsApp"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            {/* Hapus */}
                            <button
                              onClick={() => setDeletingReceiptId(r.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Kwitansi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW & CETAK RESMI KWITANSI                                     */}
      {/* ========================================================================= */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Actions */}
            <div className="no-print p-4 bg-midnight text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-soft" />
                <span className="font-bold text-sm">Dokumen Kwitansi: {previewReceipt.receipt_number}</span>
              </div>
              <button
                onClick={() => setPreviewReceipt(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE KWITANSI CONTAINER (Official Pondok Pesantren Al-Qur'aniyyah Design) */}
            <div className="print-receipt-container p-6 sm:p-8 bg-white text-slate-900 border-2 border-midnight rounded-2xl m-3 sm:m-6 shadow-xs relative">
              {/* Inner Decorative Border */}
              <div className="border border-teal-deep/30 p-4 sm:p-6 rounded-xl space-y-5">
                {/* Header Kop Kwitansi */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-midnight pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/brand/logo-symbol-light.svg"
                      alt="Logo Ziarah"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-midnight leading-tight">
                        PANITIA ZIARAH AKBAR 2027
                      </h3>
                      <h4 className="font-bold text-xs sm:text-sm text-teal-deep leading-tight">
                        PONDOK PESANTREN AL-QUR'ANIYYAH
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Sekretariat Pengelola & Bendahara Kegiatan Ziarah Akbar
                      </p>
                    </div>
                  </div>

                  {/* Kwitansi Badge & Number */}
                  <div className="text-right self-stretch sm:self-auto flex flex-col justify-between sm:items-end">
                    <span className="px-3 py-1 bg-midnight text-white text-xs font-extrabold rounded-md uppercase tracking-wider inline-block">
                      KWITANSI PEMBAYARAN
                    </span>
                    <div className="mt-1 text-xs">
                      <p className="font-mono font-bold text-midnight">No: {previewReceipt.receipt_number}</p>
                      <p className="text-[11px] text-slate-500">{formatDateId(previewReceipt.payment_date)}</p>
                    </div>
                  </div>
                </div>

                {/* Body Rows */}
                <div className="space-y-3 text-xs sm:text-sm">
                  {/* Telah Diterima Dari */}
                  <div className="flex items-baseline gap-2">
                    <span className="w-36 text-slate-600 font-semibold shrink-0">Telah Diterima Dari</span>
                    <span className="text-slate-400 shrink-0">:</span>
                    <span className="font-extrabold text-midnight text-sm uppercase flex-1 border-b border-dotted border-slate-300 pb-0.5">
                      {previewReceipt.participant_name} {previewReceipt.rombongan_name ? `(${previewReceipt.rombongan_name})` : ''}
                    </span>
                  </div>

                  {/* Uang Sejumlah */}
                  <div className="flex items-baseline gap-2">
                    <span className="w-36 text-slate-600 font-semibold shrink-0">Uang Sejumlah</span>
                    <span className="text-slate-400 shrink-0">:</span>
                    <span className="font-extrabold text-midnight text-base flex-1 border-b border-dotted border-slate-300 pb-0.5">
                      {formatRupiah(previewReceipt.amount)}
                    </span>
                  </div>

                  {/* Terbilang */}
                  <div className="flex items-baseline gap-2">
                    <span className="w-36 text-slate-600 font-semibold shrink-0">Terbilang</span>
                    <span className="text-slate-400 shrink-0">:</span>
                    <div className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold italic text-slate-800">
                      # {previewReceipt.terbilang} #
                    </div>
                  </div>

                  {/* Untuk Pembayaran */}
                  <div className="flex items-baseline gap-2">
                    <span className="w-36 text-slate-600 font-semibold shrink-0">Untuk Pembayaran</span>
                    <span className="text-slate-400 shrink-0">:</span>
                    <span className="font-medium text-slate-800 flex-1 border-b border-dotted border-slate-300 pb-0.5">
                      {previewReceipt.description}
                    </span>
                  </div>

                  {/* Metode */}
                  <div className="flex items-baseline gap-2">
                    <span className="w-36 text-slate-600 font-semibold shrink-0">Metode Bayar</span>
                    <span className="text-slate-400 shrink-0">:</span>
                    <span className="font-bold text-teal-deep flex-1">
                      {previewReceipt.payment_method}
                    </span>
                  </div>
                </div>

                {/* Footer Signatures & Amount Box */}
                <div className="pt-4 flex flex-col sm:flex-row items-end justify-between gap-4 border-t border-slate-200">
                  {/* Amount Badge */}
                  <div className="p-3 bg-midnight text-white rounded-xl min-w-[200px]">
                    <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">
                      JUMLAH PEMBAYARAN:
                    </span>
                    <span className="text-lg font-black tracking-tight text-teal-soft">
                      {formatRupiah(previewReceipt.amount)}
                    </span>
                  </div>

                  {/* Signature Space */}
                  <div className="text-center min-w-[180px]">
                    <p className="text-[11px] text-slate-500">
                      Tangerang Selatan, {formatDateId(previewReceipt.payment_date)}
                    </p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      Penerima / Bendahara,
                    </p>
                    <div className="h-14 flex items-center justify-center">
                      <span className="text-[10px] text-slate-300 italic">( Tanda Tangan & Cap )</span>
                    </div>
                    <p className="text-xs font-bold text-midnight border-t border-slate-300 pt-1">
                      ( {previewReceipt.received_by || 'Bendahara Kegiatan'} )
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Buttons */}
            <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Print Button */}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kwitansi</span>
                </button>

                {/* PDF Button */}
                <button
                  onClick={() => exportPaymentReceiptPDF(previewReceipt)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-deep hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </button>

                {/* Send WhatsApp */}
                <button
                  onClick={() => handleSendWhatsApp(previewReceipt)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim WhatsApp</span>
                </button>
              </div>

              <button
                onClick={() => setPreviewReceipt(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS KWITANSI                                         */}
      {/* ========================================================================= */}
      {deletingReceiptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hapus Kwitansi?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data kwitansi ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingReceiptId(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition"
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
