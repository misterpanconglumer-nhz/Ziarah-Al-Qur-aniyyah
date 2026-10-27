import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bus, BusSeat, Jamaah, BusStaff, Rombongan } from '../types';
import { formatRupiah, formatDateId } from './formatters';

/**
 * Export Official 59-Seat Visual Bus Layout PDF (Format Cetak A4 Standar 2-3 Pariwisata)
 */
export function exportBusVisualChartPDF(
  bus: Bus,
  seats: BusSeat[],
  staffList: BusStaff[] = [],
  rombonganList: Rombongan[] = []
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Soft olive green page border
  doc.setDrawColor(163, 196, 147); // #A3C493
  doc.setLineWidth(1.2);
  doc.roundedRect(6, 6, 198, 285, 2.5, 2.5, 'S');

  // Header Box (Dark Olive Green #4F7336)
  doc.setFillColor(79, 115, 54);
  doc.roundedRect(10, 10, 190, 12, 1.5, 1.5, 'F');

  // Header Title: e.g. "BUS 09" or "BUS 01"
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const busTitle = bus.name.toUpperCase().startsWith('BUS')
    ? bus.name.toUpperCase()
    : `BUS ${bus.name.toUpperCase()}`;
  doc.text(busTitle, 105, 18, { align: 'center' });

  // Staff and Coordinator info
  const tl = staffList.find(s => s.role === 'tour_leader');
  const romb = rombonganList.find(r => r.bus_id === bus.id);
  const koordinatorName = romb?.coordinator_name || staffList.find(s => s.role === 'pembimbing')?.name || '';
  const koordinatorPhone = romb?.coordinator_phone || staffList.find(s => s.role === 'pembimbing')?.phone || '';
  const tlName = tl?.name || '';
  const tlPhone = tl?.phone || '';

  // Map seats 1..59
  const seatMap = new Map<number, BusSeat>();
  seats.forEach(s => {
    const numMatch = s.seat_number.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      if (num >= 1 && num <= 59 && !seatMap.has(num)) {
        seatMap.set(num, s);
      }
    }
  });

  // Fallback for seats without explicit numbers in seat_number
  const unmapped = seats.filter(
    s => s.occupant_name && (!s.seat_number.match(/\d+/) || parseInt(s.seat_number.match(/\d+/)![0], 10) > 59)
  );
  let curNum = 1;
  unmapped.forEach(s => {
    while (seatMap.has(curNum) && curNum <= 59) curNum++;
    if (curNum <= 59) seatMap.set(curNum, s);
  });

  // Row 0: Front of Bus
  const yRow0 = 24.5;
  const hRow0 = 12.5;

  // Box 1: PINTU MASUK / HELPER
  drawCustomBox(doc, 10, yRow0, 36, hRow0, 'PINTU MASUK', 'HELPER');

  // Box 2: TOUR LEADER
  drawCustomBox(doc, 74, yRow0, 42, hRow0, 'TOUR LEADER', tlName);

  // Box 3: SOPIR
  drawCustomBox(doc, 164, yRow0, 36, hRow0, 'SOPIR', 'SOPIR');

  // Seat box drawing helper
  function drawSeat(x: number, y: number, w: number, h: number, seatNum: number) {
    const s = seatMap.get(seatNum);
    const occupant = s?.occupant_name || '';

    // Border
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, h, 'FD');

    // Header strip
    const headerH = 4.2;
    doc.setFillColor(232, 236, 240); // Light gray
    doc.rect(x, y, w, headerH, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`SEAT ${seatNum}`, x + w / 2, y + 3.1, { align: 'center' });

    // Occupant name
    if (occupant) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      let fontSize = 7.5;
      if (occupant.length > 26) fontSize = 5.8;
      else if (occupant.length > 18) fontSize = 6.6;
      doc.setFontSize(fontSize);

      const splitLines = doc.splitTextToSize(occupant.toUpperCase(), w - 2);
      const textY = y + headerH + ((h - headerH) / 2) + (splitLines.length === 1 ? 1.2 : 0);
      doc.text(splitLines, x + w / 2, textY, { align: 'center', baseline: 'middle' });
    }
  }

  function drawCustomBox(doc: jsPDF, x: number, y: number, w: number, h: number, headerText: string, contentText: string) {
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.3);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, h, 'FD');

    const headerH = 4.2;
    doc.setFillColor(232, 236, 240);
    doc.rect(x, y, w, headerH, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(headerText, x + w / 2, y + 3.1, { align: 'center' });

    if (contentText) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      let fontSize = 7.2;
      if (contentText.length > 20) fontSize = 6;
      doc.setFontSize(fontSize);

      const splitLines = doc.splitTextToSize(contentText.toUpperCase(), w - 2);
      const textY = y + headerH + ((h - headerH) / 2) + (splitLines.length === 1 ? 1.2 : 0);
      doc.text(splitLines, x + w / 2, textY, { align: 'center', baseline: 'middle' });
    }
  }

  // Rows 1 to 10
  const startY = 40;
  const seatH = 13.2;
  const rowGap = 3.6;
  const seatWLeft = 36;
  const seatWRight = 30.5;

  for (let r = 0; r < 10; r++) {
    const curY = startY + r * (seatH + rowGap);
    const base = r * 5;

    // Left seats: base + 1, base + 2
    drawSeat(10, curY, seatWLeft, seatH, base + 1);
    drawSeat(49, curY, seatWLeft, seatH, base + 2);

    // Right seats: base + 3, base + 4, base + 5
    drawSeat(105, curY, seatWRight, seatH, base + 3);
    drawSeat(138, curY, seatWRight, seatH, base + 4);
    drawSeat(171, curY, seatWRight, seatH, base + 5);
  }

  // Row 11: PINTU KELUAR (Left) & Seats 51, 52, 53 (Right)
  const yRow11 = startY + 10 * (seatH + rowGap);

  // Pintu Keluar
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  doc.setFillColor(79, 115, 54); // #4F7336 Green
  doc.rect(10, yRow11, 36, seatH, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PINTU KELUAR', 28, yRow11 + seatH / 2 + 1.2, { align: 'center' });

  // Right seats: 51, 52, 53
  drawSeat(105, yRow11, seatWRight, seatH, 51);
  drawSeat(138, yRow11, seatWRight, seatH, 52);
  drawSeat(171, yRow11, seatWRight, seatH, 53);

  // Row 12 (Back Row Across): Seats 54 to 59 (6 seats across)
  const yRow12 = startY + 11 * (seatH + rowGap);
  const backSeatW = 31.9; // 31.9 * 6 = 191.4mm
  for (let b = 0; b < 6; b++) {
    const seatNum = 54 + b;
    const x = 10 + b * backSeatW;
    drawSeat(x, yRow12, backSeatW, seatH, seatNum);
  }

  // Footer Section
  const yFooter = yRow12 + seatH + 4.5;
  doc.setTextColor(20, 30, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Contact Person :', 10, yFooter);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `Koordinator Bus : ${koordinatorName ? `${koordinatorName.toUpperCase()}    ${koordinatorPhone}` : '-'}`,
    10,
    yFooter + 4.5
  );
  doc.text(
    `Tour Leader     : ${tlName ? `${tlName.toUpperCase()}    ${tlPhone}` : '-'}`,
    10,
    yFooter + 8.5
  );

  // Bottom watermark
  doc.setFontSize(6.5);
  doc.setTextColor(130, 140, 150);
  doc.text(
    `Sistem Operasional Ziarah Akbar 2027 • Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    105,
    288,
    { align: 'center' }
  );

  doc.save(`Denah_Resmi_${bus.name.replace(/\s+/g, '_')}_59_Kursi.pdf`);
}

/**
 * Generate and download Bus Seating Chart PDF (Tabular Manifest)
 */
export function exportBusSeatChartPDF(
  bus: Bus,
  seats: BusSeat[],
  staffList: BusStaff[] = [],
  layoutConfig?: { totalRows: number; totalCols: number }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header Banner
  doc.setFillColor(20, 43, 74); // Midnight Navy #142B4A
  doc.rect(0, 0, 210, 28, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text("ZIARAH AKBAR AL-QUR'ANIYYAH 2027", 105, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 199, 190); // Soft Teal #4BC7BE
  doc.text(`DENAH KURSI RESMI OPERASIONAL - ${bus.name.toUpperCase()}`, 105, 19, { align: 'center' });
  doc.text(`Operator: ${bus.operator} | Kapasitas: ${bus.capacity} Kursi | Tipe: ${bus.bus_type}`, 105, 24, { align: 'center' });

  // Petugas Bus Box
  doc.setFillColor(244, 247, 250); // Offwhite
  doc.roundedRect(14, 32, 182, 18, 2, 2, 'F');
  doc.setDrawColor(200, 215, 225);
  doc.roundedRect(14, 32, 182, 18, 2, 2, 'D');

  doc.setFontSize(8.5);
  doc.setTextColor(20, 43, 74);
  doc.setFont('helvetica', 'bold');
  doc.text('PETUGAS RESMI BUS:', 18, 38);

  doc.setFont('helvetica', 'normal');
  const tl = staffList.find(s => s.role === 'tour_leader');
  const pembimbing = staffList.filter(s => s.role === 'pembimbing').map(p => p.name).join(', ');

  doc.text(`• Tour Leader: ${tl ? `${tl.name} (${tl.phone || '-'})` : 'Belum Ditentukan'}`, 18, 44);
  doc.text(`• Pembimbing: ${pembimbing || 'Belum Ditentukan'}`, 105, 44);

  // Table of Passengers and Seat Mapping
  const sortedSeats = [...seats].sort((a, b) => {
    if (a.row_num !== b.row_num) return a.row_num - b.row_num;
    return a.col_num - b.col_num;
  });

  const tableRows = sortedSeats
    .filter(s => s.role !== 'driver' && s.role !== 'door' && s.role !== 'facility')
    .map(s => {
      let roleDesc = 'Jamaah';
      if (s.role === 'tour_leader') roleDesc = 'Tour Leader';
      else if (s.role === 'pembimbing') roleDesc = 'Pembimbing';
      else if (s.role === 'empty' || !s.occupant_name) roleDesc = 'KOSONG';

      return [
        s.seat_number,
        s.occupant_name || '(Belum Terisi)',
        roleDesc,
        s.occupant_role_label || '-'
      ];
    });

  autoTable(doc, {
    startY: 54,
    head: [['No. Kursi', 'Nama Penghuni', 'Peran / Kategori', 'Keterangan Rombongan']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [20, 43, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2.2
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 48 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer page number
      doc.setFontSize(7.5);
      doc.setTextColor(140, 150, 160);
      const str = `Halaman ${doc.getNumberOfPages()} • Dicetak melalui Sistem Ziarah 2027 • Tanggal: ${new Date().toLocaleDateString('id-ID')}`;
      doc.text(str, 105, 290, { align: 'center' });
    }
  });

  doc.save(`Denah_Kursi_${bus.name.replace(/\s+/g, '_')}_Ziarah_2027.pdf`);
}

/**
 * Generate Financial and Operational Summary Report PDF
 */
export function exportFinancialReportPDF(
  financialData: {
    totalParticipants: number;
    totalTargetBill: number;
    totalReceived: number;
    totalOutstanding: number;
    totalBudget: number;
    totalExpenses: number;
    actualCashBalance: number;
  },
  expensesList: any[] = []
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header Banner
  doc.setFillColor(20, 43, 74);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text("ZIARAH AKBAR AL-QUR'ANIYYAH 2027", 105, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 199, 190);
  doc.text('LAPORAN REKAPITULASI KEUANGAN & KAS OPERASIONAL', 105, 19, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(220, 230, 240);
  doc.text(`Per Tanggal: ${formatDateId(new Date().toISOString())}`, 105, 25, { align: 'center' });

  // Summary Metrics Table
  const summaryRows = [
    ['Total Jamaah Terdaftar', `${financialData.totalParticipants.toLocaleString('id-ID')} Orang`],
    ['Total Target Tagihan (Pemasukan Ditargetkan)', formatRupiah(financialData.totalTargetBill)],
    ['Total Pembayaran Diterima (Kas Masuk Aktual)', formatRupiah(financialData.totalReceived)],
    ['Total Sisa Tunggakan (Piutang Jamaah)', formatRupiah(financialData.totalOutstanding)],
    ['Total Rencana Anggaran Biaya', formatRupiah(financialData.totalBudget)],
    ['Total Realisasi Pengeluaran Kas', formatRupiah(financialData.totalExpenses)],
    ['SALDO KAS AKTUAL BERSIH (Kas Masuk - Kas Keluar)', formatRupiah(financialData.actualCashBalance)]
  ];

  autoTable(doc, {
    startY: 36,
    head: [['Indikator Keuangan', 'Nilai / Rekapitulasi']],
    body: summaryRows,
    theme: 'grid',
    headStyles: {
      fillColor: [35, 109, 120], // Deep Teal #236D78
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 2.8
    },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { cellWidth: 72, halign: 'right' }
    },
    alternateRowStyles: {
      fillColor: [244, 247, 250]
    },
    margin: { left: 14, right: 14 }
  });

  // Recent Expenses Section
  const nextY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 43, 74);
  doc.text('Rincian Realisasi Pengeluaran Kas Terakhir', 14, nextY);

  const expenseRows = expensesList.map((e, idx) => [
    idx + 1,
    formatDateId(e.date),
    e.title,
    e.category,
    e.receipt_ref || '-',
    formatRupiah(e.amount),
    e.status === 'valid' ? 'Valid' : 'VOID'
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [['No', 'Tanggal', 'Nama Pengeluaran', 'Kategori', 'Ref/Bukti', 'Nominal', 'Status']],
    body: expenseRows.length > 0 ? expenseRows : [['-', '-', 'Belum ada pengeluaran', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [20, 43, 74],
      textColor: [255, 255, 255],
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 48 },
      3: { cellWidth: 32 },
      4: { cellWidth: 26 },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 14, halign: 'center' }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(7.5);
      doc.setTextColor(140, 150, 160);
      doc.text(`Halaman ${doc.getNumberOfPages()} • Laporan Keuangan Ziarah Akbar 2027`, 105, 290, { align: 'center' });
    }
  });

  doc.save('Laporan_Keuangan_Ziarah_2027.pdf');
}
