import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Bus, BusSeat, Jamaah, SeatRole } from '../types';
import { exportBusSeatChartPDF } from '../utils/pdf';
import { 
  Grid, 
  Printer, 
  UserPlus, 
  UserMinus, 
  RefreshCw, 
  ShieldCheck, 
  User, 
  X, 
  Search, 
  Check, 
  AlertCircle,
  HelpCircle,
  Sliders,
  ChevronDown
} from 'lucide-react';

interface SeatEditorViewProps {
  initialBusId?: string;
}

export const SeatEditorView: React.FC<SeatEditorViewProps> = ({ initialBusId }) => {
  const { 
    busesList, 
    jamaahList, 
    getSeatsForBus, 
    assignSeat, 
    freeSeat, 
    saveCustomBusLayout,
    showToast 
  } = useApp();

  const [selectedBusId, setSelectedBusId] = useState<string>(() => {
    return initialBusId || (busesList[0]?.id ?? 'BUS-01');
  });

  const selectedBus = useMemo(() => {
    return busesList.find(b => b.id === selectedBusId) || busesList[0];
  }, [busesList, selectedBusId]);

  const seats = useMemo(() => {
    if (!selectedBus) return [];
    return getSeatsForBus(selectedBus.id);
  }, [selectedBus, getSeatsForBus]);

  // Modal / Selection State
  const [selectedSeat, setSelectedSeat] = useState<BusSeat | null>(null);
  const [occupantSearch, setOccupantSearch] = useState('');
  const [isConfigMode, setIsConfigMode] = useState(false);

  // Group seats by row
  const rowsGrouped = useMemo(() => {
    const grouped: Record<number, BusSeat[]> = {};
    seats.forEach(seat => {
      if (!grouped[seat.row_num]) {
        grouped[seat.row_num] = [];
      }
      grouped[seat.row_num].push(seat);
    });

    // Sort cols in each row
    Object.keys(grouped).forEach(r => {
      grouped[Number(r)].sort((a, b) => a.col_num - b.col_num);
    });

    return grouped;
  }, [seats]);

  const rowNumbers = useMemo(() => {
    return Object.keys(rowsGrouped)
      .map(Number)
      .sort((a, b) => a - b);
  }, [rowsGrouped]);

  // Available Jamaah candidates for seat assignment (belum punya kursi atau pindah)
  const candidateJamaah = useMemo(() => {
    const q = occupantSearch.toLowerCase();
    return jamaahList.filter(j => {
      const matchSearch = j.name.toLowerCase().includes(q) || (j.phone && j.phone.includes(q));
      return matchSearch;
    });
  }, [jamaahList, occupantSearch]);

  // Stats
  const filledCount = seats.filter(s => s.role !== 'empty' && s.role !== 'driver' && s.role !== 'door' && s.occupant_name).length;
  const emptyCount = seats.filter(s => s.role === 'empty').length;

  const handleSeatClick = (seat: BusSeat) => {
    if (seat.role === 'driver' || seat.role === 'door') {
      // Driver or door informational
      return;
    }
    setSelectedSeat(seat);
    setOccupantSearch('');
  };

  const handleAssignPerson = async (person: Jamaah | { id: string; name: string; role: 'tour_leader' | 'pembimbing' }) => {
    if (!selectedSeat || !selectedBus) return;

    const role = 'role' in person ? person.role : 'jamaah';
    await assignSeat(
      selectedBus.id,
      selectedSeat.seat_number,
      person.id,
      person.name,
      role
    );

    setSelectedSeat(null);
  };

  const handleFreeCurrentSeat = async () => {
    if (!selectedSeat || !selectedBus) return;
    await freeSeat(selectedBus.id, selectedSeat.seat_number);
    setSelectedSeat(null);
  };

  const handlePrintPDF = () => {
    if (!selectedBus) return;
    exportBusSeatChartPDF(selectedBus, seats, selectedBus.staff || []);
    showToast(`Dokumen PDF Denah Kursi ${selectedBus.name} berhasil dibuat!`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <Grid className="w-6 h-6 text-teal-deep" />
            <span>Editor Denah Kursi Bus Interaktif</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tampilan tampak atas (bird's eye view). Klik kursi untuk menempatkan jamaah atau petugas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Bus Selector */}
          <div className="relative">
            <select
              value={selectedBusId}
              onChange={e => setSelectedBusId(e.target.value)}
              className="px-3 py-2 pr-8 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-soft/40 text-midnight shadow-sm"
            >
              {busesList.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.operator} - {b.capacity} Kursi)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Denah</span>
          </button>
        </div>
      </div>

      {/* Stats and Legend Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Total Kursi:</span>
            <span className="font-extrabold text-midnight">{selectedBus?.capacity || 59}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Terisi:</span>
            <span className="font-extrabold text-teal-deep">{filledCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Kosong:</span>
            <span className="font-extrabold text-slate-600">{emptyCount}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-white border-2 border-slate-300 shadow-sm" />
            <span>Kosong</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-teal-soft border border-teal-500 shadow-sm" />
            <span>Jamaah</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-midnight border border-midnight-900 shadow-sm" />
            <span>Tour Leader</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-teal-deep border border-teal-800 shadow-sm" />
            <span>Pembimbing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-400 shadow-sm" />
            <span>Sopir / Pintu</span>
          </div>
        </div>
      </div>

      {/* Bird's Eye View Bus Canvas */}
      <div className="bg-slate-100/80 p-4 sm:p-8 rounded-3xl border border-slate-200 flex justify-center overflow-x-auto">
        <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-midnight/80 p-4 sm:p-6 shadow-2xl relative select-none">
          {/* Front of bus windshield */}
          <div className="mb-6 pb-4 border-b-2 border-dashed border-slate-300 text-center relative">
            <div className="w-24 h-2 bg-slate-300 rounded-full mx-auto mb-2" />
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400">
              BAGIAN DEPAN BUS (KACA UTAMA)
            </span>
          </div>

          {/* Seat Grid Rows */}
          <div className="space-y-2.5">
            {rowNumbers.map(rowNum => {
              const rowSeats = rowsGrouped[rowNum];
              const isLastRow = rowNum === rowNumbers[rowNumbers.length - 1];

              return (
                <div key={rowNum} className="flex items-center justify-between gap-1 sm:gap-2">
                  {/* Left seats (Cols 1, 2) */}
                  <div className="flex items-center gap-1.5">
                    {rowSeats
                      .filter(s => s.col_num <= 2)
                      .map(seat => renderSeatButton(seat, handleSeatClick))}
                  </div>

                  {/* Center Aisle or Back 5-seater middle */}
                  {isLastRow ? (
                    <div className="flex items-center justify-center">
                      {rowSeats
                        .filter(s => s.col_num === 3)
                        .map(seat => renderSeatButton(seat, handleSeatClick))}
                    </div>
                  ) : (
                    <div className="w-8 sm:w-12 text-center text-[9px] font-bold text-slate-300">
                      • {rowNum} •
                    </div>
                  )}

                  {/* Right seats (Cols 4, 5) */}
                  <div className="flex items-center gap-1.5">
                    {rowSeats
                      .filter(s => s.col_num >= 4)
                      .map(seat => renderSeatButton(seat, handleSeatClick))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rear of bus */}
          <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 text-center">
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400">
              BAGIAN BELAKANG BUS
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Klik Kursi -> Pilih Jamaah / Petugas                               */}
      {/* ========================================================================= */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Kursi {selectedSeat.seat_number} • {selectedBus?.name}
                </h3>
                <p className="text-[11px] text-teal-soft">
                  {selectedSeat.occupant_name
                    ? `Saat ini terisi: ${selectedSeat.occupant_name}`
                    : 'Status: Kursi Kosong'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSeat(null)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
              {/* If already occupied, option to empty */}
              {selectedSeat.occupant_name && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Penghuni Kursi</span>
                    <span className="font-extrabold text-midnight text-sm">{selectedSeat.occupant_name}</span>
                    <span className="text-[11px] text-teal-deep block font-medium">
                      {selectedSeat.occupant_role_label || 'Jamaah'}
                    </span>
                  </div>
                  <button
                    onClick={handleFreeCurrentSeat}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
                  </button>
                </div>
              )}

              {/* Staff quick assign option */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Tetapkan Petugas Bus Ini
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const tl = (selectedBus?.staff || []).find(s => s.role === 'tour_leader');
                      handleAssignPerson({
                        id: tl ? tl.id : `TL-${selectedBus?.id}`,
                        name: tl ? tl.name : 'Tour Leader Utama',
                        role: 'tour_leader'
                      });
                    }}
                    className="flex-1 py-2 px-3 bg-midnight text-white text-xs font-bold rounded-xl hover:bg-midnight-700 transition"
                  >
                    Tour Leader (TL)
                  </button>

                  <button
                    onClick={() => {
                      const pb = (selectedBus?.staff || []).find(s => s.role === 'pembimbing');
                      handleAssignPerson({
                        id: pb ? pb.id : `PB-${selectedBus?.id}`,
                        name: pb ? pb.name : 'Pembimbing Ibadah',
                        role: 'pembimbing'
                      });
                    }}
                    className="flex-1 py-2 px-3 bg-teal-deep text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition"
                  >
                    Pembimbing (PB)
                  </button>
                </div>
              </div>

              {/* Jamaah Search and Assign List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Atau Pilih Dari Daftar Jamaah
                </h4>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={occupantSearch}
                    onChange={e => setOccupantSearch(e.target.value)}
                    placeholder="Cari nama jamaah atau no telepon..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 divide-y divide-slate-100 border border-slate-200 rounded-xl p-1">
                  {candidateJamaah.slice(0, 30).map(j => {
                    const isAlreadyOnThisSeat = j.id === selectedSeat.occupant_id;
                    const hasOtherSeat = j.seat_number && !isAlreadyOnThisSeat;

                    return (
                      <button
                        key={j.id}
                        onClick={() => handleAssignPerson(j)}
                        className={`w-full p-2.5 text-left rounded-lg transition flex items-center justify-between text-xs ${
                          isAlreadyOnThisSeat
                            ? 'bg-teal-50 border border-teal-200 text-teal-deep'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-800">{j.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {j.id} • {j.rombongan_name || 'Umum'}
                            {hasOtherSeat && (
                              <span className="text-amber-600 font-semibold ml-1">
                                (Saat ini di {j.bus_name} Kursi {j.seat_number})
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-midnight text-white text-[10px] font-bold rounded-lg shrink-0">
                          {isAlreadyOnThisSeat ? 'Terpilih' : 'Pilih'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedSeat(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-200 rounded-xl hover:bg-slate-300"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Render individual seat button in canvas
 */
function renderSeatButton(seat: BusSeat, onClick: (seat: BusSeat) => void) {
  if (seat.role === 'driver') {
    return (
      <div
        key={seat.id}
        className="w-12 h-12 rounded-xl bg-slate-200 border-2 border-slate-400 flex flex-col items-center justify-center text-slate-700 shadow-sm"
        title="Posisi Sopir"
      >
        <span className="text-[9px] font-black uppercase">SOPIR</span>
        <span className="text-[8px] text-slate-500 font-bold">Driver</span>
      </div>
    );
  }

  if (seat.role === 'door') {
    return (
      <div
        key={seat.id}
        className="w-12 h-12 rounded-xl bg-amber-50 border-2 border-amber-300 border-dashed flex flex-col items-center justify-center text-amber-800 shadow-sm"
        title="Pintu Masuk/Keluar"
      >
        <span className="text-[9px] font-black uppercase">PINTU</span>
        <span className="text-[8px] text-amber-600 font-bold">Door</span>
      </div>
    );
  }

  // Tour Leader Seat
  if (seat.role === 'tour_leader') {
    return (
      <button
        key={seat.id}
        onClick={() => onClick(seat)}
        className="w-12 h-12 rounded-xl bg-midnight border-2 border-midnight-950 text-white flex flex-col items-center justify-center shadow-md hover:scale-105 transition"
        title={`Tour Leader: ${seat.occupant_name || 'Belum Diisi'}`}
      >
        <span className="text-[10px] font-extrabold text-teal-soft">{seat.seat_number}</span>
        <span className="text-[8px] font-bold truncate max-w-[40px] px-0.5">
          {seat.occupant_name ? seat.occupant_name.split(' ')[0] : 'TL'}
        </span>
      </button>
    );
  }

  // Pembimbing Seat
  if (seat.role === 'pembimbing') {
    return (
      <button
        key={seat.id}
        onClick={() => onClick(seat)}
        className="w-12 h-12 rounded-xl bg-teal-deep border-2 border-teal-800 text-white flex flex-col items-center justify-center shadow-md hover:scale-105 transition"
        title={`Pembimbing: ${seat.occupant_name || 'Belum Diisi'}`}
      >
        <span className="text-[10px] font-extrabold text-teal-soft">{seat.seat_number}</span>
        <span className="text-[8px] font-bold truncate max-w-[40px] px-0.5">
          {seat.occupant_name ? seat.occupant_name.split(' ')[0] : 'PB'}
        </span>
      </button>
    );
  }

  // Occupied Jamaah Seat
  if (seat.occupant_name) {
    return (
      <button
        key={seat.id}
        onClick={() => onClick(seat)}
        className="w-12 h-12 rounded-xl bg-teal-soft border-2 border-teal-500 text-midnight flex flex-col items-center justify-center shadow-md hover:scale-105 transition"
        title={`Jamaah: ${seat.occupant_name}`}
      >
        <span className="text-[10px] font-extrabold">{seat.seat_number}</span>
        <span className="text-[8px] font-bold text-midnight truncate max-w-[42px] px-0.5">
          {seat.occupant_name.split(' ')[0]}
        </span>
      </button>
    );
  }

  // Empty Seat
  return (
    <button
      key={seat.id}
      onClick={() => onClick(seat)}
      className="w-12 h-12 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:border-teal-deep hover:text-teal-deep flex flex-col items-center justify-center shadow-sm hover:scale-105 transition"
      title="Kursi Kosong - Klik untuk isi"
    >
      <span className="text-[10px] font-bold">{seat.seat_number}</span>
      <span className="text-[8px] text-slate-300 font-semibold">Kosong</span>
    </button>
  );
}
