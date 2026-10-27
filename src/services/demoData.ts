import {
  Jamaah,
  Rombongan,
  Bus,
  BusStaff,
  BusSeat,
  BusLayoutConfig,
  SeatRole,
  PaymentTransaction,
  BudgetItem,
  ExpenseTransaction,
  ActivitySettings
} from '../types';

export const DEMO_SETTINGS: ActivitySettings = {
  id: 'current_settings',
  activity_name: "Ziarah Akbar Al-Qur'aniyyah 2027",
  activity_year: '2027',
  default_bill_amount: 175000,
  target_participants: 3000,
  notes: 'Sistem operasional tunggal pengelola bendahara',
  updated_at: new Date().toISOString()
};

export const DEMO_BUSES: Bus[] = [
  {
    id: 'BUS-01',
    name: 'Bus 01',
    operator: 'Blue Star',
    bus_type: 'Executive Jetbus 5',
    capacity: 59,
    status: 'active',
    notes: 'Kapasitas awal 59 kursi, konfigurasi 2-2 depan, baris belakang 5 kursi',
    created_at: '2026-10-01T08:00:00Z',
    staff: [
      {
        id: 'STF-01',
        bus_id: 'BUS-01',
        name: 'Ust. M. Farhan Assegaf',
        phone: '081234567801',
        role: 'tour_leader',
        seat_number: '1A'
      },
      {
        id: 'STF-02',
        bus_id: 'BUS-01',
        name: 'KH. Mahmud Syakir, Lc.',
        phone: '081234567802',
        role: 'pembimbing',
        seat_number: '1B'
      }
    ]
  },
  {
    id: 'BUS-02',
    name: 'Bus 02',
    operator: 'Blue Star',
    bus_type: 'Executive Jetbus 5',
    capacity: 59,
    status: 'active',
    notes: 'Kapasitas 59 kursi',
    created_at: '2026-10-01T08:00:00Z',
    staff: [
      {
        id: 'STF-03',
        bus_id: 'BUS-02',
        name: 'Ust. Bambang Hidayat',
        phone: '081234567803',
        role: 'tour_leader',
        seat_number: '1A'
      },
      {
        id: 'STF-04',
        bus_id: 'BUS-02',
        name: 'Ustadzah Hj. Maryam Hasanah',
        phone: '081234567804',
        role: 'pembimbing',
        seat_number: '1B'
      }
    ]
  },
  {
    id: 'BUS-03',
    name: 'Bus 03',
    operator: 'Pariwisata Mulia',
    bus_type: 'Super Executive',
    capacity: 60,
    status: 'standby',
    notes: 'Kapasitas 60 kursi cadangan gelombang 1',
    created_at: '2026-10-01T08:00:00Z',
    staff: []
  }
];

export const DEMO_ROMBONGAN: Rombongan[] = [
  {
    id: 'RMB-01',
    name: "Majelis Ta'lim Al-Ikhlas",
    coordinator_name: 'H. Sudirman',
    coordinator_phone: '081311223344',
    bus_id: 'BUS-01',
    bus_name: 'Bus 01',
    total_members: 24,
    notes: 'Area Jakarta Timur',
    created_at: '2026-10-02T08:00:00Z'
  },
  {
    id: 'RMB-02',
    name: 'Keluarga Besar H. Ridwan',
    coordinator_name: 'H. Ridwan Kamil',
    coordinator_phone: '081255667788',
    bus_id: 'BUS-01',
    bus_name: 'Bus 01',
    total_members: 18,
    notes: 'Keluarga inti & kerabat',
    created_at: '2026-10-02T08:00:00Z'
  },
  {
    id: 'RMB-03',
    name: "Al-Qur'aniyyah Pusat",
    coordinator_name: 'Ust. Ahmad Dahlan',
    coordinator_phone: '081599887766',
    bus_id: 'BUS-02',
    bus_name: 'Bus 02',
    total_members: 32,
    notes: 'Alumni dan santri sepuh',
    created_at: '2026-10-02T08:00:00Z'
  },
  {
    id: 'RMB-04',
    name: 'Remaja Masjid Nurul Huda',
    coordinator_name: 'Fikri Haikal',
    coordinator_phone: '087788990011',
    bus_id: 'BUS-02',
    bus_name: 'Bus 02',
    total_members: 15,
    notes: 'Pemuda & pengurus masjid',
    created_at: '2026-10-02T08:00:00Z'
  }
];

