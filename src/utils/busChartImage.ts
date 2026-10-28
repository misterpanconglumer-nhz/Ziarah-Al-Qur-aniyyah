import { Bus, BusSeat, BusStaff, Rombongan } from '../types';

/**
 * Generate a high-resolution, pixel-perfect HTML5 Canvas of the 59-Seat Bus Layout.
 * This completely avoids HTML2Canvas CSS-parsing bugs (stripped borders, broken grids).
 */
export function generateBusChartCanvas(
  bus: Bus,
  seats: BusSeat[],
  staffList: BusStaff[] = [],
  rombonganList: Rombongan[] = []
): HTMLCanvasElement {
  // Canvas Dimensions: 1200 x 1460 (High-res crisp quality for WhatsApp & printing)
  const width = 1200;
  const height = 1460;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Background (White)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Outer Border (Midnight Navy Blue #142B4A)
  ctx.strokeStyle = '#142B4A';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 24, 24, width - 48, height - 48, 24, false, true);

  // Staff and Coordinator info
  const tl = staffList.find(s => s.role === 'tour_leader');
  const romb = rombonganList.find(r => r.bus_id === bus.id);
  const koordinatorName = romb?.coordinator_name || staffList.find(s => s.role === 'pembimbing')?.name || '';
  const koordinatorPhone = romb?.coordinator_phone || staffList.find(s => s.role === 'pembimbing')?.phone || '';
  const tlName = tl?.name || '';
  const tlPhone = tl?.phone || '';

  // 3. Top Blue Header Banner
  const bannerX = 54;
  const bannerY = 54;
  const bannerW = width - 108; // 1092px
  const bannerH = 68;

  ctx.fillStyle = '#142B4A';
  drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 12, true, false);

  // Banner Title: e.g. "BUS 01"
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const busTitle = bus.name.toUpperCase().startsWith('BUS')
    ? bus.name.toUpperCase()
    : `BUS ${bus.name.toUpperCase()}`;
  ctx.fillText(busTitle, bannerX + bannerW / 2, bannerY + bannerH / 2);

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

  // Fallback for unmapped seats
  const unmapped = seats.filter(
    s => s.occupant_name && (!s.seat_number.match(/\d+/) || parseInt(s.seat_number.match(/\d+/)![0], 10) > 59)
  );
  let curNum = 1;
  unmapped.forEach(s => {
    while (seatMap.has(curNum) && curNum <= 59) curNum++;
    if (curNum <= 59) seatMap.set(curNum, s);
  });

  // 4. Row 0: Pintu Masuk / Helper - Tour Leader - Sopir
  const row0Y = 142;
  const row0H = 68;

  // Box 1: PINTU MASUK / HELPER
  drawCellBox(ctx, bannerX, row0Y, 240, row0H, 'PINTU MASUK', 'HELPER', '#142B4A');

  // Box 2: TOUR LEADER (Center)
  const tlW = 380;
  const tlX = bannerX + (bannerW - tlW) / 2;
  drawCellBox(ctx, tlX, row0Y, tlW, row0H, 'TOUR LEADER', tlName || '-', '#142B4A');

  // Box 3: SOPIR (Right)
  const sopirW = 240;
  const sopirX = bannerX + bannerW - sopirW;
  drawCellBox(ctx, sopirX, row0Y, sopirW, row0H, 'SOPIR', 'SOPIR', '#142B4A');

  // 5. Rows 1 to 10 (2 - 3 seating layout)
  const startY = 228;
  const seatH = 66;
  const rowGap = 14;
  const rowPitch = seatH + rowGap; // 80px

  // Left 2 seats width: 220 each (total 455 including 15 gap)
  const seatWLeft = 220;
  const gapLeft = 15;

  // Right 3 seats width: 175 each (total 555 including 2x 15 gap)
  const seatWRight = 175;
  const gapRight = 15;

  const leftStartX = bannerX;
  const rightStartX = bannerX + bannerW - (3 * seatWRight + 2 * gapRight); // 54 + 1092 - 555 = 591

  for (let r = 0; r < 10; r++) {
    const y = startY + r * rowPitch;
    const base = r * 5;

    // Left 2 seats
    drawSeatBox(ctx, leftStartX, y, seatWLeft, seatH, base + 1, seatMap);
    drawSeatBox(ctx, leftStartX + seatWLeft + gapLeft, y, seatWLeft, seatH, base + 2, seatMap);

    // Center aisle dot
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    const aisleX = leftStartX + 2 * seatWLeft + gapLeft + (rightStartX - (leftStartX + 2 * seatWLeft + gapLeft)) / 2;
    ctx.arc(aisleX, y + seatH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Right 3 seats
    drawSeatBox(ctx, rightStartX, y, seatWRight, seatH, base + 3, seatMap);
    drawSeatBox(ctx, rightStartX + seatWRight + gapRight, y, seatWRight, seatH, base + 4, seatMap);
    drawSeatBox(ctx, rightStartX + 2 * (seatWRight + gapRight), y, seatWRight, seatH, base + 5, seatMap);
  }

  // 6. Row 11: PINTU KELUAR (Left) & Seats 51, 52, 53 (Right)
  const yRow11 = startY + 10 * rowPitch;
  const pintuKeluarW = 2 * seatWLeft + gapLeft; // 455px

  // Pintu Keluar Banner
  ctx.fillStyle = '#142B4A';
  ctx.fillRect(leftStartX, yRow11, pintuKeluarW, seatH);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftStartX, yRow11, pintuKeluarW, seatH);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PINTU KELUAR', leftStartX + pintuKeluarW / 2, yRow11 + seatH / 2);

  // Seats 51, 52, 53
  drawSeatBox(ctx, rightStartX, yRow11, seatWRight, seatH, 51, seatMap);
  drawSeatBox(ctx, rightStartX + seatWRight + gapRight, yRow11, seatWRight, seatH, 52, seatMap);
  drawSeatBox(ctx, rightStartX + 2 * (seatWRight + gapRight), yRow11, seatWRight, seatH, 53, seatMap);

  // 7. Row 12 (Back Row Across, 6 seats across): 54 to 59
  const yRow12 = startY + 11 * rowPitch;
  const backSeatGap = 12;
  const backSeatW = (bannerW - 5 * backSeatGap) / 6; // (1092 - 60) / 6 = 172px

  for (let b = 0; b < 6; b++) {
    const seatNum = 54 + b;
    const x = bannerX + b * (backSeatW + backSeatGap);
    drawSeatBox(ctx, x, yRow12, backSeatW, seatH, seatNum, seatMap);
  }

  // 8. Footer Section (Contact Person & Attribution)
  const yFooter = yRow12 + seatH + 28;

  // Divider Line
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bannerX, yFooter);
  ctx.lineTo(bannerX + bannerW, yFooter);
  ctx.stroke();

  // Contact Person Header
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Contact Person :', bannerX, yFooter + 12);

  // Koordinator & Tour Leader (2 Columns)
  ctx.font = '14px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  
  // Left col: Koordinator Bus
  ctx.fillStyle = '#475569';
  ctx.fillText('Koordinator Bus :', bannerX, yFooter + 36);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.fillText(koordinatorName ? `${koordinatorName.toUpperCase()}   ${koordinatorPhone}` : '-', bannerX + 140, yFooter + 36);

  // Right col: Tour Leader
  const rightColX = bannerX + bannerW / 2;
  ctx.font = '14px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Tour Leader :', rightColX, yFooter + 36);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.fillText(tlName ? `${tlName.toUpperCase()}   ${tlPhone}` : '-', rightColX + 110, yFooter + 36);

  // Bottom Watermark
  ctx.font = '12px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.textAlign = 'center';
  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(`Sistem Operasional Ziarah Akbar 2027 • Denah Resmi Format Standar 59 Kursi • Tanggal: ${dateStr}`, width / 2, height - 38);

  return canvas;
}

