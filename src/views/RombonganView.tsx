import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Rombongan } from '../types';
import { formatRupiah } from '../utils/formatters';
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
  ExternalLink
} from 'lucide-react';

export const RombonganView: React.FC = () => {
  const { 
    rombonganList, 
    jamaahList, 
    busesList, 
    addRombongan, 
    updateRombongan, 
    deleteRombongan,
    showToast 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRombongan, setEditingRombongan] = useState<Rombongan | null>(null);
  const [viewingMembersRombongan, setViewingMembersRombongan] = useState<Rombongan | null>(null);
  const [deletingRombId, setDeletingRombId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCoordinator, setFormCoordinator] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBusId, setFormBusId] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Search filter
  const filteredList = useMemo(() => {
    return rombonganList.filter(r => {
      const q = searchTerm.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.coordinator_name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [rombonganList, searchTerm]);

  const handleOpenAdd = () => {
    setEditingRombongan(null);
    setFormName('');
    setFormCoordinator('');
    setFormPhone('');
    setFormBusId('');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (r: Rombongan) => {
    setEditingRombongan(r);
    setFormName(r.name);
    setFormCoordinator(r.coordinator_name);
    setFormPhone(r.coordinator_phone || '');
    setFormBusId(r.bus_id || '');
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
        notes: formNotes
      });
    } else {
      await addRombongan({
        name: formName,
        coordinator_name: formCoordinator || 'Koordinator',
        coordinator_phone: formPhone,
        bus_id: formBusId || undefined,
        bus_name: busObj?.name,
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-teal-deep" />
            <span>Data Rombongan Jamaah</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola kelompok majelis ta'lim, keluarga besar, dan perwakilan daerah.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Rombongan</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
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
        <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
          Total: {rombonganList.length} Rombongan
        </span>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map(r => {
          const members = jamaahList.filter(j => j.rombongan_id === r.id);
          const lunasCount = members.filter(j => j.payment_status === 'Lunas').length;
          const assignedBus = busesList.find(b => b.id === r.bus_id);

          return (
            <div 
              key={r.id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-midnight">{r.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400">{r.id}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-teal-50 text-teal-deep rounded-full text-xs font-bold">
                    {members.length} Jamaah
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Koordinator:</span>
                    <span className="font-semibold text-slate-800">{r.coordinator_name}</span>
                  </div>
                  {r.coordinator_phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 w-24">Kontak:</span>
                      <span className="font-mono text-slate-700">{r.coordinator_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Armada Bus:</span>
                    <span className="font-semibold text-midnight">
                      {assignedBus ? assignedBus.name : 'Belum Ditentukan'}
                    </span>
                  </div>
                </div>

                {/* Progress pelunasan anggota rombongan */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Status Pelunasan</span>
                    <span className="font-bold text-teal-deep">
                      {members.length > 0 ? Math.round((lunasCount / members.length) * 100) : 0}% ({lunasCount}/{members.length})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-deep h-full transition-all"
                      style={{ width: `${members.length > 0 ? (lunasCount / members.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => setViewingMembersRombongan(r)}
                  className="text-xs text-teal-deep font-bold hover:underline flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5" />
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
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Tambah / Edit Rombongan                                            */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                  Nomor HP Koordinator
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alokasi Armada Bus (Opsional)
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
                  className="px-5 py-2 text-xs font-bold text-white bg-midnight rounded-xl hover:bg-midnight-700 transition shadow-md"
                >
                  {editingRombongan ? 'Simpan Perubahan' : 'Buat Rombongan'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Anggota: {viewingMembersRombongan.name}</h3>
                <p className="text-[11px] text-teal-soft">
                  Koordinator: {viewingMembersRombongan.coordinator_name}
                </p>
              </div>
              <button
                onClick={() => setViewingMembersRombongan(null)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2">
              {jamaahList.filter(j => j.rombongan_id === viewingMembersRombongan.id).length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  Belum ada jamaah yang terdaftar dalam rombongan ini.
                </p>
              ) : (
                jamaahList
                  .filter(j => j.rombongan_id === viewingMembersRombongan.id)
                  .map((m, idx) => (
                    <div 
                      key={m.id} 
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-slate-400 font-mono text-[11px]">{idx + 1}.</span>
                        <div>
                          <p className="font-bold text-slate-800">{m.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {m.bus_name ? `${m.bus_name} (Kursi ${m.seat_number || '-'})` : 'Belum dapat bus'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.payment_status === 'Lunas'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.payment_status === 'Cicilan'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.payment_status}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingMembersRombongan(null)}
                className="px-4 py-2 text-xs font-bold bg-midnight text-white rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Konfirmasi Hapus Rombongan                                         */}
      {/* ========================================================================= */}
      {deletingRombId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hapus Rombongan</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus rombongan ini? Rombongan hanya dapat dihapus jika tidak ada jamaah terdaftar di dalamnya.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingRombId(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