export const DEMO_JAMAAH: Jamaah[] = [
  {
    id: 'JM-0001',
    name: 'Ahmad Fauzi Rahman',
    phone: '081234567890',
    rombongan_id: 'RMB-01',
    rombongan_name: "Majelis Ta'lim Al-Ikhlas",
    bill_amount: 175000,
    total_paid: 175000,
    remaining_amount: 0,
    payment_status: 'Lunas',
    bus_id: 'BUS-01',
    bus_name: 'Bus 01',
    seat_number: '2A',
    notes: 'Dekat jendela',
    duplicate_status: 'none',
    created_at: '2026-10-05T09:00:00Z',
    updated_at: '2026-10-05T09:00:00Z'
  },
  {
    id: 'JM-0002',
    name: 'Siti Maryam',
    phone: '082198765432',
    rombongan_id: 'RMB-01',
    rombongan_name: "Majelis Ta'lim Al-Ikhlas",
    bill_amount: 175000,
    total_paid: 100000,
    remaining_amount: 75000,
    payment_status: 'Cicilan',
    bus_id: 'BUS-01',
    bus_name: 'Bus 01',
    seat_number: '2B',
    notes: 'Cicilan tahap 1',
    duplicate_status: 'none',
    created_at: '2026-10-05T09:15:00Z',
    updated_at: '2026-10-05T09:15:00Z'
  },
  {
    id: 'JM-0003',
    name: 'Putri Kamilah',
    phone: '085712349876',
    rombongan_id: 'RMB-02',
    rombongan_name: 'Keluarga Besar H. Ridwan',
    bill_amount: 175000,
    total_paid: 175000,
    remaining_amount: 0,
    payment_status: 'Lunas',
    bus_id: 'BUS-01',
    bus_name: 'Bus 01',
    seat_number: '3A',
    notes: 'Lunas',
    duplicate_status: 'none',
    created_at: '2026-10-06T10:00:00Z',
    updated_at: '2026-10-06T10:00:00Z'
  },
  {
    id: 'JM-0004',
    name: 'Putri K.',
    phone: '085712349876',
    rombongan_id: 'RMB-02',
    rombongan_name: 'Keluarga Besar H. Ridwan',
    bill_amount: 175000,
    total_paid: 0,
    remaining_amount: 175000,
    payment_status: 'Belum Bayar',
    notes: 'Kandidat nama mirip/duplikat dengan Putri Kamilah',
    duplicate_status: 'unreviewed',
    duplicate_of_id: 'JM-0003',
    created_at: '2026-10-06T11:00:00Z',
    updated_at: '2026-10-06T11:00:00Z'
  },
  {
    id: 'JM-0005',
    name: 'Muhammad Rizky Ramadhan',
    phone: '081399881122',
    rombongan_id: 'RMB-03',
    rombongan_name: "Al-Qur'aniyyah Pusat",
    bill_amount: 175000,
    total_paid: 175000,
    remaining_amount: 0,
    payment_status: 'Lunas',
    bus_id: 'BUS-02',
    bus_name: 'Bus 02',
    seat_number: '2A',
    notes: 'Lunas transfer Bank Syariah',
    duplicate_status: 'none',
    created_at: '2026-10-07T14:00:00Z',
    updated_at: '2026-10-07T14:00:00Z'
  },
  {
    id: 'JM-0006',
    name: 'Dewi Sartika',
    phone: '081822334455',
    rombongan_id: 'RMB-04',
    rombongan_name: 'Remaja Masjid Nurul Huda',
    bill_amount: 175000,
    total_paid: 0,
    remaining_amount: 175000,
    payment_status: 'Belum Bayar',
    notes: 'Belum ada pembayaran',
    duplicate_status: 'none',
    created_at: '2026-10-08T09:30:00Z',
    updated_at: '2026-10-08T09:30:00Z'
  }
];

