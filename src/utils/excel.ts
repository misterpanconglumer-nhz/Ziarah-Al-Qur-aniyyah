import * as XLSX from 'xlsx';
import { Jamaah, PaymentTransaction, Rombongan, Bus, BudgetItem } from '../types';
import { formatRupiah, formatDateId } from './formatters';

export interface ImportParsedRow {
  rowNumber: number;
  name: string;
  phone: string;
  rombonganName: string;
  billAmount: number;
  initialPayment: number;
  paymentDate: string;
  notes: string;
  isValid: boolean;
  errors: string[];
  isDuplicateCandidate?: boolean;
  duplicateReason?: string;
  actionChoice?: 'import_new' | 'skip';
}

/**
 * Generate and download template Excel for importing jamaah
 */
export function downloadJamaahTemplate(defaultBillAmount: number = 175000) {
  const templateData = [
    {
      'Nama Lengkap': 'Ahmad Fauzi',
      'Nomor Telepon': '081234567890',
      'Nama Rombongan': 'Majelis Ta\'lim Al-Ikhlas',
      'Nominal Tagihan': defaultBillAmount,
      'Pembayaran Awal': defaultBillAmount,
      'Tanggal Pembayaran': '2026-10-25',
      'Keterangan': 'Lunas awal'
    },
    {
      'Nama Lengkap': 'Siti Maryam',
      'Nomor Telepon': '082198765432',
      'Nama Rombongan': 'Keluarga Besar H. Ridwan',
      'Nominal Tagihan': defaultBillAmount,
      'Pembayaran Awal': 100000,
      'Tanggal Pembayaran': '2026-10-25',
      'Keterangan': 'Cicilan tahap 1'
    },
    {
      'Nama Lengkap': 'Muhammad Rizky',
      'Nomor Telepon': '085712349876',
      'Nama Rombongan': 'Al-Qur\'aniyyah Pusat',
      'Nominal Tagihan': defaultBillAmount,
      'Pembayaran Awal': 0,
      'Tanggal Pembayaran': '',
      'Keterangan': 'Belum ada pembayaran'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Nama Lengkap
    { wch: 18 }, // Nomor Telepon
    { wch: 28 }, // Nama Rombongan
    { wch: 18 }, // Nominal Tagihan
    { wch: 18 }, // Pembayaran Awal
    { wch: 20 }, // Tanggal Pembayaran
    { wch: 30 }  // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Jamaah');

  // Petunjuk sheet
  const guideData = [
    { Petunjuk: 'PANDUAN PENGISIAN TEMPLATE IMPORT JAMAAH ZIARAH 2027' },
    { Petunjuk: '1. Kolom "Nama Lengkap" wajib diisi.' },
    { Petunjuk: '2. "Nomor Telepon" disarankan diisi untuk mempermudah identifikasi duplikasi.' },
    { Petunjuk: '3. "Nama Rombongan" jika belum ada di sistem, akan otomatis didaftarkan sebagai rombongan baru.' },
    { Petunjuk: '4. "Nominal Tagihan" diisi angka murni tanpa titik/koma (default: ' + defaultBillAmount + ').' },
    { Petunjuk: '5. "Pembayaran Awal" boleh 0 atau kosong jika belum melakukan pembayaran.' },
    { Petunjuk: '6. "Tanggal Pembayaran" format YYYY-MM-DD (contoh: 2026-10-25). Biarkan kosong jika belum bayar.' },
    { Petunjuk: '7. Jangan mengubah atau menghapus susunan nama kolom di baris pertama sheet Template Jamaah.' }
  ];
  const guideSheet = XLSX.utils.json_to_sheet(guideData);
  guideSheet['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Petunjuk Pengisian');

  XLSX.writeFile(workbook, 'Template_Import_Jamaah_Ziarah_2027.xlsx');
}

/**
 * Parse uploaded Excel file into structured rows
 */
export async function parseJamaahExcel(file: File, defaultBillAmount: number = 175000): Promise<ImportParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

        const parsed: ImportParsedRow[] = jsonRows.map((row, index) => {
          const rowNumber = index + 2; // header is row 1
          const errors: string[] = [];

          // Column resolution (support slight variations in casing/spacing)
          const name = (row['Nama Lengkap'] || row['nama lengkap'] || row['Nama'] || row['nama'] || '').toString().trim();
          const phone = (row['Nomor Telepon'] || row['nomor telepon'] || row['No HP'] || row['no hp'] || row['Telepon'] || '').toString().trim();
          const rombonganName = (row['Nama Rombongan'] || row['nama rombongan'] || row['Rombongan'] || row['rombongan'] || 'Umum').toString().trim();
          
          let billAmount = Number(row['Nominal Tagihan'] || row['nominal tagihan'] || row['Tagihan'] || defaultBillAmount);
          if (isNaN(billAmount) || billAmount < 0) {
            billAmount = defaultBillAmount;
          }

          let initialPayment = Number(row['Pembayaran Awal'] || row['pembayaran awal'] || row['Bayar'] || 0);
          if (isNaN(initialPayment) || initialPayment < 0) {
            initialPayment = 0;
          }

          const paymentDate = (row['Tanggal Pembayaran'] || row['tanggal pembayaran'] || row['Tanggal'] || '').toString().trim();
          const notes = (row['Keterangan'] || row['keterangan'] || '').toString().trim();

          if (!name) {
            errors.push('Nama Lengkap tidak boleh kosong');
          }

          if (initialPayment > billAmount) {
            errors.push(`Pembayaran awal (Rp ${initialPayment.toLocaleString()}) melebihi tagihan (Rp ${billAmount.toLocaleString()})`);
          }

          return {
            rowNumber,
            name,
            phone,
            rombonganName: rombonganName || 'Umum',
            billAmount,
            initialPayment,
            paymentDate: paymentDate || new Date().toISOString().split('T')[0],
            notes,
            isValid: errors.length === 0,
            errors,
            actionChoice: 'import_new'
          };
        });

        resolve(parsed);
      } catch (err) {
        reject(new Error('Gagal membaca file Excel. Pastikan format file adalah .xlsx atau .xls yang valid.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Terjadi kesalahan saat membaca file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export Jamaah List to Excel (.xlsx)
 */
export function exportJamaahToExcel(jamaahList: Jamaah[], fileName: string = 'Data_Jamaah_Ziarah_2027.xlsx') {
  const exportData = jamaahList.map((j, idx) => ({
    'No': idx + 1,
    'ID Jamaah': j.id,
    'Nama Lengkap': j.name,
    'Nomor Telepon': j.phone || '-',
    'Rombongan': j.rombongan_name || '-',
    'Bus': j.bus_name || 'Belum Diatur',
    'Nomor Kursi': j.seat_number || 'Belum Diatur',
    'Nominal Tagihan (Rp)': j.bill_amount,
    'Total Pembayaran (Rp)': j.total_paid,
    'Sisa Tagihan (Rp)': j.remaining_amount,
    'Status Pembayaran': j.payment_status,
    'Keterangan': j.notes || '-',
    'Status Duplikat': j.duplicate_status === 'confirmed_duplicate' ? 'Duplikat Terkonfirmasi' : 
                      j.duplicate_status === 'unreviewed' ? 'Perlu Diperiksa' : 'Aman'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 14 }, // ID
    { wch: 26 }, // Nama
    { wch: 16 }, // Phone
    { wch: 24 }, // Rombongan
    { wch: 16 }, // Bus
    { wch: 14 }, // Kursi
    { wch: 20 }, // Tagihan
    { wch: 20 }, // Pembayaran
    { wch: 20 }, // Sisa
    { wch: 18 }, // Status
    { wch: 25 }, // Notes
    { wch: 20 }  // Duplicate
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Jamaah');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export Payment Transactions to Excel
 */
export function exportPaymentsToExcel(payments: PaymentTransaction[], fileName: string = 'Rekap_Pembayaran_Ziarah_2027.xlsx') {
  const exportData = payments.map((p, idx) => ({
    'No': idx + 1,
    'ID Transaksi': p.id,
    'ID Jamaah': p.jamaah_id,
    'Nama Jamaah': p.jamaah_name || '-',
    'Tanggal Transaksi': formatDateId(p.date),
    'Nominal (Rp)': p.amount,
    'Metode Pembayaran': p.payment_method,
    'Nomor Referensi': p.reference_number || '-',
    'Status': p.status === 'valid' ? 'Valid' : 'DIBATALKAN (VOID)',
    'Alasan Pembatalan': p.cancelled_reason || '-',
    'Keterangan': p.notes || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // ID
    { wch: 14 }, // Jamaah ID
    { wch: 26 }, // Nama Jamaah
    { wch: 20 }, // Tanggal
    { wch: 18 }, // Nominal
    { wch: 18 }, // Metode
    { wch: 18 }, // Ref
    { wch: 22 }, // Status
    { wch: 25 }, // Void reason
    { wch: 25 }  // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Pembayaran');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Export Bus Passenger Manifest to Excel
 */
export function exportBusManifestToExcel(bus: Bus, passengers: Jamaah[], staffList: any[] = []) {
  const staffRows = staffList.map((s, idx) => ({
    'Tipe': s.role === 'tour_leader' ? 'TOUR LEADER' : 'PEMBIMBING',
    'No Kursi': s.seat_number || '-',
    'Nama': s.name,
    'Telepon': s.phone || '-',
    'Rombongan': 'Petugas Bus',
    'Status Biaya': 'Petugas'
  }));

  const passengerRows = passengers.map((p) => ({
    'Tipe': 'JAMAAH',
    'No Kursi': p.seat_number || 'Belum Diatur',
    'Nama': p.name,
    'Telepon': p.phone || '-',
    'Rombongan': p.rombongan_name || '-',
    'Status Biaya': p.payment_status
  }));

  const allRows = [...staffRows, ...passengerRows];

  const worksheet = XLSX.utils.json_to_sheet(allRows);
  worksheet['!cols'] = [
    { wch: 16 }, // Tipe
    { wch: 12 }, // Kursi
    { wch: 28 }, // Nama
    { wch: 18 }, // Telepon
    { wch: 25 }, // Rombongan
    { wch: 16 }  // Status Biaya
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Manifest ${bus.name}`);
  XLSX.writeFile(workbook, `Manifest_${bus.name.replace(/\s+/g, '_')}_Ziarah_2027.xlsx`);
}

/**
 * Parse Budget Items from Excel (Supports ZIARAH 2027.xlsx category format and standard tabular format)
 */
export async function parseBudgetExcel(file: File): Promise<Omit<BudgetItem, 'id' | 'created_at'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const items: Omit<BudgetItem, 'id' | 'created_at'>[] = [];
        let currentCategory = 'Umum';

        // Check if file uses structured category blocks (like ZIARAH 2027.xlsx)
        const isStructuredZiarahFormat = rows.some(r => 
          r && r[1] && typeof r[1] === 'string' && (r[1].includes('MAKAN') || r[1].includes('TRANSPORTASI') || r[1].includes('DOORPRIZE'))
        );

        if (isStructuredZiarahFormat) {
          for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length === 0) continue;

            // Check if row is a Category Header
            if (r[1] && typeof r[1] === 'string' && !r[2] && !r[3]) {
              const cat = r[1].trim();
              if (
                !cat.includes('ANGGARAN') && 
                !cat.includes('ASUMSI') && 
                !cat.includes('Rencana') && 
                !cat.includes('SUB TOTAL') && 
                !cat.includes('TOTAL')
              ) {
                // Map category title
                if (cat.toUpperCase().includes('MAKAN')) currentCategory = 'Konsumsi';
                else if (cat.toUpperCase().includes('TRANSPORT')) currentCategory = 'Transportasi';
                else if (cat.toUpperCase().includes('PELAKSANAAN') || cat.toUpperCase().includes('ZIARAH')) currentCategory = 'Retribusi & Ziarah';
                else if (cat.toUpperCase().includes('P3K') || cat.toUpperCase().includes('KESEHATAN')) currentCategory = 'Kesehatan';
                else if (cat.toUpperCase().includes('PERLENGKAPAN')) currentCategory = 'Perlengkapan';
                else if (cat.toUpperCase().includes('DOORPRIZE')) currentCategory = 'Doorprize';
                else if (cat.toUpperCase().includes('BISYAROH')) currentCategory = 'Bisyaroh & Petugas';
                else if (cat.toUpperCase().includes('SAVING')) currentCategory = 'Dana Cadangan';
                else currentCategory = cat;
                continue;
              }
            }

            const itemName = r[2] ? String(r[2]).trim() : '';
            if (
              itemName &&
              itemName !== 'Jumlah Bus' &&
              !itemName.toUpperCase().includes('SUB TOTAL') &&
              !itemName.toUpperCase().includes('TOTAL') &&
              !itemName.toUpperCase().includes('BIAYA PERJAMA')
            ) {
              const price = typeof r[3] === 'number' ? r[3] : parseFloat(String(r[3] || '0').replace(/[^0-9.]/g, '')) || 0;
              const volume = typeof r[5] === 'number' ? r[5] : parseFloat(String(r[5] || '1').replace(/[^0-9.]/g, '')) || 1;
              const unit = r[6] ? String(r[6]).trim() : 'Unit';
              const total = typeof r[8] === 'number' ? r[8] : (typeof r[9] === 'number' ? r[9] : price * volume);

              if (price > 0 && volume > 0) {
                items.push({
                  name: itemName,
                  category: currentCategory as any,
                  unit_price: Math.round(price),
                  volume: volume,
                  unit: unit,
                  total_budget: Math.round(total)
                });
              }
            }
          }
        } else {
          // Standard Tabular Format: Look for headers in row 0 or 1
          const headerRowIndex = rows.findIndex(r => 
            r && r.some((c: any) => c && typeof c === 'string' && (c.toLowerCase().includes('nama') || c.toLowerCase().includes('pos') || c.toLowerCase().includes('anggaran')))
          );

          if (headerRowIndex !== -1) {
            const headers = rows[headerRowIndex].map((h: any) => String(h || '').toLowerCase().trim());
            const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('pos') || h.includes('item'));
            const catIdx = headers.findIndex(h => h.includes('kategori') || h.includes('bidang'));
            const volIdx = headers.findIndex(h => h.includes('vol') || h.includes('jumlah') || h.includes('qty'));
            const unitIdx = headers.findIndex(h => h.includes('satuan') || h.includes('unit'));
            const priceIdx = headers.findIndex(h => h.includes('harga') || h.includes('tarif') || h.includes('biaya'));
            const totalIdx = headers.findIndex(h => h.includes('total') || h.includes('jumlah total'));

            for (let i = headerRowIndex + 1; i < rows.length; i++) {
              const r = rows[i];
              if (!r || r.length === 0) continue;

              const name = nameIdx !== -1 && r[nameIdx] ? String(r[nameIdx]).trim() : '';
              if (!name) continue;

              const cat = catIdx !== -1 && r[catIdx] ? String(r[catIdx]).trim() : 'Umum';
              const vol = volIdx !== -1 ? parseFloat(String(r[volIdx] || '1').replace(/[^0-9.]/g, '')) || 1 : 1;
              const unit = unitIdx !== -1 && r[unitIdx] ? String(r[unitIdx]).trim() : 'Unit';
              const price = priceIdx !== -1 ? parseFloat(String(r[priceIdx] || '0').replace(/[^0-9.]/g, '')) || 0 : 0;
              const total = totalIdx !== -1 && r[totalIdx] ? parseFloat(String(r[totalIdx]).replace(/[^0-9.]/g, '')) || price * vol : price * vol;

              items.push({
                name,
                category: cat as any,
                volume: vol,
                unit,
                unit_price: Math.round(price),
                total_budget: Math.round(total)
              });
            }
          }
        }

        resolve(items);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file Excel'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Download Template for Budget Excel
 */
export function downloadBudgetTemplate() {
  const templateData = [
    { 'Nama Pos Anggaran': 'Sewa Bus Pariwisata Jetbus 5', 'Kategori': 'Transportasi', 'Volume': 40, 'Satuan': 'Bus', 'Harga Satuan': 4000000, 'Total': 160000000, 'Catatan': 'Termasuk driver & bbm' },
    { 'Nama Pos Anggaran': 'Snack Pagi & Air Botol', 'Kategori': 'Konsumsi', 'Volume': 2500, 'Satuan': 'Box', 'Harga Satuan': 3500, 'Total': 8750000, 'Catatan': 'Snack box saat berangkat' },
    { 'Nama Pos Anggaran': 'Makan Siang Jamaah', 'Kategori': 'Konsumsi', 'Volume': 2500, 'Satuan': 'Porsi', 'Harga Satuan': 12000, 'Total': 30000000, 'Catatan': 'Prasmanan / box' },
    { 'Nama Pos Anggaran': 'Doorprize Utama Umroh', 'Kategori': 'Doorprize', 'Volume': 1, 'Satuan': 'Paket', 'Harga Satuan': 25000000, 'Total': 25000000, 'Catatan': 'Hadiah utama 1 tiket umroh' },
    { 'Nama Pos Anggaran': 'Obat-Obatan & P3K', 'Kategori': 'Kesehatan', 'Volume': 1, 'Satuan': 'Paket', 'Harga Satuan': 1000000, 'Total': 1000000, 'Catatan': 'Persiapan medis' }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [
    { wch: 35 }, // Nama
    { wch: 18 }, // Kategori
    { wch: 10 }, // Volume
    { wch: 12 }, // Satuan
    { wch: 16 }, // Harga
    { wch: 18 }, // Total
    { wch: 30 }  // Catatan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rencana Anggaran');
  XLSX.writeFile(workbook, 'Template_Anggaran_Ziarah_2027.xlsx');
}

/**
 * Parse Seat Assignments from Excel
 */
export async function parseSeatAssignmentsExcel(file: File): Promise<{ seatNumber: string; occupantName: string }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const assignments: { seatNumber: string; occupantName: string }[] = [];

        // Find header row with 'kursi'/'seat' and 'nama'
        let seatCol = -1;
        let nameCol = -1;
        let startRow = 0;

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const r = rows[i];
          if (!r) continue;
          for (let c = 0; c < r.length; c++) {
            const val = String(r[c] || '').toLowerCase().trim();
            if (val.includes('kursi') || val.includes('seat')) seatCol = c;
            if (val.includes('nama') || val.includes('jamaah') || val.includes('penghuni')) nameCol = c;
          }
          if (seatCol !== -1 && nameCol !== -1) {
            startRow = i + 1;
            break;
          }
        }

        // If no explicit header, assume Col 0 is Seat and Col 1 is Name
        if (seatCol === -1 || nameCol === -1) {
          seatCol = 0;
          nameCol = 1;
          startRow = 0;
        }

        for (let i = startRow; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;

          let seatRaw = r[seatCol] ? String(r[seatCol]).trim() : '';
          const nameRaw = r[nameCol] ? String(r[nameCol]).trim() : '';

          if (!nameRaw || nameRaw.toUpperCase() === 'KOSONG' || nameRaw === '-') continue;

          // Normalize seat number: e.g. "1" -> "SEAT 1", "SEAT 1" -> "SEAT 1"
          const numMatch = seatRaw.match(/\d+/);
          let seatNumber = seatRaw;
          if (numMatch) {
            seatNumber = `SEAT ${parseInt(numMatch[0], 10)}`;
          } else if (seatRaw.toUpperCase().includes('TL') || seatRaw.toUpperCase().includes('TOUR')) {
            seatNumber = 'TL';
          } else if (seatRaw.toUpperCase().includes('PB') || seatRaw.toUpperCase().includes('PEMBIMBING')) {
            seatNumber = 'PB';
          }

          assignments.push({
            seatNumber,
            occupantName: nameRaw
          });
        }

        resolve(assignments);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file Excel denah'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Download Template for Seat Assignments Excel
 */
export function downloadSeatTemplate(busName: string = 'Bus') {
  const templateData: { 'No Kursi': string; 'Nama Jamaah': string; 'Keterangan': string }[] = [];
  
  for (let i = 1; i <= 59; i++) {
    templateData.push({
      'No Kursi': `SEAT ${i}`,
      'Nama Jamaah': '',
      'Keterangan': ''
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 25 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Denah 59 Kursi');
  XLSX.writeFile(workbook, `Template_Denah_${busName.replace(/\s+/g, '_')}_59_Kursi.xlsx`);
}
