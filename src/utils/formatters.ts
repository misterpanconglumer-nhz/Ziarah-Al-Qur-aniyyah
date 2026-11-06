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