export const DEMO_PAYMENTS: PaymentTransaction[] = [
  {
    id: 'TRX-0001',
    jamaah_id: 'JM-0001',
    jamaah_name: 'Ahmad Fauzi Rahman',
    date: '2026-10-05',
    amount: 175000,
    payment_method: 'Tunai',
    reference_number: 'KW-001',
    notes: 'Pembayaran lunas bendahara',
    status: 'valid',
    created_at: '2026-10-05T09:05:00Z'
  },
  {
    id: 'TRX-0002',
    jamaah_id: 'JM-0002',
    jamaah_name: 'Siti Maryam',
    date: '2026-10-05',
    amount: 100000,
    payment_method: 'Transfer Bank',
    reference_number: 'BSI-774912',
    notes: 'Cicilan ke-1',
    status: 'valid',
    created_at: '2026-10-05T09:20:00Z'
  },
  {
    id: 'TRX-0003',
    jamaah_id: 'JM-0003',
    jamaah_name: 'Putri Kamilah',
    date: '2026-10-06',
    amount: 175000,
    payment_method: 'QRIS',
    reference_number: 'QRS-882103',
    notes: 'Lunas via QRIS Panitia',
    status: 'valid',
    created_at: '2026-10-06T10:05:00Z'
  },
  {
    id: 'TRX-0004',
    jamaah_id: 'JM-0005',
    jamaah_name: 'Muhammad Rizky Ramadhan',
    date: '2026-10-07',
    amount: 175000,
    payment_method: 'Transfer Bank',
    reference_number: 'BSI-992144',
    notes: 'Transfer pelunasan',
    status: 'valid',
    created_at: '2026-10-07T14:10:00Z'
  }
];

export const DEMO_BUDGET: BudgetItem[] = [
  {
    id: 'BDG-01',
    name: 'Sewa Bus Pariwisata Blue Star (Executive Jetbus 5)',
    category: 'Transportasi',
    volume: 10,
    unit: 'Unit Bus',
    unit_price: 12500000,
    total_budget: 125000000,
    notes: 'Termasuk BBM, tol Jabodetabek, dan tip sopir',
    created_at: '2026-09-15T08:00:00Z'
  },
  {
    id: 'BDG-02',
    name: 'Konsumsi Snack Pagi & Air Mineral',
    category: 'Konsumsi',
    volume: 600,
    unit: 'Paket',
    unit_price: 25000,
    total_budget: 15000000,
    notes: 'Snack box 3 macam kue + air botol',
    created_at: '2026-09-15T08:00:00Z'
  },
  {
    id: 'BDG-03',
    name: 'Konsumsi Makan Siang Prasmanan / Box',
    category: 'Konsumsi',
    volume: 600,
    unit: 'Porsi',
    unit_price: 45000,
    total_budget: 27000000,
    notes: 'Di rest area / lokasi ziarah',
    created_at: '2026-09-15T08:00:00Z'
  },
  {
    id: 'BDG-04',
    name: 'Infaq Makam & Kebersihan Lokasi Ziarah',
    category: 'Retribusi & Ziarah',
    volume: 5,
    unit: 'Makam Waliyullah',
    unit_price: 2000000,
    total_budget: 10000000,
    notes: 'Infaq resmi maqbarah',
    created_at: '2026-09-15T08:00:00Z'
  },
  {
    id: 'BDG-05',
    name: 'ID Card & Buku Doa Ziarah Saku',
    category: 'Perlengkapan',
    volume: 600,
    unit: 'Eksemplar',
    unit_price: 15000,
    total_budget: 9000000,
    notes: 'Cetak gantungan tali lanyard + buku doa',
    created_at: '2026-09-15T08:00:00Z'
  }
];

