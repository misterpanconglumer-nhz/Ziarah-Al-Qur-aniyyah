/**
 * Utility formattings for Indonesian currency, dates, and text
 */

export function formatRupiah(value: number | string | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return 'Rp 0';
  }
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(numeric);
}

export function parseRupiahInput(value: string): number {
  const clean = value.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

export function formatDateId(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateTimeId(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d) + ' WIB';
  } catch {
    return dateStr;
  }
}

export function formatPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '-';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+62 ' + cleaned.substring(1);
  }
  return cleaned;
}

export interface ParsedPaymentNote {
  channelBadge?: string;
  cleanNote: string;
}

/**
 * Parse structured channel badge and notes from payment notes
 * e.g. "[Cash: Titip Koordinator (H. Sudirman)] Titipan tahap 1"
 */
export function parsePaymentMethodNote(notes: string | undefined | null): ParsedPaymentNote {
  if (!notes) return { cleanNote: '' };
  const trimmed = notes.trim();
  const match = trimmed.match(/^\[(.*?)\]\s*(.*)$/s);
  if (match) {
    return {
      channelBadge: match[1],
      cleanNote: match[2].trim()
    };
  }
  return { cleanNote: trimmed };
}

/**
 * Natural numerical sorter for buses (Bus 01, Bus 02, ... Bus 40)
 */
export function sortBusesNaturally<T extends { name: string; id: string }>(buses: T[]): T[] {
  return [...buses].sort((a, b) => {
    const numA = parseInt(a.name.replace(/\D/g, '') || a.id.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.name.replace(/\D/g, '') || b.id.replace(/\D/g, '') || '0', 10);
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Konversi angka nominal uang ke kalimat terbilang Bahasa Indonesia
 * Contoh: 185000 -> "Seratus Delapan Puluh Lima Ribu Rupiah"
 */
export function terbilang(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return 'Nol Rupiah';
  const num = typeof n === 'string' ? parseInt(n.replace(/[^0-9]/g, ''), 10) : Math.floor(n);
  if (isNaN(num) || num <= 0) return 'Nol Rupiah';

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function convert(x: number): string {
    if (x < 12) {
      return satuan[x];
    } else if (x < 20) {
      return convert(x - 10) + ' Belas';
    } else if (x < 100) {
      return convert(Math.floor(x / 10)) + ' Puluh ' + convert(x % 10);
    } else if (x < 200) {
      return 'Seratus ' + convert(x - 100);
    } else if (x < 1000) {
      return convert(Math.floor(x / 100)) + ' Ratus ' + convert(x % 100);
    } else if (x < 2000) {
      return 'Seribu ' + convert(x - 1000);
    } else if (x < 1000000) {
      return convert(Math.floor(x / 1000)) + ' Ribu ' + convert(x % 1000);
    } else if (x < 1000000000) {
      return convert(Math.floor(x / 1000000)) + ' Juta ' + convert(x % 1000000);
    } else if (x < 1000000000000) {
      return convert(Math.floor(x / 1000000000)) + ' Miliar ' + convert(x % 1000000000);
    } else {
      return convert(Math.floor(x / 1000000000000)) + ' Triliun ' + convert(x % 1000000000000);
    }
  }

  const result = convert(num).replace(/\s+/g, ' ').trim();
  return result ? `${result} Rupiah` : 'Nol Rupiah';

}
