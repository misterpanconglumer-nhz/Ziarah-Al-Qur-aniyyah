import html2canvas from 'html2canvas';
import { PaymentReceipt } from '../types';

/**
 * Capture Kwitansi element as high-resolution PNG and copy to clipboard (or fallback to download).
 */
export async function copyReceiptImageToClipboard(
  element: HTMLElement,
  receipt: PaymentReceipt
): Promise<{ success: boolean; method: 'clipboard' | 'download'; message: string }> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2.5, // 2.5x high DPI sharp resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0
    });

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve({
            success: false,
            method: 'download',
            message: 'Gagal membuat file gambar kwitansi.'
          });
          return;
        }

        // 1. Attempt writing directly to clipboard as PNG
        if (navigator.clipboard && typeof (window as any).ClipboardItem !== 'undefined') {
          try {
            const item = new (window as any).ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            resolve({
              success: true,
              method: 'clipboard',
              message: `Gambar Kwitansi ${receipt.receipt_number} berhasil disalin! Silakan langsung Paste (Ctrl+V) di WhatsApp atau chat.`
            });
            return;
          } catch (clipboardErr) {
            console.warn('ClipboardItem write not allowed by browser, falling back to download:', clipboardErr);
          }
        }

        // 2. Fallback: Download file directly
        const filename = `Kwitansi_${receipt.receipt_number}_${receipt.participant_name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();

        resolve({
          success: true,
          method: 'download',
          message: `Gambar Kwitansi ${receipt.receipt_number} otomatis diunduh sebagai file PNG.`
        });
      }, 'image/png');
    });
  } catch (err: any) {
    return {
      success: false,
      method: 'download',
      message: `Gagal memproses gambar kwitansi: ${err?.message || err}`
    };
  }
}