export const DEMO_EXPENSES: ExpenseTransaction[] = [
  {
    id: 'EXP-0001',
    budget_item_id: 'BDG-01',
    date: '2026-10-01',
    title: 'DP Sewa Bus Tahap 1 (5 Unit)',
    category: 'Transportasi',
    amount: 25000000,
    receipt_ref: 'KWT-BS-091',
    notes: 'DP 20% ke PO Blue Star',
    status: 'valid',
    created_at: '2026-10-01T10:00:00Z'
  },
  {
    id: 'EXP-0002',
    budget_item_id: 'BDG-05',
    date: '2026-10-04',
    title: 'Cetak Buku Saku Doa Ziarah & Lanyard',
    category: 'Perlengkapan',
    amount: 4500000,
    receipt_ref: 'NOTA-PRNT-44',
    notes: 'Batch 1 sebanyak 300 pcs',
    status: 'valid',
    created_at: '2026-10-04T13:30:00Z'
  }
];

/**
 * Generate standard 59-seat Pariwisata layout (2-3 configuration: Rows 1-10 [2+3], Row 11 [Pintu Keluar + 3], Row 12 [6 back seats])
 */
export function generate59StandardSeats(busId: string, existingSeats: BusSeat[] = []): BusSeat[] {
  // Extract existing occupants mapped by seat index 1..59
  const occupantMap: Record<number, { name: string; id?: string; role?: SeatRole; label?: string }> = {};

  const occupiedList = existingSeats.filter(
    s => s.occupant_name && s.role !== 'driver' && s.role !== 'door' && s.role !== 'facility'
  );
  occupiedList.forEach((s, idx) => {
    const numMatch = s.seat_number.match(/\d+/);
    const seatIdx = numMatch ? parseInt(numMatch[0], 10) : idx + 1;
    if (seatIdx >= 1 && seatIdx <= 59 && !occupantMap[seatIdx]) {
      occupantMap[seatIdx] = {
        name: s.occupant_name!,
        id: s.occupant_id,
        role: s.role,
        label: s.occupant_role_label
      };
    }
  });

  // Assign any remaining unmapped occupants
  let nextIdx = 1;
  occupiedList.forEach(s => {
    const numMatch = s.seat_number.match(/\d+/);
    const seatIdx = numMatch ? parseInt(numMatch[0], 10) : 0;
    if (seatIdx < 1 || seatIdx > 59 || occupantMap[seatIdx]?.name !== s.occupant_name) {
      while (occupantMap[nextIdx] && nextIdx <= 59) nextIdx++;
      if (nextIdx <= 59) {
        occupantMap[nextIdx] = {
          name: s.occupant_name!,
          id: s.occupant_id,
          role: s.role,
          label: s.occupant_role_label
        };
      }
    }
  });

  const seats: BusSeat[] = [];

  // Rows 1 to 10: 5 seats per row (2 Left, 3 Right)
  for (let r = 1; r <= 10; r++) {
    const base = (r - 1) * 5;
    [
      { num: base + 1, col: 1 },
      { num: base + 2, col: 2 },
      { num: base + 3, col: 4 },
      { num: base + 4, col: 5 },
      { num: base + 5, col: 6 }
    ].forEach(({ num, col }) => {
      const occ = occupantMap[num];
      seats.push({
        id: `${busId}-SEAT-${num}`,
        bus_id: busId,
        seat_number: `SEAT ${num}`,
        row_num: r,
        col_num: col,
        role: occ?.role || (occ ? 'jamaah' : 'empty'),
        occupant_id: occ?.id,
        occupant_name: occ?.name,
        occupant_role_label: occ?.label
      });
    });
  }

  // Row 11: PINTU KELUAR (col 1, role: 'door') & Seats 51, 52, 53 (cols 4, 5, 6)
  seats.push({
    id: `${busId}-PINTU-KELUAR`,
    bus_id: busId,
    seat_number: 'PINTU KELUAR',
    row_num: 11,
    col_num: 1,
    role: 'door',
    occupant_role_label: 'Pintu Keluar'
  });

  [51, 52, 53].forEach((num, idx) => {
    const occ = occupantMap[num];
    seats.push({
      id: `${busId}-SEAT-${num}`,
      bus_id: busId,
      seat_number: `SEAT ${num}`,
      row_num: 11,
      col_num: 4 + idx,
      role: occ?.role || (occ ? 'jamaah' : 'empty'),
      occupant_id: occ?.id,
      occupant_name: occ?.name,
      occupant_role_label: occ?.label
    });
  });

  // Row 12 (Back Row Across): Seats 54 to 59 (cols 1 to 6)
  [54, 55, 56, 57, 58, 59].forEach((num, idx) => {
    const occ = occupantMap[num];
    seats.push({
      id: `${busId}-SEAT-${num}`,
      bus_id: busId,
      seat_number: `SEAT ${num}`,
      row_num: 12,
      col_num: idx + 1,
      role: occ?.role || (occ ? 'jamaah' : 'empty'),
      occupant_id: occ?.id,
      occupant_name: occ?.name,
      occupant_role_label: occ?.label
    });
  });

  return seats;
}

