import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bus, BusStaff } from '../types';
import { exportBusManifestToExcel } from '../utils/excel';
import { 
  Bus as BusIcon, 
  Plus, 
  Users, 
  ShieldCheck, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  X, 
  Phone,
  UserPlus,
  Settings2
} from 'lucide-react';
import { MainNavId } from '../components/layout/Sidebar';

interface BusViewProps {
  onNavigateToSeats: (busId: string) => void;
}

export const BusView: React.FC<BusViewProps> = ({ onNavigateToSeats }) => {
  const { 
    busesList, 
    jamaahList, 
    addBus, 
    updateBus, 
    deleteBus, 
    assignBusStaff, 
    removeBusStaff,
    busSeatsMap,
    showToast 
  } = useApp();

  // Modals state
  const [isAddBusModalOpen, setIsAddBusModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedBusForStaff, setSelectedBusForStaff] = useState<Bus | null>(null);
  const [deletingBusId, setDeletingBusId] = useState<string | null>(null);

  // Form states Bus
  const [formName, setFormName] = useState('');
  const [formOperator, setFormOperator] = useState('Blue Star');
  const [formBusType, setFormBusType] = useState('Executive Jetbus 5');
  const [formCapacity, setFormCapacity] = useState<number>(59);
  const [formStatus, setFormStatus] = useState<'active' | 'standby' | 'full'>('active');
  const [formNotes, setFormNotes] = useState('');

  // Form states Staff
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<'tour_leader' | 'pembimbing'>('tour_leader');
  const [staffSeatNumber, setStaffSeatNumber] = useState('1A');

  const handleOpenAddBus = () => {
    setEditingBus(null);
    setFormName(`Bus ${String(busesList.length + 1).padStart(2, '0')}`);
    setFormOperator('Blue Star');
    setFormBusType('Executive Jetbus 5');
    setFormCapacity(59);
    setFormStatus('active');
    setFormNotes('');
    setIsAddBusModalOpen(true);
  };

  const handleOpenEditBus = (b: Bus) => {
    setEditingBus(b);
    setFormName(b.name);
    setFormOperator(b.operator);
    setFormBusType(b.bus_type);
    setFormCapacity(b.capacity);
    setFormStatus(b.status);
    setFormNotes(b.notes || '');
    setIsAddBusModalOpen(true);
  };

  const handleSubmitBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Nama bus wajib diisi!', 'warning');
      return;
    }

    if (editingBus) {
      await updateBus(editingBus.id, {
        name: formName,
        operator: formOperator,
        bus_type: formBusType,
        capacity: Number(formCapacity),
        status: formStatus,
        notes: formNotes
      });
    } else {
      await addBus({
        name: formName,
        operator: formOperator,
        bus_type: formBusType,
        capacity: Number(formCapacity),
        status: formStatus,
        notes: formNotes
      });
    }

    setIsAddBusModalOpen(false);
  };

  const handleOpenStaffModal = (b: Bus) => {
    setSelectedBusForStaff(b);
    setStaffName('');
    setStaffPhone('');
    setStaffRole('tour_leader');
    setStaffSeatNumber('1A');
    setIsStaffModalOpen(true);
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusForStaff || !staffName.trim()) {
      showToast('Nama petugas wajib diisi!', 'warning');
      return;
    }

    await assignBusStaff(selectedBusForStaff.id, {
      bus_id: selectedBusForStaff.id,
      name: staffName,
      phone: staffPhone,
      role: staffRole,
      seat_number: staffSeatNumber
    });

    setStaffName('');
    setStaffPhone('');
    setIsStaffModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <BusIcon className="w-6 h-6 text-teal-deep" />
            <span>Data Armada Bus & Petugas Operasional</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola puluhan unit bus, kapasitas 59/60 kursi, serta penugasan Tour Leader dan Pembimbing.
          </p>
        </div>

        <button
          onClick={handleOpenAddBus}
          className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Bus</span>
        </button>
      </div>

      {/* Grid of Buses (Compact & Responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {busesList.map(bus => {
          const passengers = jamaahList.filter(j => j.bus_id === bus.id);
          const staff = bus.staff || [];
          const tl = staff.find(s => s.role === 'tour_leader');
          const pembimbingList = staff.filter(s => s.role === 'pembimbing');
          const totalOccupants = passengers.length + staff.length;
          const remainingSeats = Math.max(0, bus.capacity - totalOccupants);
          const percentFilled = bus.capacity > 0 ? Math.round((totalOccupants / bus.capacity) * 100) : 0;

          return (
            <div 
              key={bus.id} 
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header Compact */}
              <div className="p-3.5 pb-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-deep block truncate">
                      {bus.operator}
                    </span>
                    <h3 className="font-extrabold text-sm text-midnight tracking-tight truncate">
                      {bus.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate leading-tight">
                      {bus.bus_type || 'Executive Bus'}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                    bus.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : bus.status === 'full' 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {bus.status === 'active' ? 'Siap Jalan' : bus.status === 'full' ? 'Penuh' : 'Standby'}
                  </span>
                </div>

                {/* Compact Capacity Counter & Progress Bar */}
                <div className="mt-2.5 pt-2 border-t border-slate-100/80">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500 font-medium">
                      Kapasitas: <strong className="text-midnight">{bus.capacity}</strong>
                    </span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-teal-deep font-bold">Terisi {totalOccupants}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-emerald-700 font-bold">Sisa {remainingSeats}</span>
                    </div>
                  </div>
                  {/* Mini Progress Bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        percentFilled >= 100 
                          ? 'bg-rose-500' 
                          : percentFilled > 75 
                          ? 'bg-amber-500' 
                          : 'bg-teal-deep'
                      }`}
                      style={{ width: `${Math.min(100, percentFilled)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Staff & Occupant Section Compact */}
              <div className="p-3.5 py-2.5 space-y-2 text-xs flex-1">
                {/* Tour Leader & Pembimbing in neat rows */}
                <div className="space-y-1 bg-slate-50/70 p-2 rounded-xl border border-slate-100 text-[11px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">TL:</span>
                    <span className="font-semibold text-midnight truncate text-right flex-1">
                      {tl ? tl.name : <em className="text-slate-400 font-normal">Belum diatur</em>}
                    </span>
                    {tl?.seat_number && (
                      <span className="px-1 py-0.2 bg-midnight/10 text-midnight text-[9px] font-mono font-bold rounded shrink-0">
                        {tl.seat_number}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1 border-t border-slate-200/50 pt-1">
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">PB:</span>
                    <span className="font-semibold text-midnight truncate text-right flex-1">
                      {pembimbingList.length > 0 
                        ? pembimbingList.map(p => p.name).join(', ') 
                        : <em className="text-slate-400 font-normal">Belum diatur</em>}
                    </span>
                    {pembimbingList[0]?.seat_number && (
                      <span className="px-1 py-0.2 bg-teal-50 text-teal-deep text-[9px] font-mono font-bold rounded shrink-0">
                        {pembimbingList[0].seat_number}
                      </span>
                    )}
                  </div>
                </div>

                {/* Jamaah count & Atur Petugas link */}
                <div className="flex items-center justify-between text-[11px] pt-0.5 px-0.5">
                  <span className="text-slate-500">
                    Jamaah: <strong className="text-slate-800">{passengers.length} Orang</strong>
                  </span>
                  <button
                    onClick={() => handleOpenStaffModal(bus)}
                    className="text-[10px] text-teal-deep hover:text-midnight font-bold hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Petugas</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons Compact */}
              <div className="p-2.5 px-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => onNavigateToSeats(bus.id)}
                  className="flex-1 py-1.5 px-2 bg-midnight hover:bg-midnight-700 text-white font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition shadow-sm"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Denah Kursi</span>
                </button>

                <button
                  onClick={() => exportBusManifestToExcel(bus, passengers, staff)}
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 bg-white rounded-lg transition"
                  title="Unduh Manifest Penumpang (Excel)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleOpenEditBus(bus)}
                  className="p-1.5 text-slate-500 hover:text-midnight hover:bg-slate-200 border border-slate-200 bg-white rounded-lg transition"
                  title="Edit Info Bus"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setDeletingBusId(bus.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 bg-white rounded-lg transition"
                  title="Hapus Bus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Tambah / Edit Bus                                                  */}
      {/* ========================================================================= */}
      {isAddBusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingBus ? `Edit Bus: ${editingBus.name}` : 'Tambah Armada Bus Baru'}
              </h3>
              <button
                onClick={() => setIsAddBusModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBus} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor / Nama Bus *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  placeholder="Contoh: Bus 01"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operator Bus
                  </label>
                  <input
                    type="text"
                    value={formOperator}
                    onChange={e => setFormOperator(e.target.value)}
                    placeholder="Contoh: Blue Star"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    value={formCapacity}
                    onChange={e => setFormCapacity(Number(e.target.value))}
                    min={10}
                    max={80}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                  <span className="text-[10px] text-slate-400">Umumnya 59 atau 60 kursi</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipe Bus & Karoseri
                </label>
                <input
                  type="text"
                  value={formBusType}
                  onChange={e => setFormBusType(e.target.value)}
                  placeholder="Contoh: Executive Jetbus 5 SHD"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Operasional
                </label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                >
                  <option value="active">Siap Jalan (Active)</option>
                  <option value="standby">Standby (Cadangan)</option>
                  <option value="full">Penuh (Full)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Fasilitas / Armada
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Toilet, dispenser air, konfigurasi pintu..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBusModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-midnight rounded-xl hover:bg-midnight-700 transition shadow-md"
                >
                  {editingBus ? 'Simpan Perubahan' : 'Daftarkan Bus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Atur Petugas Bus (Tour Leader & Pembimbing)                        */}
      {/* ========================================================================= */}
      {isStaffModalOpen && selectedBusForStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Petugas {selectedBusForStaff.name}</h3>
                <p className="text-[11px] text-teal-soft">Tetapkan Tour Leader dan Pembimbing Bus</p>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
              {/* Petugas saat ini */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Daftar Petugas Saat Ini
                </h4>
                <div className="space-y-2">
                  {(selectedBusForStaff.staff || []).length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">
                      Belum ada petugas yang ditugaskan pada bus ini.
                    </p>
                  ) : (
                    (selectedBusForStaff.staff || []).map(s => (
                      <div 
                        key={s.id} 
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-midnight">{s.name}</span>
                            <span className="px-1.5 py-0.5 bg-teal-soft/20 text-teal-deep text-[10px] font-bold rounded">
                              {s.role === 'tour_leader' ? 'Tour Leader' : 'Pembimbing'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Kursi: {s.seat_number || '-'} • Telp: {s.phone || '-'}
                          </span>
                        </div>
                        <button
                          onClick={() => removeBusStaff(selectedBusForStaff.id, s.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Hapus Petugas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Form Tambah Petugas */}
              <form onSubmit={handleAddStaffSubmit} className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Tambah Petugas Baru
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Petugas *
                  </label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    required
                    placeholder="Contoh: Ust. M. Farhan Assegaf"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Peran Petugas
                    </label>
                    <select
                      value={staffRole}
                      onChange={e => setStaffRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                    >
                      <option value="tour_leader">Tour Leader (TL)</option>
                      <option value="pembimbing">Pembimbing Ibadah</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor Kursi Petugas
                    </label>
                    <input
                      type="text"
                      value={staffSeatNumber}
                      onChange={e => setStaffSeatNumber(e.target.value)}
                      placeholder="Contoh: 1A"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Telepon
                  </label>
                  <input
                    type="text"
                    value={staffPhone}
                    onChange={e => setStaffPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-midnight text-white text-xs font-bold rounded-xl hover:bg-midnight-700 transition"
                >
                  Tambahkan ke Bus
                </button>
              </form>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Konfirmasi Hapus Bus                                               */}
      {/* ========================================================================= */}
      {deletingBusId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hapus Armada Bus</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus bus ini? Jamaah yang dialokasikan ke bus ini akan di-reset status kursinya.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingBusId(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  await deleteBus(deletingBusId);
                  setDeletingBusId(null);
                }}
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
