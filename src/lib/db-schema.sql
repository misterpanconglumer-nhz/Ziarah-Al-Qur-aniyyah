-- ==============================================================================
-- SKEMA DATABASE LENGKAP: ZIARAH AKBAR AL-QUR'ANIYYAH 2027
-- PostgreSQL + Supabase dengan Row Level Security (RLS) & Indexes Skala 3.000 Peserta
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ACTIVITY SETTINGS (Pengaturan Global Kegiatan & Biaya Default)
CREATE TABLE IF NOT EXISTS activity_settings (
  id TEXT PRIMARY KEY DEFAULT 'current_settings',
  activity_name TEXT NOT NULL DEFAULT 'Ziarah Akbar Al-Qur''aniyyah 2027',
  activity_year TEXT NOT NULL DEFAULT '2027',
  default_bill_amount NUMERIC NOT NULL DEFAULT 175000,
  target_participants INTEGER NOT NULL DEFAULT 3000,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inisialisasi baris pengaturan default jika belum ada
INSERT INTO activity_settings (id, activity_name, activity_year, default_bill_amount, target_participants)
VALUES ('current_settings', 'Ziarah Akbar Al-Qur''aniyyah 2027', '2027', 175000, 3000)
ON CONFLICT (id) DO NOTHING;

-- 3. BUSES (Data Bus & Operator)
CREATE TABLE IF NOT EXISTS buses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'Blue Star',
  bus_type TEXT NOT NULL DEFAULT 'Executive Jetbus 5',
  capacity INTEGER NOT NULL DEFAULT 59,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'standby', 'full')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ROMBONGAN (Data Kelompok / Majelis / Keluarga)
CREATE TABLE IF NOT EXISTS rombongan (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  coordinator_name TEXT NOT NULL DEFAULT 'Koordinator',
  coordinator_phone TEXT,
  bus_id TEXT REFERENCES buses(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. BUS STAFF ASSIGNMENTS (Tour Leader & Pembimbing per Bus)
CREATE TABLE IF NOT EXISTS bus_staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('tour_leader', 'pembimbing')),
  seat_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. BUS LAYOUT & SEATS CONFIGURATION
CREATE TABLE IF NOT EXISTS bus_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id TEXT NOT NULL UNIQUE REFERENCES buses(id) ON DELETE CASCADE,
  total_rows INTEGER NOT NULL DEFAULT 12,
  total_cols INTEGER NOT NULL DEFAULT 5,
  driver_row INTEGER NOT NULL DEFAULT 1,
  driver_col INTEGER NOT NULL DEFAULT 1,
  door_row INTEGER NOT NULL DEFAULT 1,
  door_col INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS bus_seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id TEXT NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  row_num INTEGER NOT NULL,
  col_num INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'empty' CHECK (role IN ('empty', 'jamaah', 'tour_leader', 'pembimbing', 'driver', 'door', 'facility')),
  occupant_id TEXT,
  occupant_name TEXT,
  occupant_role_label TEXT,
  CONSTRAINT unique_bus_seat_position UNIQUE (bus_id, row_num, col_num),
  CONSTRAINT unique_bus_seat_number UNIQUE (bus_id, seat_number)
);

-- 7. JAMAAH (Data Peserta Utama)
CREATE TABLE IF NOT EXISTS jamaah (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  rombongan_id TEXT NOT NULL REFERENCES rombongan(id) ON DELETE RESTRICT,
  bill_amount NUMERIC NOT NULL DEFAULT 175000,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 175000,
  payment_status TEXT NOT NULL DEFAULT 'Belum Bayar' CHECK (payment_status IN ('Belum Bayar', 'Cicilan', 'Lunas')),
  bus_id TEXT REFERENCES buses(id) ON DELETE SET NULL,
  seat_number TEXT,
  notes TEXT,
  duplicate_status TEXT NOT NULL DEFAULT 'none' CHECK (duplicate_status IN ('none', 'unreviewed', 'confirmed_different', 'confirmed_duplicate')),
  duplicate_of_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. PAYMENTS (Catatan Transaksi Pembayaran Jamaah)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  jamaah_id TEXT NOT NULL REFERENCES jamaah(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'Tunai' CHECK (payment_method IN ('Tunai', 'Transfer Bank', 'QRIS', 'Lainnya')),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'cancelled')),
  cancelled_reason TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. BUDGET ITEMS (Rencana Anggaran Biaya Operasional)
CREATE TABLE IF NOT EXISTS budget_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Transportasi', 'Konsumsi', 'Penginapan', 'Retribusi & Ziarah', 'Perlengkapan', 'Kesehatan', 'Lain-lain')),
  volume NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_budget NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. EXPENSES (Realisasi Pengeluaran Kas Aktual)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  budget_item_id TEXT REFERENCES budget_items(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  receipt_ref TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'cancelled')),
  cancelled_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. AUDIT LOGS (Jejak Rekam Pembatalan & Perubahan Krusial)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  details JSONB,
  admin_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXING UNTUK KINERJA TINGGI (3.000+ JAMAAH & PULUHAN BUS)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_jamaah_name ON jamaah (name);
CREATE INDEX IF NOT EXISTS idx_jamaah_phone ON jamaah (phone);
CREATE INDEX IF NOT EXISTS idx_jamaah_rombongan ON jamaah (rombongan_id);
CREATE INDEX IF NOT EXISTS idx_jamaah_bus ON jamaah (bus_id);
CREATE INDEX IF NOT EXISTS idx_jamaah_payment_status ON jamaah (payment_status);

CREATE INDEX IF NOT EXISTS idx_payments_jamaah ON payments (jamaah_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (date);

CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) KEAMANAN DATA
-- ==============================================================================
ALTER TABLE activity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rombongan ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamaah ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin terautentikasi (authenticated role) memiliki akses penuh
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename IN (
      'activity_settings', 'buses', 'rombongan', 'bus_staff_assignments',
      'bus_layouts', 'bus_seats', 'jamaah', 'payments', 'budget_items',
      'expenses', 'audit_logs'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin Full Access Policy" ON %I;', tbl);
    EXECUTE format('CREATE POLICY "Admin Full Access Policy" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END
$$;
