import * as XLSX from 'xlsx';
import { Jamaah, PaymentTransaction, Rombongan, Bus } from '../types';
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
