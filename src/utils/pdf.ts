import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bus, BusSeat, Jamaah, BusStaff } from '../types';
import { formatRupiah, formatDateId } from './formatters';

/**
 * Generate and download Bus Seating Chart PDF
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