/**
 * Draw individual seat box with header strip and occupant name
 */
function drawSeatBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seatNum: number,
  seatMap: Map<number, BusSeat>
) {
  const headerH = 22;
  const s = seatMap.get(seatNum);
  const occupant = (s?.occupant_name || '').trim();

  // Outer border & background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, w, h);

  // Header Strip: Soft Blue Tint #E1EBF5
  ctx.fillStyle = '#E1EBF5';
  ctx.fillRect(x, y, w, headerH);

  // Borders
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, w, h);

  // Line separating header and body
  ctx.beginPath();
  ctx.moveTo(x, y + headerH);
  ctx.lineTo(x + w, y + headerH);
  ctx.stroke();

  // Header Text: "SEAT X"
  ctx.fillStyle = '#142B4A';
  ctx.font = 'bold 12px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SEAT ${seatNum}`, x + w / 2, y + headerH / 2);

  // Body: Occupant Name
  const bodyH = h - headerH;
  const bodyY = y + headerH;

  if (occupant) {
    ctx.fillStyle = '#0F172A';
    const upperName = occupant.toUpperCase();

    // Dynamically size font and handle long names
    if (upperName.length > 20) {
      ctx.font = 'bold 11px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
      wrapText(ctx, upperName, x + w / 2, bodyY + bodyH / 2 - 6, w - 8, 13);
    } else if (upperName.length > 14) {
      ctx.font = 'bold 11.5px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
      ctx.fillText(upperName, x + w / 2, bodyY + bodyH / 2);
    } else {
      ctx.font = 'bold 13px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
      ctx.fillText(upperName, x + w / 2, bodyY + bodyH / 2);
    }
  } else {
    // Empty Seat Placeholder
    ctx.fillStyle = '#CBD5E1';
    ctx.font = 'bold 14px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
    ctx.fillText('-', x + w / 2, bodyY + bodyH / 2);
  }
}

