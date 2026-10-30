import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentTransaction, Jamaah } from '../types';
import { formatRupiah, formatDateId, parsePaymentMethodNote } from '../utils/formatters';
import { exportPaymentsToExcel } from '../utils/excel';
import { 
  CreditCard, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Filter, 
  Ban, 
  ArrowDownRight,
  Clock,
  Check,
  Wallet,
  Building2,
  QrCode
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { 
    paymentsList, 
    jamaahList, 
    rombonganList,
    addPayment, 
    voidPayment, 
    showToast 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // valid or cancelled

  // Modals state
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [voidingTrxId, setVoidingTrxId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Form state
  const [selectedJamaahId, setSelectedJamaahId] = useState('');
  const [jamaahSearch, setJamaahSearch] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(175000);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer Bank' | 'QRIS' | 'Lainnya'>('Tunai');
  
  // Detailed channels & options for Cash, Bank, QRIS
  const [cashChannel, setCashChannel] = useState<'bendahara' | 'koordinator' | 'loket' | 'manasik' | 'custom'>('bendahara');
  const [cashCollector, setCashCollector] = useState('');
  const [transferBank, setTransferBank] = useState('BSI');
  const [accountSender, setAccountSender] = useState('');
  const [qrisChannel, setQrisChannel] = useState('QRIS Resmi Panitia');
  
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Selected jamaah details
  const currentJamaah = useMemo(() => {
    return jamaahList.find(j => j.id === selectedJamaahId);
  }, [jamaahList, selectedJamaahId]);

  // Candidates for search in payment modal
  const candidateJamaah = useMemo(() => {
    const q = jamaahSearch.toLowerCase();
    return jamaahList.filter(j => {
      return (
        j.name.toLowerCase().includes(q) ||
        j.id.toLowerCase().includes(q) ||
        (j.phone && j.phone.includes(q))
      );
    });
  }, [jamaahList, jamaahSearch]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return paymentsList.filter(p => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        p.id.toLowerCase().includes(q) ||
        p.jamaah_id.toLowerCase().includes(q) ||
        (p.jamaah_name && p.jamaah_name.toLowerCase().includes(q)) ||
        (p.reference_number && p.reference_number.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (filterMethod !== 'ALL' && p.payment_method !== filterMethod) return false;
      if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;

      return true;
    });
  }, [paymentsList, searchTerm, filterMethod, filterStatus]);

  // Metrics
  const validPayments = paymentsList.filter(p => p.status === 'valid');
  const totalReceived = validPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalTransactionsCount = validPayments.length;
  const voidCount = paymentsList.filter(p => p.status === 'cancelled').length;

  const handleOpenAdd = (presetJamaahId?: string) => {
    let matchedJm: Jamaah | undefined = undefined;
    if (presetJamaahId) {
      setSelectedJamaahId(presetJamaahId);
      matchedJm = jamaahList.find(j => j.id === presetJamaahId);
      if (matchedJm) {
        setPaymentAmount(matchedJm.remaining_amount > 0 ? matchedJm.remaining_amount : matchedJm.bill_amount);
      }
    } else {
      setSelectedJamaahId('');
      setPaymentAmount(175000);
    }
    setJamaahSearch('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Tunai');
    setCashChannel('bendahara');
    const romb = matchedJm ? rombonganList.find(r => r.id === matchedJm?.rombongan_id) : undefined;
    setCashCollector(romb?.coordinator_name || '');
    setTransferBank('BSI');
    setAccountSender('');
    setQrisChannel('QRIS Resmi Panitia');
    setReferenceNumber(`KWT-${String(paymentsList.length + 1).padStart(4, '0')}`);
    setPaymentNotes('');
    setIsAddPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJamaahId) {
      showToast('Pilih jamaah terlebih dahulu!', 'warning');
      return;
    }

    if (paymentAmount <= 0) {
      showToast('Nominal pembayaran harus lebih dari Rp 0!', 'warning');
      return;
    }

    const jm = jamaahList.find(j => j.id === selectedJamaahId);

    // Build structured notes with payment channel details
    let formattedNotes = paymentNotes.trim();
    if (paymentMethod === 'Tunai') {
      let channelLabel = 'Langsung ke Bendahara';
      if (cashChannel === 'koordinator') {
        channelLabel = `Titip Koordinator${cashCollector ? `: ${cashCollector}` : ''}`;
      } else if (cashChannel === 'loket') {
        channelLabel = `Loket Pendaftaran${cashCollector ? ` (${cashCollector})` : ''}`;
      } else if (cashChannel === 'manasik') {
        channelLabel = `Pertemuan/Manasik${cashCollector ? ` (${cashCollector})` : ''}`;
      } else if (cashChannel === 'custom') {
        channelLabel = cashCollector ? cashCollector : 'Keterangan Khusus';
      }
      formattedNotes = `[Cash: ${channelLabel}] ${paymentNotes}`.trim();
    } else if (paymentMethod === 'Transfer Bank') {
      const senderInfo = accountSender ? ` a/n ${accountSender}` : '';
      formattedNotes = `[Transfer: ${transferBank}${senderInfo}] ${paymentNotes}`.trim();
    } else if (paymentMethod === 'QRIS') {
      formattedNotes = `[QRIS: ${qrisChannel}] ${paymentNotes}`.trim();
    }

    await addPayment({
      jamaah_id: selectedJamaahId,
      jamaah_name: jm?.name,
      date: paymentDate,
      amount: Number(paymentAmount),
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      notes: formattedNotes
    });

    setIsAddPaymentModalOpen(false);
  };

  const handleConfirmVoid = async () => {
    if (!voidingTrxId) return;
    if (!voidReason.trim()) {
      showToast('Alasan pembatalan harus diisi!', 'warning');
      return;
    }

    await voidPayment(voidingTrxId, voidReason);
    setVoidingTrxId(null);
    setVoidReason('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-teal-deep" />
            <span>Manajemen Pembayaran Jamaah</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan kas masuk, cicilan bertahap, pelunasan, kwitansi, serta pembatalan berjejak audit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPaymentsToExcel(filteredPayments)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Rekap Excel</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pembayaran</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold truncate">Kas Diterima (Valid)</span>
            <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-emerald-700 truncate">{formatRupiah(totalReceived)}</div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Uang masuk aktual ke bendahara</p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold truncate">Transaksi Valid</span>
            <div className="p-1.5 sm:p-2 bg-teal-50 text-teal-deep rounded-xl">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-midnight truncate">{totalTransactionsCount} Transaksi</div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Cicilan & pelunasan</p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1 sm:mb-2">
            <span className="text-[11px] sm:text-xs font-semibold truncate">Dibatalkan (VOID)</span>
            <div className="p-1.5 sm:p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-rose-700 truncate">{voidCount} Transaksi</div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">Jejak audit pembatalan</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari ID transaksi, nama jamaah, atau nomor kwitansi..."
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
            className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
          >
            <option value="ALL">Semua Metode</option>
            <option value="Tunai">Tunai</option>
            <option value="Transfer Bank">Transfer Bank</option>
            <option value="QRIS">QRIS</option>
            <option value="Lainnya">Lainnya</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
          >
            <option value="ALL">Semua Status</option>
            <option value="valid">Valid Saja</option>
            <option value="cancelled">Dibatalkan (VOID)</option>
          </select>
        </div>
      </div>

      {/* Table of Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">ID Transaksi</th>
                <th className="py-3 px-4">Nama Jamaah</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4">Metode & Bukti</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data transaksi pembayaran.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const isVoid = p.status === 'cancelled';

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/80 transition ${isVoid ? 'bg-rose-50/20' : ''}`}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {p.id}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-midnight block">
                          {p.jamaah_name || 'Jamaah Terhapus'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.jamaah_id}</span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {formatDateId(p.date)}
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-sm">
                        <span className={isVoid ? 'line-through text-slate-400' : 'text-emerald-700'}>
                          {formatRupiah(p.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {(() => {
                          const { channelBadge, cleanNote } = parsePaymentMethodNote(p.notes);
                          const isCash = p.payment_method === 'Tunai';
                          const isTransfer = p.payment_method === 'Transfer Bank';
                          const isQris = p.payment_method === 'QRIS';

                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isCash
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : isTransfer
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : isQris
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {p.payment_method}
                                </span>

                                {channelBadge && (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                                    {channelBadge}
                                  </span>
                                )}

                                {p.reference_number && (
                                  <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[10px] font-mono border border-slate-200">
                                    {p.reference_number}
                                  </span>
                                )}
                              </div>

                              {cleanNote && (
                                <p className="text-[11px] text-slate-600 leading-tight">
                                  {cleanNote}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isVoid ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                              VOID (Dibatalkan)
                            </span>
                            {p.cancelled_reason && (
                              <span className="text-[9px] text-rose-600 mt-0.5" title={p.cancelled_reason}>
                                {p.cancelled_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                            Valid Masuk
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {!isVoid ? (
                          <button
                            onClick={() => {
                              setVoidingTrxId(p.id);
                              setVoidReason('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Batalkan Transaksi Ini (Void)"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Catat Pembayaran Baru                                              */}
      {/* ========================================================================= */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Catat Pembayaran Baru</h3>
                <p className="text-[11px] text-teal-soft">Kwitansi Kas Masuk Operasional</p>
              </div>
              <button
                onClick={() => setIsAddPaymentModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
              {/* Select Jamaah */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Jamaah *
                </label>
                {!selectedJamaahId ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={jamaahSearch}
                      onChange={e => setJamaahSearch(e.target.value)}
                      placeholder="Ketik nama atau nomor telepon jamaah..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                    />
                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {candidateJamaah.slice(0, 10).map(j => (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => {
                            setSelectedJamaahId(j.id);
                            setPaymentAmount(j.remaining_amount > 0 ? j.remaining_amount : j.bill_amount);
                            const romb = rombonganList.find(r => r.id === j.rombongan_id);
                            if (romb?.coordinator_name) {
                              setCashCollector(romb.coordinator_name);
                            }
                          }}
                          className="w-full p-2.5 text-left text-xs hover:bg-teal-50 flex items-center justify-between transition"
                        >
                          <div>
                            <span className="font-bold text-midnight block">{j.name}</span>
                            <span className="text-[10px] text-slate-400">{j.id} • {j.rombongan_name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Sisa Tagihan</span>
                            <span className="font-bold text-amber-700">{formatRupiah(j.remaining_amount)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-midnight block">{currentJamaah?.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {currentJamaah?.id} • Sisa Tagihan: <strong className="text-amber-800">{formatRupiah(currentJamaah?.remaining_amount)}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedJamaahId('')}
                      className="text-xs text-teal-deep font-bold hover:underline"
                    >
                      Ganti
                    </button>
                  </div>
                )}
              </div>

              {/* Nominal & Tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nominal Diterima (Rp) *
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-bold text-emerald-800"
                  />
                  {currentJamaah && currentJamaah.remaining_amount > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(currentJamaah.remaining_amount)}
                      className="text-[10px] text-teal-deep font-bold hover:underline mt-0.5"
                    >
                      Isi Pelunasan ({formatRupiah(currentJamaah.remaining_amount)})
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Transaksi
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>
              </div>

              {/* Metode Pembayaran & Sub-Saluran */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Metode Pembayaran *
                </label>
                
                {/* Selector Tipe Utama */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Tunai')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'Tunai'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px]">Tunai</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transfer Bank')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'Transfer Bank'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 font-bold shadow-sm ring-1 ring-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-[11px]">Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'QRIS'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 font-bold shadow-sm ring-1 ring-purple-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-purple-600" />
                    <span className="text-[11px]">QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Lainnya')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      paymentMethod === 'Lainnya'
                        ? 'bg-slate-200 border-slate-400 text-slate-800 font-bold shadow-sm ring-1 ring-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span className="text-[11px]">Lainnya</span>
                  </button>
                </div>

                {/* Sub-Pilihan Khusus TUNAI */}
                {paymentMethod === 'Tunai' && (
                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                        Keterangan Jalur Penyerahan Tunai:
                      </label>
                      <select
                        value={cashChannel}
                        onChange={e => setCashChannel(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                      >
                        <option value="bendahara">Setor Langsung ke Bendahara Pusat</option>
                        <option value="koordinator">Titip via Koordinator Rombongan</option>
                        <option value="loket">Loket / Petugas Pendaftaran</option>
                        <option value="manasik">Saat Pertemuan / Manasik</option>
                        <option value="custom">Keterangan Khusus / Lainnya</option>
                      </select>
                    </div>

                    {cashChannel === 'koordinator' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-emerald-900">
                            Nama Koordinator yang Dititipkan:
                          </label>
                          {currentJamaah && rombonganList.find(r => r.id === currentJamaah.rombongan_id)?.coordinator_name && (
                            <button
                              type="button"
                              onClick={() => {
                                const cName = rombonganList.find(r => r.id === currentJamaah.rombongan_id)?.coordinator_name;
                                if (cName) setCashCollector(cName);
                              }}
                              className="text-[10px] text-emerald-700 hover:underline font-bold"
                            >
                              + Pakai Koordinator ({rombonganList.find(r => r.id === currentJamaah.rombongan_id)?.coordinator_name})
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={cashCollector}
                          onChange={e => setCashCollector(e.target.value)}
                          placeholder="Contoh: Ust. H. Abdullah / Bpk. Samsul"
                          className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {cashChannel === 'loket' && (
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                          Nama Petugas Loket / Kantor:
                        </label>
                        <input
                          type="text"
                          value={cashCollector}
                          onChange={e => setCashCollector(e.target.value)}
                          placeholder="Contoh: Admin Siti / Meja 1"
                          className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {cashChannel === 'manasik' && (
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                          Penerima Saat Manasik:
                        </label>
                        <input
                          type="text"
                          value={cashCollector}
                          onChange={e => setCashCollector(e.target.value)}
                          placeholder="Contoh: Diterima Panitia saat Manasik Masjid Agung"
                          className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {cashChannel === 'custom' && (
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                          Keterangan / Nama Penerima:
                        </label>
                        <input
                          type="text"
                          value={cashCollector}
                          onChange={e => setCashCollector(e.target.value)}
                          placeholder="Tuliskan keterangan detail penerimaan..."
                          className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-Pilihan Khusus TRANSFER BANK */}
                {paymentMethod === 'Transfer Bank' && (
                  <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-blue-900 mb-1">
                          Bank Tujuan:
                        </label>
                        <select
                          value={transferBank}
                          onChange={e => setTransferBank(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                        >
                          <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                          <option value="BCA">BCA (Bank Central Asia)</option>
                          <option value="Mandiri">Bank Mandiri</option>
                          <option value="BRI">Bank BRI</option>
                          <option value="BNI">Bank BNI</option>
                          <option value="Bank Jatim Syariah">Bank Jatim Syariah</option>
                          <option value="Bank Lainnya">Bank Lainnya</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-blue-900 mb-1">
                          Rekening Pengirim (a/n):
                        </label>
                        <input
                          type="text"
                          value={accountSender}
                          onChange={e => setAccountSender(e.target.value)}
                          placeholder="Nama pemilik rek pengirim..."
                          className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Pilihan Khusus QRIS */}
                {paymentMethod === 'QRIS' && (
                  <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2">
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      Penyedia / Saluran QRIS:
                    </label>
                    <select
                      value={qrisChannel}
                      onChange={e => setQrisChannel(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                    >
                      <option value="QRIS Resmi Panitia">QRIS Resmi Panitia Ziarah</option>
                      <option value="QRIS BSI">QRIS BSI</option>
                      <option value="GoPay">GoPay</option>
                      <option value="OVO">OVO</option>
                      <option value="DANA">DANA</option>
                      <option value="ShopeePay">ShopeePay</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                )}
              </div>

              {/* No Referensi & Catatan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Kwitansi / Bukti Ref
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="Contoh: KWT-001"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Keterangan Tambahan
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="Catatan tambahan (opsional)..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-midnight rounded-xl hover:bg-midnight-700 transition shadow-md"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Pembatalan Transaksi (VOID dengan Jejak Audit)                     */}
      {/* ========================================================================= */}
      {voidingTrxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-slate-900">Batalkan Transaksi (VOID)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Transaksi tidak akan dihapus permanen melainkan ditandai VOID demi jejak audit kas yang jujur.
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
                placeholder="Contoh: Salah input nominal, transfer dobel, atau refund..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setVoidingTrxId(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmVoid}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700"
              >
                Konfirmasi VOID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
