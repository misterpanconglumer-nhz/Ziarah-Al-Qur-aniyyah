import React, { useState, useEffect } from 'react';
import { PaymentTransaction } from '../types';
import { parsePaymentMethodNote, formatRupiah, formatDateId } from '../utils/formatters';
import { X, Wallet, Building2, QrCode, CreditCard } from 'lucide-react';

interface EditPaymentModalProps {
  isOpen: boolean;
  payment: PaymentTransaction | null;
  coordinatorName?: string;
  onClose: () => void;
  onSave: (paymentId: string, data: {
    payment_method: 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Lainnya';
    reference_number?: string;
    notes?: string;
  }) => Promise<void>;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  payment,
  coordinatorName,
  onClose,
  onSave,
}) => {
  const [method, setMethod] = useState<'Tunai' | 'Transfer Bank' | 'QRIS' | 'Lainnya'>('Tunai');
  const [cashChannel, setCashChannel] = useState<'bendahara' | 'koordinator' | 'loket' | 'manasik' | 'custom'>('bendahara');
  const [cashCollector, setCashCollector] = useState('');
  const [transferBank, setTransferBank] = useState('BSI');
  const [accountSender, setAccountSender] = useState('');
  const [qrisChannel, setQrisChannel] = useState('QRIS Resmi Panitia');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!payment) return;

    setMethod(payment.payment_method);
    setReferenceNumber(payment.reference_number || '');

    const { channelBadge, cleanNote } = parsePaymentMethodNote(payment.notes);
    setPaymentNotes(cleanNote || '');

    if (payment.payment_method === 'Tunai') {
      if (channelBadge?.startsWith('Titip Koordinator')) {
        setCashChannel('koordinator');
        const match = channelBadge.replace('Titip Koordinator:', '').replace('Titip Koordinator', '').trim();
        setCashCollector(match || coordinatorName || '');
      } else if (channelBadge?.startsWith('Loket')) {
        setCashChannel('loket');
        setCashCollector(channelBadge.replace(/Loket Pendaftaran\s*\(?/, '').replace(/\)?/, '').trim());
      } else if (channelBadge?.startsWith('Pertemuan/Manasik')) {
        setCashChannel('manasik');
        setCashCollector(channelBadge.replace(/Pertemuan\/Manasik\s*\(?/, '').replace(/\)?/, '').trim());
      } else if (channelBadge === 'Langsung ke Bendahara' || !channelBadge) {
        setCashChannel('bendahara');
        setCashCollector('');
      } else {
        setCashChannel('custom');
        setCashCollector(channelBadge);
      }
    } else if (payment.payment_method === 'Transfer Bank') {
      if (channelBadge?.includes('BSI')) setTransferBank('BSI');
      else if (channelBadge?.includes('BCA')) setTransferBank('BCA');
      else if (channelBadge?.includes('Mandiri')) setTransferBank('Mandiri');
      else if (channelBadge?.includes('BRI')) setTransferBank('BRI');
      else if (channelBadge?.includes('BNI')) setTransferBank('BNI');
      else if (channelBadge?.includes('Bank Jatim')) setTransferBank('Bank Jatim Syariah');
      else setTransferBank('Bank Lainnya');

      const matchSender = channelBadge?.match(/a\/n\s+(.+)$/);
      setAccountSender(matchSender ? matchSender[1].trim() : '');
    } else if (payment.payment_method === 'QRIS') {
      setQrisChannel(channelBadge || 'QRIS Resmi Panitia');
    }
  }, [payment, coordinatorName]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let formattedNotes = paymentNotes.trim();
      if (method === 'Tunai') {
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
      } else if (method === 'Transfer Bank') {
        const senderInfo = accountSender ? ` a/n ${accountSender}` : '';
        formattedNotes = `[Transfer: ${transferBank}${senderInfo}] ${paymentNotes}`.trim();
      } else if (method === 'QRIS') {
        formattedNotes = `[QRIS: ${qrisChannel}] ${paymentNotes}`.trim();
      }

      await onSave(payment.id, {
        payment_method: method,
        reference_number: referenceNumber,
        notes: formattedNotes
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-midnight text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Ubah Metode & Keterangan Pembayaran</h3>
            <p className="text-[11px] text-teal-soft">
              {payment.jamaah_name || 'Jamaah'} • {formatRupiah(payment.amount)} • {formatDateId(payment.date)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
          {/* Pilih Tipe Metode */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Metode Pembayaran *
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('Tunai')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  method === 'Tunai'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-sm ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px]">Tunai</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('Transfer Bank')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  method === 'Transfer Bank'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 font-bold shadow-sm ring-1 ring-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-[11px]">Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('QRIS')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  method === 'QRIS'
                    ? 'bg-purple-50 border-purple-500 text-purple-800 font-bold shadow-sm ring-1 ring-purple-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4 text-purple-600" />
                <span className="text-[11px]">QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('Lainnya')}
                className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                  method === 'Lainnya'
                    ? 'bg-slate-200 border-slate-400 text-slate-800 font-bold shadow-sm ring-1 ring-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span className="text-[11px]">Lainnya</span>
              </button>
            </div>

            {/* Sub-Pilihan Khusus TUNAI */}
            {method === 'Tunai' && (
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
                      {coordinatorName && (
                        <button
                          type="button"
                          onClick={() => setCashCollector(coordinatorName)}
                          className="text-[10px] text-emerald-700 hover:underline font-bold"
                        >
                          + Pakai ({coordinatorName})
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
            {method === 'Transfer Bank' && (
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
            {method === 'QRIS' && (
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
                placeholder="Catatan tambahan..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-midnight rounded-xl hover:bg-midnight-700 transition shadow-md"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