/**
 * Draw custom cell box (such as Pintu Masuk, Tour Leader, Sopir)
 */
function drawCellBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  headerText: string,
  contentText: string,
  headerColor: string = '#142B4A'
) {
  const headerH = 22;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, w, h);

  // Header Strip: Soft Blue Tint #E1EBF5
  ctx.fillStyle = '#E1EBF5';
  ctx.fillRect(x, y, w, headerH);

  // Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, w, h);

  // Line separating header and body
  ctx.beginPath();
  ctx.moveTo(x, y + headerH);
  ctx.lineTo(x + w, y + headerH);
  ctx.stroke();

  // Header Text
  ctx.fillStyle = headerColor;
  ctx.font = 'bold 12px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(headerText, x + w / 2, y + headerH / 2);

  // Body Text
  const bodyH = h - headerH;
  const bodyY = y + headerH;

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif';
  ctx.fillText(contentText.toUpperCase(), x + w / 2, bodyY + bodyH / 2);
}

/**
 * Helper to wrap text into two lines if exceeding max width
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  if (lines.length === 1) {
    ctx.fillText(lines[0], x, y + lineHeight / 2);
  } else {
    ctx.fillText(lines[0], x, y);
    ctx.fillText(lines.slice(1).join(' '), x, y + lineHeight);
  }
}

/**
 * Helper to draw rounded rectangle on Canvas 2D
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill: boolean = true,
  stroke: boolean = true
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Copy Bus Chart Image directly to Clipboard, with automatic download fallback
 */
export async function copyBusChartImageToClipboard(
  bus: Bus,
  seats: BusSeat[],
  staffList: BusStaff[] = [],
  rombonganList: Rombongan[] = []
): Promise<{ success: boolean; method: 'clipboard' | 'download'; message: string }> {
  const canvas = generateBusChartCanvas(bus, seats, staffList, rombonganList);

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve({
          success: false,
          method: 'download',
          message: 'Gagal membuat file gambar denah.'
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
            message: `Gambar denah ${bus.name} berhasil disalin! Silakan langsung Paste (Ctrl+V) di WhatsApp.`
          });
          return;
        } catch (clipboardErr) {
          console.warn('ClipboardItem write not allowed by browser, falling back to download:', clipboardErr);
        }
      }

      // 2. Fallback: Download file directly
      const filename = `Denah_${bus.name.replace(/\s+/g, '_')}_59_Kursi.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();

      resolve({
        success: true,
        method: 'download',
        message: `Gambar denah ${bus.name} otomatis diunduh sebagai PNG (siap dikirim ke rombongan).`
      });
    }, 'image/png');
  });
}
