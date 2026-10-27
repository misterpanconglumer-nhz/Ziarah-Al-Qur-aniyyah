import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Bus, BusSeat, Jamaah, SeatRole } from '../types';
import { exportBusSeatChartPDF, exportBusVisualChartPDF } from '../utils/pdf';
import { 
  Grid, 
  Printer, 
  FileDown,
  FileText,
  UserMinus, 
  X, 
  Search, 
  Sliders, 
  ChevronDown,
  CheckCircle,
  LayoutGrid
} from 'lucide-react';

interface SeatEditorViewProps {
  initialBusId?: string;
}

export const SeatEditorView: React.FC<SeatEditorViewProps> = ({ initialBusId }) => {
  const { 
    busesList, 
    jamaahList, 
    rombonganList,
    getSeatsForBus, 
    assignSeat, 
    freeSeat, 
    saveCustomBusLayout,
    updateBusLayoutDimensions,
    standardizeBusTo59Seats,
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

  // View mode: official visual 59-seat view (matching image) or matrix editor
  const [viewMode, setViewMode] = useState<'official_59' | 'matrix'>('official_59');

  // Modal / Selection State
  const [selectedSeat, setSelectedSeat] = useState<BusSeat | null>(null);
  const [occupantSearch, setOccupantSearch] = useState('');
  
  // Row & Column Configuration Modal State
  const [isDimensionModalOpen, setIsDimensionModalOpen] = useState(false);
  const [configRows, setConfigRows] = useState<number>(13);
  const [configCols, setConfigCols] = useState<number>(5);

  // Single Cell Customization Modal State
  const [editingCellSeat, setEditingCellSeat] = useState<BusSeat | null>(null);
  const [cellEditNumber, setCellEditNumber] = useState('');
  const [cellEditRole, setCellEditRole] = useState<SeatRole>('empty');

  // Staff & Coordinator info for this bus
  const tlStaff = useMemo(() => {
    return (selectedBus?.staff || []).find(s => s.role === 'tour_leader');
  }, [selectedBus]);

  const rombonganBus = useMemo(() => {
    return rombonganList.find(r => r.bus_id === selectedBus?.id);
  }, [rombonganList, selectedBus]);

  const koordinatorName = rombonganBus?.coordinator_name || (selectedBus?.staff || []).find(s => s.role === 'pembimbing')?.name || '';
  const koordinatorPhone = rombonganBus?.coordinator_phone || (selectedBus?.staff || []).find(s => s.role === 'pembimbing')?.phone || '';
  const tlName = tlStaff?.name || '';
  const tlPhone = tlStaff?.phone || '';

  // Map seats 1..59 for the official template
  const seatMap59 = useMemo(() => {
    const map = new Map<number, BusSeat>();
    seats.forEach(s => {
      const match = s.seat_number.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num >= 1 && num <= 59 && !map.has(num)) {
          map.set(num, s);
        }
      }
    });

    // Fallback for non-numbered seats
    const unmapped = seats.filter(
      s => s.occupant_name && (!s.seat_number.match(/\d+/) || parseInt(s.seat_number.match(/\d+/)![0], 10) > 59)
    );
    let cur = 1;
    unmapped.forEach(s => {
      while (map.has(cur) && cur <= 59) cur++;
      if (cur <= 59) map.set(cur, s);
    });

    return map;
  }, [seats]);

  const getSeatByNumber = (num: number): BusSeat => {
    if (seatMap59.has(num)) return seatMap59.get(num)!;
    return {
      id: `${selectedBus?.id || 'BUS'}-SEAT-${num}`,
      bus_id: selectedBus?.id || 'BUS',
      seat_number: `SEAT ${num}`,
      row_num: num <= 50 ? Math.ceil(num / 5) : num <= 53 ? 11 : 12,
      col_num: 1,
      role: 'empty'
    };
  };

  // Group seats by row for matrix view
  const rowsGrouped = useMemo(() => {
    const grouped: Record<number, BusSeat[]> = {};
    seats.forEach(seat => {
      if (!grouped[seat.row_num]) {
        grouped[seat.row_num] = [];
      }
      grouped[seat.row_num].push(seat);
    });

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

  // Available Jamaah candidates for seat assignment
  const candidateJamaah = useMemo(() => {
    const q = occupantSearch.toLowerCase();
    return jamaahList.filter(j => {
      return j.name.toLowerCase().includes(q) || (j.phone && j.phone.includes(q));
    });
  }, [jamaahList, occupantSearch]);

  // Stats
  const filledCount = seats.filter(s => s.role !== 'empty' && s.role !== 'driver' && s.role !== 'door' && s.occupant_name).length;
  const emptyCount = Math.max(0, (selectedBus?.capacity || 59) - filledCount);

  const handleSeatClick = (seat: BusSeat) => {
    if (seat.role === 'driver' || seat.role === 'door') {
      setEditingCellSeat(seat);
      setCellEditNumber(seat.seat_number);
      setCellEditRole(seat.role);
      return;
    }
    setSelectedSeat(seat);
    setOccupantSearch('');
  };

  const handleOpenDimensionsModal = () => {
    const maxRow = Math.max(...rowNumbers, 12);
    const maxCol = Math.max(...seats.map(s => s.col_num), 5);
    setConfigRows(maxRow);
    setConfigCols(maxCol >= 5 ? 5 : 4);
    setIsDimensionModalOpen(true);
  };

  const handleApplyDimensions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus) return;
    await updateBusLayoutDimensions(selectedBus.id, Number(configRows), Number(configCols));
    setIsDimensionModalOpen(false);
  };

  const handleSaveCellChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCellSeat || !selectedBus) return;

    const updatedSeats = seats.map(s => {
      if (s.id === editingCellSeat.id) {
        return {
          ...s,
          seat_number: cellEditNumber.trim() || s.seat_number,
          role: cellEditRole
        };
      }
      return s;
    });

    await saveCustomBusLayout(selectedBus.id, updatedSeats);
    setEditingCellSeat(null);
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

  // Print & Export Handlers
  const handlePrintA4 = () => {
    window.print();
  };

  const handleExportVisualPDF = () => {
    if (!selectedBus) return;
    exportBusVisualChartPDF(selectedBus, seats, selectedBus.staff || [], rombonganList);
    showToast(`Dokumen PDF Denah Resmi 59 Kursi ${selectedBus.name} berhasil diunduh!`, 'success');
  };

  const handleExportTabularPDF = () => {
    if (!selectedBus) return;
    exportBusSeatChartPDF(selectedBus, seats, selectedBus.staff || []);
    showToast(`Dokumen PDF Rekap Tabel ${selectedBus.name} berhasil dibuat!`, 'success');
  };

  const handleStandardize59 = async () => {
    if (!selectedBus) return;
    await standardizeBusTo59Seats(selectedBus.id);
  };

  // Helper to render one seat in official 59 view
  const renderOfficialSeatBox = (num: number, className: string = '') => {
    const seat = getSeatByNumber(num);
    const occupant = seat.occupant_name || '';

    return (
      <div
        key={num}
        onClick={() => handleSeatClick(seat)}
        className={`border border-slate-700 bg-white rounded-xs overflow-hidden cursor-pointer hover:border-teal-600 transition shadow-xs group select-none flex flex-col justify-between ${className}`}
        title={`Seat ${num}: ${occupant || 'Kosong'} (Klik untuk kelola)`}
      >
        {/* Top Gray Header: SEAT X */}
        <div className="bg-[#E2E8F0] border-b border-slate-700 py-0.5 px-1 text-center font-bold text-[9px] sm:text-[10px] text-slate-800 tracking-wider">
          SEAT {num}
        </div>

        {/* Occupant Full Name */}
        <div className="p-1 min-h-[38px] sm:min-h-[44px] flex items-center justify-center text-center bg-white">
          {occupant ? (
            <span className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] leading-tight uppercase line-clamp-2 px-0.5">
              {occupant}
            </span>
          ) : (
            <span className="text-[10px] text-slate-300 font-semibold group-hover:text-teal-600 transition">
              -
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Print CSS Stylesheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 6mm;
          }
          body * {
            visibility: hidden !important;
          }
          .print-a4-canvas, .print-a4-canvas * {
            visibility: visible !important;
          }
          .print-a4-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: 2px solid #A3C493 !important;
            padding: 5mm 6mm !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header and Controls (Hidden on print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-midnight tracking-tight flex items-center gap-2">
            <Grid className="w-6 h-6 text-teal-deep" />
            <span>Editor Denah Kursi Bus</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Format denah resmi standar 59 kursi (2-3) menampilkan nama lengkap jamaah. Siap dicetak ke A4 atau diekspor ke PDF.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Standardize 59 Seats Button */}
          <button
            onClick={handleStandardize59}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition shadow-sm"
            title="Standarisasi urutan kursi ke format 59 kursi (2-3)"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Format 59 Kursi</span>
          </button>

          {/* Print A4 Button */}
          <button
            onClick={handlePrintA4}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-deep hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-md"
            title="Cetak langsung ke ukuran kertas A4"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak A4 (Print)</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportVisualPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md"
            title="Download PDF Denah Visual A4 persis seperti gambar"
          >
            <FileDown className="w-4 h-4 text-teal-soft" />
            <span>Export PDF Denah</span>
          </button>

          {/* Tabular PDF */}
          <button
            onClick={handleExportTabularPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
            title="Download PDF Daftar Tabel Penumpang"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">Rekap Tabel</span>
          </button>
        </div>
      </div>

      {/* View Switcher & Stats (Hidden on print) */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('official_59')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'official_59'
                ? 'bg-white text-midnight shadow-sm'
                : 'text-slate-600 hover:text-midnight'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-teal-deep" />
            <span>Denah Resmi 59 Kursi (A4)</span>
          </button>

          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'matrix'
                ? 'bg-white text-midnight shadow-sm'
                : 'text-slate-600 hover:text-midnight'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
            <span>Editor Grid Baris/Kolom</span>
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Total Kursi:</span>
            <span className="font-extrabold text-midnight">{selectedBus?.capacity || 59}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Terisi:</span>
            <span className="font-extrabold text-teal-deep">{filledCount} Orang</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Kosong:</span>
            <span className="font-extrabold text-slate-600">{emptyCount} Kursi</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FORMAT DENAH RESMI 59 KURSI A4 (PERSIS GAMBAR TEMPLATE USER)       */}
      {/* ========================================================================= */}
      {viewMode === 'official_59' && (
        <div className="flex justify-center">
          <div className="print-a4-canvas w-full max-w-3xl bg-white border-2 border-[#A3C493] rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
            {/* Top Green Banner */}
            <div className="bg-[#4F7336] text-white font-extrabold text-lg sm:text-xl py-2.5 rounded-lg text-center tracking-widest uppercase shadow-xs">
              {selectedBus?.name.toUpperCase().startsWith('BUS')
                ? selectedBus.name.toUpperCase()
                : `BUS ${selectedBus?.name.toUpperCase()}`}
            </div>

            {/* Row 0: PINTU MASUK / HELPER - TOUR LEADER - SOPIR */}
            <div className="grid grid-cols-12 gap-2 sm:gap-3 items-stretch">
              {/* Pintu Masuk / Helper */}
              <div className="col-span-3 border border-slate-700 bg-white rounded-xs overflow-hidden flex flex-col justify-between">
                <div className="bg-[#E2E8F0] border-b border-slate-700 py-0.5 text-center font-bold text-[9px] sm:text-[10px] text-slate-800 tracking-wider uppercase">
                  PINTU MASUK
                </div>
                <div className="p-1 min-h-[36px] sm:min-h-[42px] flex items-center justify-center font-extrabold text-slate-800 text-[10px] sm:text-xs">
                  HELPER
                </div>
              </div>

              {/* Spacer */}
              <div className="col-span-1" />

              {/* Tour Leader */}
              <div className="col-span-4 border border-slate-700 bg-white rounded-xs overflow-hidden flex flex-col justify-between">
                <div className="bg-[#E2E8F0] border-b border-slate-700 py-0.5 text-center font-bold text-[9px] sm:text-[10px] text-slate-800 tracking-wider uppercase">
                  TOUR LEADER
                </div>
                <div className="p-1 min-h-[36px] sm:min-h-[42px] flex items-center justify-center text-center font-extrabold text-slate-900 text-[10px] sm:text-xs leading-tight uppercase px-1">
                  {tlName || (
                    <span className="text-slate-300 font-semibold text-[10px]">-</span>
                  )}
                </div>
              </div>

              {/* Spacer */}
              <div className="col-span-1" />

              {/* Sopir (Driver) */}
              <div className="col-span-3 border border-slate-700 bg-white rounded-xs overflow-hidden flex flex-col justify-between">
                <div className="bg-[#E2E8F0] border-b border-slate-700 py-0.5 text-center font-bold text-[9px] sm:text-[10px] text-slate-800 tracking-wider uppercase">
                  SOPIR
                </div>
                <div className="p-1 min-h-[36px] sm:min-h-[42px] flex flex-col items-center justify-center">
                  {/* Steering Wheel SVG Icon */}
                  <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 3v6" />
                    <path d="M12 15v6" />
                    <path d="M3 12h6" />
                    <path d="M15 12h6" />
                  </svg>
                  <span className="font-extrabold text-slate-800 text-[9px] tracking-wider uppercase">SOPIR</span>
                </div>
              </div>
            </div>

            {/* Rows 1 to 10 (2-3 Seating Layout) */}
            <div className="space-y-2">
              {Array.from({ length: 10 }, (_, r) => {
                const base = r * 5;
                const seat1 = base + 1;
                const seat2 = base + 2;
                const seat3 = base + 3;
                const seat4 = base + 4;
                const seat5 = base + 5;

                return (
                  <div key={r} className="grid grid-cols-12 gap-2 sm:gap-3 items-center">
                    {/* Left: 2 Seats (Seat 1 & 2) */}
                    <div className="col-span-5 grid grid-cols-2 gap-1.5 sm:gap-2">
                      {renderOfficialSeatBox(seat1)}
                      {renderOfficialSeatBox(seat2)}
                    </div>

                    {/* Center Gang / Aisle */}
                    <div className="col-span-1 flex items-center justify-center">
                      <div className="w-1.5 h-6 bg-slate-100 rounded-full" />
                    </div>

                    {/* Right: 3 Seats (Seat 3, 4, 5) */}
                    <div className="col-span-6 grid grid-cols-3 gap-1 sm:gap-1.5">
                      {renderOfficialSeatBox(seat3)}
                      {renderOfficialSeatBox(seat4)}
                      {renderOfficialSeatBox(seat5)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 11: PINTU KELUAR (Left) & SEATS 51, 52, 53 (Right) */}
            <div className="grid grid-cols-12 gap-2 sm:gap-3 items-center">
              {/* Pintu Keluar */}
              <div className="col-span-5">
                <div className="bg-[#4F7336] text-white font-extrabold text-[11px] sm:text-xs py-2.5 sm:py-3.5 px-2 rounded-xs text-center uppercase tracking-wider shadow-xs border border-slate-700">
                  PINTU KELUAR
                </div>
              </div>

              {/* Center Aisle */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="w-1.5 h-6 bg-slate-100 rounded-full" />
              </div>

              {/* Right: Seats 51, 52, 53 */}
              <div className="col-span-6 grid grid-cols-3 gap-1 sm:gap-1.5">
                {renderOfficialSeatBox(51)}
                {renderOfficialSeatBox(52)}
                {renderOfficialSeatBox(53)}
              </div>
            </div>

            {/* Row 12 (Back Row Across): SEATS 54 to 59 (6 Seats) */}
            <div className="grid grid-cols-6 gap-1 sm:gap-1.5 pt-1">
              {renderOfficialSeatBox(54)}
              {renderOfficialSeatBox(55)}
              {renderOfficialSeatBox(56)}
              {renderOfficialSeatBox(57)}
              {renderOfficialSeatBox(58)}
              {renderOfficialSeatBox(59)}
            </div>

            {/* Footer Section: Contact Person */}
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-800 space-y-1">
              <p className="font-extrabold text-midnight text-xs">Contact Person :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                <p>
                  <span className="font-semibold text-slate-600">Koordinator Bus :</span>{' '}
                  <span className="font-bold text-slate-900">{koordinatorName ? `${koordinatorName.toUpperCase()}  ${koordinatorPhone}` : '-'}</span>
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Tour Leader :</span>{' '}
                  <span className="font-bold text-slate-900">{tlName ? `${tlName.toUpperCase()}  ${tlPhone}` : '-'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EDITOR MATRIX GRID (CUSTOM ROWS & COLS)                            */}
      {/* ========================================================================= */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <button
              onClick={handleOpenDimensionsModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-deep border border-teal-200 text-xs font-bold rounded-xl transition shadow-sm"
            >
              <Sliders className="w-4 h-4" />
              <span>Atur Baris & Kolom</span>
            </button>
          </div>

          <div className="bg-slate-100/80 p-4 sm:p-8 rounded-3xl border border-slate-200 flex justify-center overflow-x-auto">
            <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-midnight/80 p-4 sm:p-6 shadow-2xl relative select-none">
              <div className="mb-6 pb-4 border-b-2 border-dashed border-slate-300 text-center relative">
                <div className="w-24 h-2 bg-slate-300 rounded-full mx-auto mb-2" />
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400">
                  BAGIAN DEPAN BUS (KACA UTAMA)
                </span>
              </div>

              <div className="space-y-2.5">
                {rowNumbers.map(rowNum => {
                  const rowSeats = rowsGrouped[rowNum] || [];
                  const isLastRow = rowNum === rowNumbers[rowNumbers.length - 1];

                  return (
                    <div key={rowNum} className="flex items-center justify-between gap-1 sm:gap-2">
                      <div className="flex items-center gap-1.5">
                        {rowSeats
                          .filter(s => s.col_num <= 2)
                          .map(seat => renderSeatButton(seat, handleSeatClick))}
                      </div>

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

                      <div className="flex items-center gap-1.5">
                        {rowSeats
                          .filter(s => s.col_num >= 4)
                          .map(seat => renderSeatButton(seat, handleSeatClick))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-300 text-center">
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400">
                  BAGIAN BELAKANG BUS
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Klik Kursi -> Pilih Jamaah / Petugas                               */}
      {/* ========================================================================= */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  {selectedSeat.seat_number} • {selectedBus?.name}
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

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setEditingCellSeat(selectedSeat);
                  setCellEditNumber(selectedSeat.seat_number);
                  setCellEditRole(selectedSeat.role);
                  setSelectedSeat(null);
                }}
                className="text-xs text-teal-deep font-bold hover:underline flex items-center gap-1"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Ubah Nomor/Tipe Kursi</span>
              </button>
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

      {/* MODAL: Dimensions */}
      {isDimensionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-teal-soft" />
                <div>
                  <h3 className="font-bold text-sm">Pengaturan Denah {selectedBus?.name}</h3>
                  <p className="text-[11px] text-teal-soft">Konfigurasi Jumlah Baris & Kolom</p>
                </div>
              </div>
              <button
                onClick={() => setIsDimensionModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyDimensions} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jumlah Baris (Total Rows)
                </label>
                <input
                  type="number"
                  min={8}
                  max={20}
                  value={configRows}
                  onChange={e => setConfigRows(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Konfigurasi Kolom Kursi
                </label>
                <select
                  value={configCols}
                  onChange={e => setConfigCols(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value={5}>2 - 3 (Standar Pariwisata 59 Kursi)</option>
                  <option value={4}>2 - 2 (Eksekutif 48-50 Kursi)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDimensionModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-midnight hover:bg-midnight-700 rounded-xl shadow-md"
                >
                  Terapkan Denah Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Single Cell Edit */}
      {editingCellSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Sesuaikan Kursi {editingCellSeat.seat_number}</h3>
                <p className="text-[11px] text-teal-soft">Baris {editingCellSeat.row_num}, Kolom {editingCellSeat.col_num}</p>
              </div>
              <button
                onClick={() => setEditingCellSeat(null)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCellChanges} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nomor / Label Kursi
                </label>
                <input
                  type="text"
                  value={cellEditNumber}
                  onChange={e => setCellEditNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tipe / Peran Kursi
                </label>
                <select
                  value={cellEditRole}
                  onChange={e => setCellEditRole(e.target.value as SeatRole)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="empty">Kursi Penumpang / Jamaah</option>
                  <option value="tour_leader">Kursi Tour Leader (TL)</option>
                  <option value="pembimbing">Kursi Pembimbing (PB)</option>
                  <option value="door">Pintu Keluar / Masuk</option>
                  <option value="driver">Posisi Sopir</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCellSeat(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-midnight hover:bg-midnight-700 rounded-xl shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Render individual seat button in matrix canvas
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
        onClick={() => onClick(seat)}
        className="w-12 h-12 rounded-xl bg-amber-50 border-2 border-amber-300 border-dashed flex flex-col items-center justify-center text-amber-800 shadow-sm cursor-pointer hover:bg-amber-100 transition"
        title="Pintu Masuk/Keluar"
      >
        <span className="text-[9px] font-black uppercase">PINTU</span>
        <span className="text-[8px] text-amber-600 font-bold">Door</span>
      </div>
    );
  }

  if (seat.occupant_name) {
    return (
      <button
        key={seat.id}
        onClick={() => onClick(seat)}
        className="w-14 h-12 rounded-xl bg-teal-soft border-2 border-teal-500 text-midnight flex flex-col items-center justify-center shadow-md hover:scale-105 transition px-1"
        title={`Jamaah: ${seat.occupant_name}`}
      >
        <span className="text-[9px] font-extrabold">{seat.seat_number}</span>
        <span className="text-[8px] font-bold text-midnight truncate max-w-[48px] px-0.5 leading-tight uppercase">
          {seat.occupant_name.split(' ')[0]}
        </span>
      </button>
    );
  }

  return (
    <button
      key={seat.id}
      onClick={() => onClick(seat)}
      className="w-14 h-12 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:border-teal-deep hover:text-teal-deep flex flex-col items-center justify-center shadow-sm hover:scale-105 transition"
      title="Kursi Kosong - Klik untuk isi"
    >
      <span className="text-[9px] font-bold">{seat.seat_number}</span>
      <span className="text-[8px] text-slate-300 font-semibold">Kosong</span>
    </button>
  );
}