/**
 * Generate 59/60 default seat configuration layout for a bus
 */
export function generateDefaultSeatsForBus(busId: string, capacity: number = 59): BusSeat[] {
  if (capacity === 59) {
    return generate59StandardSeats(busId);
  }

  const seats: BusSeat[] = [];
  
  // Row 1: Col 1 is Driver, Col 5 is Front Door
  // Col 2: Tour Leader seat
  // Col 4: Pembimbing seat
  seats.push({
    id: `${busId}-R1-C1`,
    bus_id: busId,
    seat_number: 'SOPIR',
    row_num: 1,
    col_num: 1,
    role: 'driver',
    occupant_role_label: 'Sopir Bus'
  });
  seats.push({
    id: `${busId}-R1-C2`,
    bus_id: busId,
    seat_number: 'TL',
    row_num: 1,
    col_num: 2,
    role: 'tour_leader',
    occupant_role_label: 'Tour Leader'
  });
  // Col 3 is aisle (gang tengah)
  seats.push({
    id: `${busId}-R1-C4`,
    bus_id: busId,
    seat_number: 'PB',
    row_num: 1,
    col_num: 4,
    role: 'pembimbing',
    occupant_role_label: 'Pembimbing'
  });
  seats.push({
    id: `${busId}-R1-C5`,
    bus_id: busId,
    seat_number: 'PINTU',
    row_num: 1,
    col_num: 5,
    role: 'door',
    occupant_role_label: 'Pintu Masuk'
  });

  // Standard passenger rows (Row 2 to Row 13)
  let seatCounter = 1;
  const standardRows = Math.floor((capacity - 5) / 4);

  for (let r = 2; r <= 1 + standardRows; r++) {
    // Left side: A, B
    seats.push({
      id: `${busId}-R${r}-C1`,
      bus_id: busId,
      seat_number: `${seatCounter++}A`,
      row_num: r,
      col_num: 1,
      role: 'empty'
    });
    seats.push({
      id: `${busId}-R${r}-C2`,
      bus_id: busId,
      seat_number: `${seatCounter++}B`,
      row_num: r,
      col_num: 2,
      role: 'empty'
    });

    // Right side: C, D
    seats.push({
      id: `${busId}-R${r}-C4`,
      bus_id: busId,
      seat_number: `${seatCounter++}C`,
      row_num: r,
      col_num: 4,
      role: 'empty'
    });
    seats.push({
      id: `${busId}-R${r}-C5`,
      bus_id: busId,
      seat_number: `${seatCounter++}D`,
      row_num: r,
      col_num: 5,
      role: 'empty'
    });
  }

  // Last row across: 5 seats
  const lastRow = 2 + standardRows;
  ['K1', 'K2', 'K3', 'K4', 'K5'].forEach((label, idx) => {
    seats.push({
      id: `${busId}-R${lastRow}-C${idx + 1}`,
      bus_id: busId,
      seat_number: `BLKG-${idx + 1}`,
      row_num: lastRow,
      col_num: idx + 1,
      role: 'empty'
    });
  });

  return seats;
}
