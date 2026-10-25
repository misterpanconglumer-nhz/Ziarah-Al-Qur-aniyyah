export type PaymentStatus = 'Belum Bayar' | 'Cicilan' | 'Lunas';

export type DuplicateStatus = 'none' | 'unreviewed' | 'confirmed_different' | 'confirmed_duplicate';

export interface Jamaah {
  id: string; // Unique ID (e.g. JM-0001)
  name: string;
  phone: string;
  rombongan_id: string;
  rombongan_name?: string;
  bill_amount: number; // Nominal tagihan (default e.g. Rp 175.000)
  total_paid: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  bus_id?: string;
  bus_name?: string;
  seat_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  duplicate_status?: DuplicateStatus;
  duplicate_of_id?: string;
}

export interface Rombongan {
  id: string; // e.g. RMB-01
  name: string;
  coordinator_name: string;
  coordinator_phone?: string;
  bus_id?: string;
  bus_name?: string;
  total_members?: number;
  notes?: string;
  created_at: string;
}

export interface BusStaff {
  id: string;
  bus_id: string;
  name: string;
  phone?: string;
  role: 'tour_leader' | 'pembimbing';
  seat_number?: string;
  jamaah_id?: string; // Jika staf juga terdaftar sebagai jamaah
  notes?: string;
}

export interface Bus {
  id: string; // e.g. BUS-01
  name: string; // e.g. Bus 01
  operator: string; // e.g. Blue Star / Pariwisata
  bus_type: string; // e.g. Jetbus 5 SHD
  capacity: number; // e.g. 59 or 60
  status: 'active' | 'standby' | 'full';
  notes?: string;
  created_at: string;
  staff?: BusStaff[];
}

export type SeatRole = 'empty' | 'jamaah' | 'tour_leader' | 'pembimbing' | 'driver' | 'door' | 'facility';

export interface BusSeat {
  id: string;
  bus_id: string;
  seat_number: string;
  row_num: number;
  col_num: number;
  role: SeatRole;
  occupant_id?: string; // ID jamaah atau staf
  occupant_name?: string;
  occupant_role_label?: string;
}

export interface BusLayoutConfig {
  id: string;
  bus_id: string;
  total_rows: number;
  total_cols: number; // usually 4 or 5 (2-2 or 2-3 layout)
  driver_position: { row: number; col: number };
  front_door_position: { row: number; col: number };
  back_door_position?: { row: number; col: number };
  toilet_position?: { row: number; col: number };
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  jamaah_id: string;
  jamaah_name?: string;
  date: string;
  amount: number;
  payment_method: 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Lainnya';
  reference_number?: string;
  notes?: string;
  status: 'valid' | 'cancelled'; // pembatalan tercatat & void
  cancelled_reason?: string;
  cancelled_at?: string;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  name: string;
  category: 'Transportasi' | 'Konsumsi' | 'Penginapan' | 'Retribusi & Ziarah' | 'Perlengkapan' | 'Kesehatan' | 'Lain-lain';
  volume: number;
  unit: string; // e.g. Bus, Pcs, Paket
  unit_price: number;
  total_budget: number;
  notes?: string;
  created_at: string;
}

export interface ExpenseTransaction {
  id: string;
  budget_item_id?: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  receipt_ref?: string;
  notes?: string;
  status: 'valid' | 'cancelled';
  cancelled_reason?: string;
  created_at: string;
}

export interface ActivitySettings {
  id: string;
  activity_name: string;
  activity_year: string;
  default_bill_amount: number; // e.g. 175000
  target_participants: number;
  notes?: string;
  updated_at: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: 'exact' | 'similar' | 'phone_match' | 'none';
  similarityPercentage: number;
  matchedWith?: Jamaah;
  reason: string;
}
