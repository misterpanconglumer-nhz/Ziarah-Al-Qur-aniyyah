import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Bus, BusSeat, Jamaah, SeatRole } from '../types';
import { exportBusSeatChartPDF, exportBusVisualChartPDF } from '../utils/pdf';
import { parseSeatAssignmentsExcel, downloadSeatTemplate } from '../utils/excel';
import { copyBusChartImageToClipboard } from '../utils/busChartImage';
import { 
  Grid, 
  Printer, 
  FileDown,
  FileText,
  UserMinus, 
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  X, 
  Search, 
  Sliders, 
  ChevronDown,
  CheckCircle,
  LayoutGrid,
  Upload,
  Download,
  FileSpreadsheet,
  UserPlus,
  Copy,
  Check,
  Image as ImageIcon
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
    moveJamaahSeat,
    getJamaahSeatAssignment,
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
  const [manualNameInput, setManualNameInput] = useState('');

  // Excel Seat Import State
  const seatFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedSeatsPreview, setImportedSeatsPreview] = useState<{ seatNumber: string; occupantName: string }[]>([]);
  const [isImportingSeats, setIsImportingSeats] = useState(false);

  // Canvas Ref & Image Copy State
  const chartCanvasRef = useRef<HTMLDivElement>(null);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [hasCopiedImage, setHasCopiedImage] = useState(false);
  
  // Pindah Kursi (Transfer) Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferJamaahId, setTransferJamaahId] = useState<string>('');
  const [transferTargetBusId, setTransferTargetBusId] = useState<string>(selectedBusId);
  const [transferTargetSeatNumber, setTransferTargetSeatNumber] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Seat Conflict Alert State (Peringatan Anti Double-Seat)
  const [seatConflictAlert, setSeatConflictAlert] = useState<{
    jamaah: Jamaah;
    existingBusName: string;
    existingSeatNumber: string;
  } | null>(null);

  // Detail Modal for Occupied Seat
  const [occupiedSeatModal, setOccupiedSeatModal] = useState<BusSeat | null>(null);

  // Target bus available empty seats for Pindah Kursi modal
  const transferAvailableSeats = useMemo(() => {
    if (!transferTargetBusId) return [];
    const targetSeats = getSeatsForBus(transferTargetBusId);
    return targetSeats.filter(s => s.role === 'empty' && !s.occupant_id);
  }, [transferTargetBusId, getSeatsForBus]);

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
    if (seat.role === 'driver' || seat.role === 'door' || seat.role === 'facility') {
      setEditingCellSeat(seat);
      setCellEditNumber(seat.seat_number);
      setCellEditRole(seat.role);
      return;
    }

    // Jika kursi sudah terisi, buka modal aksi khusus kursi terisi (Pindah / Kosongkan)
    if (seat.occupant_name && seat.role !== 'empty') {
      setOccupiedSeatModal(seat);
      return;
    }

    // Kursi kosong: buka modal pilih peserta
    setSelectedSeat(seat);
    setOccupantSearch('');
    setManualNameInput('');
  };

  const handleAssignManualName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !selectedBus) return;
    if (!manualNameInput.trim()) {
      showToast('Ketik nama jamaah terlebih dahulu!', 'warning');
      return;
    }

    const match = jamaahList.find(j => j.name.toLowerCase() === manualNameInput.trim().toLowerCase());
    const occupantId = match ? match.id : `manual-${Date.now()}`;
    await assignSeat(
      selectedBus.id,
      selectedSeat.seat_number,
      occupantId,
      manualNameInput.trim(),
      'jamaah'
    );
    setSelectedSeat(null);
    setManualNameInput('');
  };

  const handleSeatFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseSeatAssignmentsExcel(file);
      if (parsed.length === 0) {
        showToast('Tidak ada penempatan kursi yang terdeteksi dari file Excel tersebut.', 'warning');
        return;
      }
      setImportedSeatsPreview(parsed);
      setIsImportModalOpen(true);
    } catch (err: any) {
      showToast(`Gagal membaca Excel denah: ${err?.message || err}`, 'error');
    } finally {
      if (seatFileInputRef.current) seatFileInputRef.current.value = '';
    }
  };

  const handleConfirmSeatImport = async () => {
    if (!selectedBus || importedSeatsPreview.length === 0) return;
    setIsImportingSeats(true);
    try {
      let count = 0;
      for (const item of importedSeatsPreview) {
        const match = jamaahList.find(j => j.name.toLowerCase() === item.occupantName.toLowerCase());
        const occupantId = match ? match.id : `imp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await assignSeat(selectedBus.id, item.seatNumber, occupantId, item.occupantName, 'jamaah');
        count++;
      }
      showToast(`Berhasil menerapkan ${count} kursi dari Excel ke ${selectedBus.name}!`, 'success');
      setIsImportModalOpen(false);
      setImportedSeatsPreview([]);
    } catch (err: any) {
      showToast(`Gagal mengimpor denah kursi: ${err?.message || err}`, 'error');
    } finally {
      setIsImportingSeats(false);
    }
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

  const handleAssignPerson = async (
    person: Jamaah | { id: string; name: string; role: 'tour_leader' | 'pembimbing' },
    allowMove: boolean = false
  ) => {
    if (!selectedSeat || !selectedBus) return;

    const role = 'role' in person ? person.role : 'jamaah';

    // VALIDASI ANTI DOUBLE-SEAT: Cek apakah peserta sudah memiliki kursi di armada bus manapun
    if (!allowMove && role === 'jamaah') {
      const existing = getJamaahSeatAssignment(person.id);
      if (existing && existing.seatNumber) {
        const isSameSeat = existing.busId === selectedBus.id &&
          (existing.seatNumber === selectedSeat.seat_number || existing.seatNumber.replace(/^SEAT\s*/i, '').trim() === selectedSeat.seat_number.replace(/^SEAT\s*/i, '').trim());

        if (!isSameSeat) {
          // Tampilkan notifikasi peringatan sesuai ketentuan
          setSeatConflictAlert({
            jamaah: person as Jamaah,
            existingBusName: existing.busName || 'Bus Lain',
            existingSeatNumber: existing.seatNumber
          });
          return;
        }
      }
    }

    const res = await assignSeat(
      selectedBus.id,
      selectedSeat.seat_number,
      person.id,
      person.name,
      role,
      { allowMove }
    );

    if (res.success) {
      setSelectedSeat(null);
      setSeatConflictAlert(null);
    }
  };

  const handleConfirmMoveConflict = async () => {
    if (!seatConflictAlert || !selectedSeat || !selectedBus) return;
    await handleAssignPerson(seatConflictAlert.jamaah, true);
    setSeatConflictAlert(null);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferJamaahId || !transferTargetBusId || !transferTargetSeatNumber) {
      showToast('Harap pilih peserta, bus tujuan, dan nomor kursi tujuan!', 'warning');
      return;
    }

    setIsTransferring(true);
    try {
      const res = await moveJamaahSeat(transferJamaahId, transferTargetBusId, transferTargetSeatNumber);
      if (res.success) {
        setIsTransferModalOpen(false);
        setOccupiedSeatModal(null);
        setTransferJamaahId('');
        setTransferTargetSeatNumber('');
      }
    } finally {
      setIsTransferring(false);
    }
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

  // Salin Gambar Denah Bus untuk WhatsApp Rombongan (Pure Canvas 2D Rendering)
  const handleCopyChartImage = async () => {
    if (!selectedBus) return;
    setIsCopyingImage(true);
    try {
      const result = await copyBusChartImageToClipboard(
        selectedBus,
        seats,
        selectedBus.staff || [],
        rombonganList
      );
      if (result.success) {
        setHasCopiedImage(true);
        setTimeout(() => setHasCopiedImage(false), 3500);
        showToast(result.message, result.method === 'clipboard' ? 'success' : 'info');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast(`Gagal memproses gambar denah: ${err?.message || err}`, 'error');
    } finally {
      setIsCopyingImage(false);
    }
  };

  // Helper to render one seat in official 59 view dengan status warna visual:
  // Hijau: Kursi tersedia • Merah: Kursi sudah terisi • Abu-abu: Fasilitas/pintu/supir
  const renderOfficialSeatBox = (num: number, className: string = '') => {
    const seat = getSeatByNumber(num);
    const occupant = seat.occupant_name || '';
    const isDriverOrDoor = seat.role === 'driver' || seat.role === 'door' || seat.role === 'facility';
    const isOccupied = Boolean(occupant && !isDriverOrDoor && seat.role !== 'empty');

    return (
      <div
        key={num}
        onClick={() => handleSeatClick(seat)}
        className={`border-2 rounded-xs overflow-hidden cursor-pointer transition shadow-xs group select-none flex flex-col justify-between ${
          isDriverOrDoor
            ? 'border-slate-400 bg-slate-200 text-slate-600'
            : isOccupied
            ? 'border-rose-500 bg-rose-50/50 hover:border-rose-700'
            : 'border-emerald-500 bg-emerald-50/40 hover:border-emerald-600'
        } ${className}`}
        title={`SEAT ${num}: ${isDriverOrDoor ? 'Fasilitas Bus' : isOccupied ? `TERISI (${occupant})` : 'TERSEDIA (Kosong)'} - Klik untuk kelola`}
      >
        {/* Top Header: Status Bar Warna Merah / Hijau / Abu-abu */}
        <div className={`py-0.5 px-1 text-center font-extrabold text-[9px] sm:text-[10px] tracking-wider flex items-center justify-between border-b ${
          isDriverOrDoor
            ? 'bg-slate-300 border-slate-400 text-slate-700'
            : isOccupied
            ? 'bg-rose-600 border-rose-600 text-white'
            : 'bg-emerald-600 border-emerald-600 text-white'
        }`}>
          <span>SEAT {num}</span>
          <span className={`text-[8px] font-bold uppercase px-1 rounded ${
            isDriverOrDoor ? 'bg-slate-400 text-white' : isOccupied ? 'bg-rose-800 text-rose-100' : 'bg-emerald-800 text-emerald-100'
          }`}>
            {isDriverOrDoor ? 'Non-Aktif' : isOccupied ? 'Terisi' : 'Kosong'}
          </span>
        </div>

        {/* Occupant Full Name */}
        <div className={`p-1 min-h-[38px] sm:min-h-[44px] flex items-center justify-center text-center ${
          isOccupied ? 'bg-white' : 'bg-emerald-50/20'
        }`}>
          {isOccupied ? (
            <span className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] leading-tight uppercase line-clamp-2 px-0.5">
              {occupant}
            </span>
          ) : (
            <span className="text-[10px] text-emerald-700 font-bold group-hover:underline transition flex items-center gap-0.5">
              <span>+ Tersedia</span>
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
            border: 2px solid #142B4A !important;
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
          <input
            type="file"
            ref={seatFileInputRef}
            onChange={handleSeatFileChange}
            accept=".xlsx,.xls"
            className="hidden"
          />

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

          {/* Unduh Template Denah */}
          <button
            onClick={() => downloadSeatTemplate(selectedBus?.name || 'Bus')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
            title="Unduh format template Excel denah 59 kursi"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Template Excel</span>
          </button>

          {/* Impor Excel Denah */}
          <button
            onClick={() => seatFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md"
            title="Impor susunan denah kursi dari file Excel"
          >
            <Upload className="w-4 h-4 text-emerald-100" />
            <span>Import Denah</span>
          </button>

          {/* Standardize 59 Seats Button */}
          <button
            onClick={handleStandardize59}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition shadow-sm"
            title="Standarisasi urutan kursi ke format 59 kursi (2-3)"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Format 59</span>
          </button>

          {/* Print A4 Button */}
          <button
            onClick={handlePrintA4}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-deep hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-md"
            title="Cetak langsung ke ukuran kertas A4"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak A4</span>
          </button>

          {/* Salin Gambar Denah (WA) */}
          <button
            onClick={handleCopyChartImage}
            disabled={isCopyingImage}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md disabled:opacity-50"
            title="Salin gambar denah bus ini ke clipboard untuk langsung di-paste ke grup WhatsApp rombongan"
          >
            {isCopyingImage ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : hasCopiedImage ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Copy className="w-4 h-4 text-blue-200" />
            )}
            <span>{hasCopiedImage ? 'Tersalin!' : 'Salin Gambar (WA)'}</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportVisualPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md"
            title="Download PDF Denah Visual A4 persis seperti gambar"
          >
            <FileDown className="w-4 h-4 text-teal-soft" />
            <span className="hidden sm:inline">Export PDF</span>
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

      {/* Visual Status Legend & Anti Double-Seat Toolbar (Hidden on print) */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-bold">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600 inline-block shadow-xs" />
            <span className="text-emerald-800">Hijau: Kursi Tersedia</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-rose-500 border border-rose-600 inline-block shadow-xs" />
            <span className="text-rose-800">Merah: Kursi Terisi</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-slate-300 border border-slate-400 inline-block shadow-xs" />
            <span className="text-slate-600">Abu-abu: Fasilitas / Supir</span>
          </span>
        </div>

        <button
          onClick={() => {
            setTransferJamaahId('');
            setTransferTargetBusId(selectedBus.id);
            setTransferTargetSeatNumber('');
            setIsTransferModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-sm ml-auto sm:ml-0"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-teal-soft" />
          <span>Pindah Kursi Peserta</span>
        </button>
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
        <div className="w-full overflow-x-auto pb-4 -mx-1 px-1">
          <div 
            ref={chartCanvasRef}
            className="print-a4-canvas min-w-[560px] sm:min-w-[620px] max-w-3xl mx-auto bg-white border-2 border-midnight rounded-3xl p-3.5 sm:p-7 shadow-xl space-y-3 sm:space-y-4"
          >
            {/* Top Blue Banner (Matching App Midnight Theme) */}
            <div className="bg-[#142B4A] text-white font-extrabold text-lg sm:text-xl py-2.5 rounded-lg text-center tracking-widest uppercase shadow-sm border border-midnight-700">
              {selectedBus?.name.toUpperCase().startsWith('BUS')
                ? selectedBus.name.toUpperCase()
                : `BUS ${selectedBus?.name.toUpperCase()}`}
            </div>

            {/* Row 0: PINTU MASUK / HELPER - TOUR LEADER - SOPIR */}
            <div className="grid grid-cols-12 gap-2 sm:gap-3 items-stretch">
              {/* Pintu Masuk / Helper */}
              <div className="col-span-3 border border-slate-700 bg-white rounded-xs overflow-hidden flex flex-col justify-between">
                <div className="bg-[#E1EBF5] border-b border-slate-700 py-0.5 text-center font-bold text-[9px] sm:text-[10px] text-midnight-900 tracking-wider uppercase">
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
                <div className="bg-[#E1EBF5] border-b border-slate-700 py-0.5 text-center font-bold text-[9px] sm:text-[10px] text-midnight-900 tracking-wider uppercase">
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
                <div className="bg-[#E1EBF5] border-b border-slate-700 py-0.5 text-center font-bold text-[9px] sm:text-[10px] text-midnight-900 tracking-wider uppercase">
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
                <div className="bg-[#142B4A] text-white font-extrabold text-[11px] sm:text-xs py-2.5 sm:py-3.5 px-2 rounded-xs text-center uppercase tracking-wider shadow-xs border border-midnight-700">
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

              {/* Form Input / Ketik Nama Langsung */}
              <form onSubmit={handleAssignManualName} className="space-y-1.5 p-3 bg-teal-50/50 border border-teal-100 rounded-xl">
                <label className="text-[11px] font-bold text-teal-900 block">
                  Ketik Nama Jamaah Langsung
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualNameInput}
                    onChange={e => setManualNameInput(e.target.value)}
                    placeholder="Ketik nama lengkap..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-soft/40"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-teal-deep hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-sm shrink-0 flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Tetapkan</span>
                  </button>
                </div>
              </form>

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
                    const existingAssignment = getJamaahSeatAssignment(j.id);
                    const hasOtherSeat = Boolean(existingAssignment && existingAssignment.seatNumber && !isAlreadyOnThisSeat);

                    return (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => handleAssignPerson(j)}
                        className={`w-full p-2.5 text-left rounded-lg transition flex items-center justify-between text-xs ${
                          isAlreadyOnThisSeat
                            ? 'bg-teal-50 border border-teal-200 text-teal-deep'
                            : hasOtherSeat
                            ? 'bg-amber-50/50 hover:bg-amber-50 border border-amber-200/80 text-amber-900'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-800">{j.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {j.id} • {j.rombongan_name || 'Umum'}
                            {hasOtherSeat && existingAssignment && (
                              <span className="text-amber-700 font-bold ml-1.5 block sm:inline">
                                ⚠️ Sudah di ${existingAssignment.busName} (${existingAssignment.seatNumber})
                              </span>
                            )}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 ${
                          hasOtherSeat
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {hasOtherSeat ? 'Pindah ke Sini' : 'Pilih Kursi'}
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

      {/* ========================================================================= */}
      {/* MODAL: KURSI TERISI (PILIH PINDAH KURSI ATAU KOSONGKAN)                  */}
      {/* ========================================================================= */}
      {occupiedSeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <h3 className="font-extrabold text-sm">
                  Kursi Terisi • {occupiedSeatModal.seat_number} ({selectedBus?.name})
                </h3>
              </div>
              <button
                onClick={() => setOccupiedSeatModal(null)}
                className="p-1 text-rose-200 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Notice Banner */}
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Kursi Sudah Ditempati</strong>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Kursi ini sudah ditempati peserta lain. Silakan pilih kursi yang masih tersedia jika ingin menempatkan peserta baru.
                  </p>
                </div>
              </div>

              {/* Occupant Details Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Nama Lengkap Peserta</span>
                  <span className="text-base font-extrabold text-midnight block">{occupiedSeatModal.occupant_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Peran Kursi</span>
                    <span className="font-bold text-teal-deep">{occupiedSeatModal.occupant_role_label || 'Jamaah'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">ID Peserta</span>
                    <span className="font-mono font-bold text-slate-700">{occupiedSeatModal.occupant_id || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (occupiedSeatModal.occupant_id) {
                      setTransferJamaahId(occupiedSeatModal.occupant_id);
                    }
                    setTransferTargetBusId(selectedBus.id);
                    setTransferTargetSeatNumber('');
                    setIsTransferModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 bg-midnight hover:bg-midnight-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4 text-teal-soft" />
                  <span>Pindahkan Peserta Ini ke Kursi Lain</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await freeSeat(selectedBus.id, occupiedSeatModal.seat_number);
                      setOccupiedSeatModal(null);
                    }}
                    className="flex-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Kosongkan Kursi</span>
                  </button>

                  <button
                    onClick={() => setOccupiedSeatModal(null)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PERINGATAN ANTI DOUBLE-SEAT (PESERTA SUDAH MEMILIKI KURSI)        */}
      {/* ========================================================================= */}
      {seatConflictAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-amber-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-sm">Peringatan: Peserta Sudah Memiliki Kursi</h3>
              </div>
              <button
                onClick={() => setSeatConflictAlert(null)}
                className="p-1 text-amber-100 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
                <p className="font-extrabold text-sm text-amber-950">
                  Peserta ini sudah mendapatkan kursi pada ${seatConflictAlert.existingBusName} - ${seatConflictAlert.existingSeatNumber}. Silakan periksa kembali data penempatan kursi.
                </p>
                <p className="text-[11px] text-amber-800">
                  Sesuai ketentuan, satu peserta hanya boleh mendapatkan satu kursi aktif across armada ziarah.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Detail Peserta</span>
                <p className="font-bold text-slate-900 text-sm">{seatConflictAlert.jamaah.name}</p>
                <p className="text-slate-500">
                  Kursi Saat Ini: <strong className="text-midnight">${seatConflictAlert.existingBusName} - ${seatConflictAlert.existingSeatNumber}</strong>
                </p>
                <p className="text-slate-500">
                  Kursi Baru: <strong className="text-teal-deep">{selectedBus?.name} - {selectedSeat?.seat_number}</strong>
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setSeatConflictAlert(null)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmMoveConflict}
                  className="flex-1 py-2.5 px-3 bg-midnight hover:bg-midnight-700 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4 text-teal-soft" />
                  <span>Pindahkan ke Kursi Ini</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PINDAH KURSI PESERTA (TRANSFER SEAT ANTAR BUS / KURSI)             */}
      {/* ========================================================================= */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-midnight text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-teal-soft" />
                <h3 className="font-extrabold text-sm">Pindah Kursi Peserta</h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-5 space-y-4">
              {/* Pilih Peserta yang memiliki kursi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Peserta yang Dipindahkan *
                </label>
                <select
                  value={transferJamaahId}
                  onChange={e => {
                    const jId = e.target.value;
                    setTransferJamaahId(jId);
                    const assign = getJamaahSeatAssignment(jId);
                    if (assign?.busId) {
                      setTransferTargetBusId(assign.busId);
                    }
                  }}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-bold text-midnight"
                >
                  <option value="">-- Pilih Peserta --</option>
                  {jamaahList
                    .filter(j => j.seat_number && j.bus_id)
                    .map(j => (
                      <option key={j.id} value={j.id}>
                        {j.name} (Saat ini: {j.bus_name || j.bus_id} - {j.seat_number})
                      </option>
                    ))}
                </select>
              </div>

              {/* Info Kursi Asal */}
              {transferJamaahId && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Posisi Saat Ini</span>
                  {(() => {
                    const assign = getJamaahSeatAssignment(transferJamaahId);
                    return (
                      <p className="font-extrabold text-midnight">
                        {assign?.busName || 'Bus Asal'} • {assign?.seatNumber || '-'}
                      </p>
                    );
                  })()}
                  <span className="text-[10px] text-teal-deep block">
                    ✓ Kursi lama akan otomatis dikosongkan setelah dipindahkan.
                  </span>
                </div>
              )}

              {/* Bus Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Armada Bus Tujuan *
                </label>
                <select
                  value={transferTargetBusId}
                  onChange={e => {
                    setTransferTargetBusId(e.target.value);
                    setTransferTargetSeatNumber('');
                  }}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-bold text-midnight"
                >
                  {busesList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.operator} - {b.capacity} Kursi)
                    </option>
                  ))}
                </select>
              </div>

              {/* Kursi Tujuan (Hanya Kursi yang Kosong/Available!) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Pilih Nomor Kursi Kosong di Bus Tujuan *</span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    {transferAvailableSeats.length} Kursi Tersedia
                  </span>
                </label>
                {transferAvailableSeats.length === 0 ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold text-center">
                    ⚠️ Armada bus tujuan sudah penuh! Tidak ada kursi kosong.
                  </div>
                ) : (
                  <select
                    value={transferTargetSeatNumber}
                    onChange={e => setTransferTargetSeatNumber(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-soft/40 font-extrabold text-emerald-800"
                  >
                    <option value="">-- Pilih Kursi Kosong --</option>
                    {transferAvailableSeats.map(s => (
                      <option key={s.id} value={s.seat_number}>
                        {s.seat_number} (Tersedia)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isTransferring || transferAvailableSeats.length === 0 || !transferTargetSeatNumber}
                  className="px-5 py-2.5 bg-midnight hover:bg-midnight-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isTransferring ? (
                    <span>Memindahkan...</span>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4 text-teal-soft" />
                      <span>Konfirmasi Pindah Kursi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
      {/* MODAL: Preview Import Denah Kursi Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-midnight text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Pratinjau Impor Denah Kursi</h3>
                  <p className="text-[11px] text-teal-soft">
                    {importedSeatsPreview.length} Penempatan Kursi Terdeteksi untuk {selectedBus?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isImportingSeats) {
                    setIsImportModalOpen(false);
                    setImportedSeatsPreview([]);
                  }
                }}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between shrink-0 text-xs text-emerald-900">
              <span className="font-semibold">Target Bus: {selectedBus?.name}</span>
              <span className="font-bold text-emerald-800">{importedSeatsPreview.length} Kursi akan diisi</span>
            </div>

            {/* Table of Seats to Apply */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">No Kursi</th>
                    <th className="py-2 px-3">Nama Jamaah / Penumpang</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importedSeatsPreview.map((item, idx) => {
                    const match = jamaahList.find(j => j.name.toLowerCase() === item.occupantName.toLowerCase());
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-bold text-teal-deep">
                          {item.seatNumber}
                        </td>
                        <td className="py-2 px-3 font-extrabold text-slate-900 uppercase">
                          {item.occupantName}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {match ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                              Terdaftar
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                              Baru
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isImportingSeats}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportedSeatsPreview([]);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isImportingSeats}
                onClick={handleConfirmSeatImport}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition shadow-md"
              >
                {isImportingSeats ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menerapkan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Terapkan ke {selectedBus?.name}</span>
                  </>
                )}
              </button>
            </div>
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
        className="w-12 h-12 rounded-xl bg-slate-200 border-2 border-slate-400 border-dashed flex flex-col items-center justify-center text-slate-600 shadow-sm cursor-pointer hover:bg-slate-300 transition"
        title="Pintu Masuk/Keluar"
      >
        <span className="text-[9px] font-black uppercase">PINTU</span>
        <span className="text-[8px] text-slate-500 font-bold">Door</span>
      </div>
    );
  }

  if (seat.occupant_name && seat.role !== 'empty') {
    return (
      <button
        key={seat.id}
        onClick={() => onClick(seat)}
        className="w-14 h-12 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-900 flex flex-col items-center justify-center shadow-md hover:scale-105 transition px-1"
        title={`Kursi Terisi: ${seat.occupant_name}`}
      >
        <span className="text-[9px] font-extrabold text-rose-700">{seat.seat_number}</span>
        <span className="text-[8px] font-bold text-slate-900 truncate max-w-[48px] px-0.5 leading-tight uppercase">
          {seat.occupant_name.split(' ')[0]}
        </span>
      </button>
    );
  }

  return (
    <button
      key={seat.id}
      onClick={() => onClick(seat)}
      className="w-14 h-12 rounded-xl bg-emerald-50/50 border-2 border-emerald-500 text-emerald-800 hover:bg-emerald-100 flex flex-col items-center justify-center shadow-sm hover:scale-105 transition"
      title="Kursi Tersedia - Klik untuk isi"
    >
      <span className="text-[9px] font-bold">{seat.seat_number}</span>
      <span className="text-[8px] text-emerald-700 font-bold">+ Tersedia</span>
    </button>
  );
}