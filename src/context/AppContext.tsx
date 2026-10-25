import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Jamaah,
  Rombongan,
  Bus,
  BusSeat,
  BusStaff,
  PaymentTransaction,
  BudgetItem,
  ExpenseTransaction,
  ActivitySettings,
  DuplicateStatus,
  DuplicateCheckResult
} from '../types';
import { supabase, isSupabaseConfigured, checkDatabaseConnection, DatabaseStatusInfo } from '../lib/supabase';
import {
  DEMO_SETTINGS,
  DEMO_BUSES,
  DEMO_ROMBONGAN,
  DEMO_JAMAAH,
  DEMO_PAYMENTS,
  DEMO_BUDGET,
  DEMO_EXPENSES,
  generateDefaultSeatsForBus
} from '../services/demoData';
import { checkDuplicateName } from '../utils/duplicateDetection';

interface ToastInfo {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppContextType {
  // Database status
  isOnlineDb: boolean;
  dbStatusInfo: DatabaseStatusInfo;
  refreshDbStatus: () => Promise<void>;

  // Auth (Single Admin)
  isAuthenticated: boolean;
  adminEmail: string;
  loginAdmin: (passOrToken: string, email?: string) => Promise<{ success: boolean; message: string }>;
  logoutAdmin: () => void;
  changeAdminPassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;

  // Settings
  settings: ActivitySettings;
  updateSettings: (newSettings: Partial<ActivitySettings>) => Promise<void>;

  // Data Collections
  jamaahList: Jamaah[];
  rombonganList: Rombongan[];
  busesList: Bus[];
  paymentsList: PaymentTransaction[];
  budgetList: BudgetItem[];
  expensesList: ExpenseTransaction[];
  busSeatsMap: Record<string, BusSeat[]>; // busId -> seats array

  // CRUD Jamaah
  addJamaah: (jamaahData: Omit<Jamaah, 'id' | 'total_paid' | 'remaining_amount' | 'payment_status' | 'created_at' | 'updated_at'>, initialPayment?: number) => Promise<{ success: boolean; jamaah?: Jamaah; error?: string }>;
  updateJamaah: (id: string, updates: Partial<Jamaah>) => Promise<{ success: boolean; error?: string }>;
  deleteJamaah: (id: string) => Promise<{ success: boolean; error?: string }>;
  bulkImportJamaah: (rows: any[]) => Promise<{ totalRead: number; successful: number; failed: number; duplicates: number }>;
  resolveDuplicateStatus: (jamaahId: string, status: DuplicateStatus) => Promise<void>;

  // CRUD Rombongan
  addRombongan: (data: Omit<Rombongan, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateRombongan: (id: string, updates: Partial<Rombongan>) => Promise<{ success: boolean; error?: string }>;
  deleteRombongan: (id: string) => Promise<{ success: boolean; error?: string }>;

  // CRUD Bus & Staff
  addBus: (data: Omit<Bus, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updateBus: (id: string, updates: Partial<Bus>) => Promise<{ success: boolean; error?: string }>;
  deleteBus: (id: string) => Promise<{ success: boolean; error?: string }>;
  assignBusStaff: (busId: string, staff: Omit<BusStaff, 'id'>) => Promise<void>;
  removeBusStaff: (busId: string, staffId: string) => Promise<void>;

  // Seat Assignments & Bus Layout (Row & Column)
  getSeatsForBus: (busId: string) => BusSeat[];
  assignSeat: (busId: string, seatNumber: string, occupantId: string, occupantName: string, role?: 'jamaah' | 'tour_leader' | 'pembimbing') => Promise<{ success: boolean; error?: string }>;
  freeSeat: (busId: string, seatNumber: string) => Promise<{ success: boolean; error?: string }>;
  saveCustomBusLayout: (busId: string, seats: BusSeat[]) => Promise<void>;
  updateBusLayoutDimensions: (busId: string, totalRows: number, totalCols: number) => Promise<{ success: boolean; newSeatsCount: number }>;

  // Payments
  addPayment: (data: Omit<PaymentTransaction, 'id' | 'status' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  voidPayment: (paymentId: string, reason: string) => Promise<{ success: boolean; error?: string }>;

  // Budget & Expenses
  addBudgetItem: (data: Omit<BudgetItem, 'id' | 'created_at'>) => Promise<void>;
  updateBudgetItem: (id: string, updates: Partial<BudgetItem>) => Promise<void>;
  deleteBudgetItem: (id: string) => Promise<void>;
  addExpense: (data: Omit<ExpenseTransaction, 'id' | 'status' | 'created_at'>) => Promise<void>;
  voidExpense: (expenseId: string, reason: string) => Promise<void>;

  // Global Toasts
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Database status
  const [dbStatusInfo, setDbStatusInfo] = useState<DatabaseStatusInfo>({
    status: isSupabaseConfigured ? 'checking' : 'not_configured',
    message: isSupabaseConfigured
      ? 'Memeriksa koneksi Supabase...'
      : 'Supabase Belum Dikonfigurasi. Menampilkan DATA DEMO.'
  });

  const isOnlineDb = dbStatusInfo.status === 'connected';

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ziarah_admin_auth') === 'true';
  });
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    return localStorage.getItem('ziarah_admin_email') || 'bendahara@ziarah2027.id';
  });

  // Business entities
  const [settings, setSettings] = useState<ActivitySettings>(DEMO_SETTINGS);
  const [jamaahList, setJamaahList] = useState<Jamaah[]>(DEMO_JAMAAH);
  const [rombonganList, setRombonganList] = useState<Rombongan[]>(DEMO_ROMBONGAN);
  const [busesList, setBusesList] = useState<Bus[]>(DEMO_BUSES);
  const [paymentsList, setPaymentsList] = useState<PaymentTransaction[]>(DEMO_PAYMENTS);
  const [budgetList, setBudgetList] = useState<BudgetItem[]>(DEMO_BUDGET);
  const [expensesList, setExpensesList] = useState<ExpenseTransaction[]>(DEMO_EXPENSES);

  // Seat layout cache
  const [busSeatsMap, setBusSeatsMap] = useState<Record<string, BusSeat[]>>(() => {
    const initialSeats: Record<string, BusSeat[]> = {};
    DEMO_BUSES.forEach(b => {
      const generated = generateDefaultSeatsForBus(b.id, b.capacity);
      // Pre-assign demo occupants
      if (b.id === 'BUS-01') {
        const j1 = generated.find(s => s.seat_number === '2A');
        if (j1) {
          j1.role = 'jamaah';
          j1.occupant_id = 'JM-0001';
          j1.occupant_name = 'Ahmad Fauzi Rahman';
          j1.occupant_role_label = 'Jamaah (Majelis Al-Ikhlas)';
        }
        const j2 = generated.find(s => s.seat_number === '2B');
        if (j2) {
          j2.role = 'jamaah';
          j2.occupant_id = 'JM-0002';
          j2.occupant_name = 'Siti Maryam';
          j2.occupant_role_label = 'Jamaah (Majelis Al-Ikhlas)';
        }
        const j3 = generated.find(s => s.seat_number === '3A');
        if (j3) {
          j3.role = 'jamaah';
          j3.occupant_id = 'JM-0003';
          j3.occupant_name = 'Putri Kamilah';
          j3.occupant_role_label = 'Jamaah (Keluarga H. Ridwan)';
        }
      }
      initialSeats[b.id] = generated;
    });
    return initialSeats;
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Check DB on mount
  const refreshDbStatus = async () => {
    const status = await checkDatabaseConnection();
    setDbStatusInfo(status);
    if (status.status === 'connected' && supabase) {
      showToast('Terhubung ke database online Supabase', 'success');
      loadSupabaseData();
    }
  };

  const loadSupabaseData = async () => {
    if (!supabase) return;
    try {
      // 1. Settings
      const { data: stg } = await supabase.from('activity_settings').select('*').single();
      if (stg) setSettings(stg);

      // 2. Buses & Staff
      const { data: buses } = await supabase.from('buses').select('*, staff:bus_staff_assignments(*)');
      if (buses) setBusesList(buses);

      // 3. Rombongan
      const { data: rombongan } = await supabase.from('rombongan').select('*');
      if (rombongan) setRombonganList(rombongan);

      // 4. Jamaah
      const { data: jm } = await supabase.from('jamaah').select('*');
      if (jm) setJamaahList(jm);

      // 5. Payments
      const { data: pm } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      if (pm) setPaymentsList(pm);

      // 6. Budget & Expenses
      const { data: bg } = await supabase.from('budget_items').select('*');
      if (bg) setBudgetList(bg);
      const { data: exp } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (exp) setExpensesList(exp);
    } catch (e) {
      console.error('Error loading Supabase data:', e);
    }
  };

  useEffect(() => {
    refreshDbStatus();
  }, []);

  // Auth handling
  const loginAdmin = async (passOrToken: string, email: string = 'bendahara@ziarah2027.id') => {
    // If Supabase Auth is enabled
    if (isOnlineDb && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: passOrToken
      });
      if (error) {
        return { success: false, message: error.message };
      }
      setIsAuthenticated(true);
      setAdminEmail(data.user?.email || email);
      localStorage.setItem('ziarah_admin_auth', 'true');
      localStorage.setItem('ziarah_admin_email', data.user?.email || email);
      return { success: true, message: 'Berhasil masuk ke sistem.' };
    }

    // Default credential for admin in demo/setup mode
    const storedPass = localStorage.getItem('ziarah_admin_custom_password') || 'adminziarah2027';
    if (
      passOrToken.trim() === storedPass ||
      passOrToken.trim() === 'adminziarah2027' ||
      passOrToken.trim() === 'ziarah2027'
    ) {
      setIsAuthenticated(true);
      setAdminEmail(email || 'bendahara@ziarah2027.id');
      localStorage.setItem('ziarah_admin_auth', 'true');
      localStorage.setItem('ziarah_admin_email', email || 'bendahara@ziarah2027.id');
      return { success: true, message: 'Berhasil login sebagai Pengelola/Bendahara.' };
    }

    return { success: false, message: 'Kata sandi tidak valid. Silakan periksa kembali kata sandi admin Anda.' };
  };

  const changeAdminPassword = async (oldPass: string, newPass: string) => {
    if (newPass.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter!', 'warning');
      return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
    }

    // If online with Supabase Auth
    if (isOnlineDb && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) {
        showToast(`Gagal memperbarui kata sandi di Supabase: ${error.message}`, 'error');
        return { success: false, message: error.message };
      }
      showToast('Kata sandi admin Supabase berhasil diperbarui!', 'success');
      return { success: true, message: 'Kata sandi admin Supabase berhasil diperbarui.' };
    }

    // Local / Demo mode validation
    const storedPass = localStorage.getItem('ziarah_admin_custom_password') || 'adminziarah2027';
    if (oldPass !== storedPass && oldPass !== 'adminziarah2027') {
      showToast('Kata sandi lama tidak sesuai!', 'error');
      return { success: false, message: 'Kata sandi lama yang Anda masukkan salah.' };
    }

    localStorage.setItem('ziarah_admin_custom_password', newPass);
    showToast('Kata sandi admin berhasil diperbarui!', 'success');
    return { success: true, message: 'Kata sandi admin berhasil diperbarui.' };
  };

  const logoutAdmin = () => {
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setIsAuthenticated(false);
    localStorage.removeItem('ziarah_admin_auth');
    localStorage.removeItem('ziarah_admin_email');
    showToast('Anda telah keluar dari sesi admin.', 'info');
  };

  // Settings
  const updateSettings = async (newSettings: Partial<ActivitySettings>) => {
    const updated = { ...settings, ...newSettings, updated_at: new Date().toISOString() };
    setSettings(updated);
    if (isOnlineDb && supabase) {
      await supabase.from('activity_settings').upsert(updated);
    }
    showToast('Pengaturan kegiatan berhasil disimpan.', 'success');
  };

  // CRUD Jamaah
  const addJamaah = async (
    jamaahData: Omit<Jamaah, 'id' | 'total_paid' | 'remaining_amount' | 'payment_status' | 'created_at' | 'updated_at'>,
    initialPayment: number = 0
  ) => {
    // Generate sequential ID
    const count = jamaahList.length + 1;
    const newId = `JM-${String(count).padStart(4, '0')}`;
    const bill = jamaahData.bill_amount ?? settings.default_bill_amount;
    const paid = initialPayment || 0;
    const remaining = Math.max(0, bill - paid);
    const payment_status = paid >= bill ? 'Lunas' : paid > 0 ? 'Cicilan' : 'Belum Bayar';

    // Duplicate check
    const dupCheck = checkDuplicateName(jamaahData.name, jamaahData.phone, jamaahList);
    let duplicate_status: DuplicateStatus = 'none';
    let duplicate_of_id: string | undefined = undefined;

    if (dupCheck.isDuplicate) {
      duplicate_status = 'unreviewed';
      duplicate_of_id = dupCheck.matchedWith?.id;
    }

    // Resolve rombongan name
    const romb = rombonganList.find(r => r.id === jamaahData.rombongan_id);
    const bus = busesList.find(b => b.id === jamaahData.bus_id);

    const newJamaah: Jamaah = {
      ...jamaahData,
      id: newId,
      rombongan_name: romb?.name || jamaahData.rombongan_name,
      bus_name: bus?.name,
      bill_amount: bill,
      total_paid: paid,
      remaining_amount: remaining,
      payment_status,
      duplicate_status,
      duplicate_of_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('jamaah').insert(newJamaah);
      if (error) {
        showToast(`Gagal menyimpan jamaah ke Supabase: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setJamaahList(prev => [newJamaah, ...prev]);

    // If initial payment exists, record transaction
    if (paid > 0) {
      const trxId = `TRX-${String(paymentsList.length + 1).padStart(4, '0')}`;
      const newTrx: PaymentTransaction = {
        id: trxId,
        jamaah_id: newId,
        jamaah_name: newJamaah.name,
        date: new Date().toISOString().split('T')[0],
        amount: paid,
        payment_method: 'Tunai',
        reference_number: `INIT-${newId}`,
        notes: 'Pembayaran awal saat pendaftaran',
        status: 'valid',
        created_at: new Date().toISOString()
      };
      if (isOnlineDb && supabase) {
        await supabase.from('payments').insert(newTrx);
      }
      setPaymentsList(prev => [newTrx, ...prev]);
    }

    // Alert if duplicate
    if (dupCheck.isDuplicate) {
      showToast(`Peringatan Duplikasi: ${dupCheck.reason}`, 'warning');
    } else {
      showToast(`Jamaah ${newJamaah.name} berhasil ditambahkan!`, 'success');
    }

    return { success: true, jamaah: newJamaah };
  };

  const updateJamaah = async (id: string, updates: Partial<Jamaah>) => {
    const existing = jamaahList.find(j => j.id === id);
    if (!existing) return { success: false, error: 'Jamaah tidak ditemukan' };

    const bill = updates.bill_amount !== undefined ? updates.bill_amount : existing.bill_amount;
    const paid = updates.total_paid !== undefined ? updates.total_paid : existing.total_paid;
    const remaining = Math.max(0, bill - paid);
    const payment_status = paid >= bill ? 'Lunas' : paid > 0 ? 'Cicilan' : 'Belum Bayar';

    const updated: Jamaah = {
      ...existing,
      ...updates,
      bill_amount: bill,
      total_paid: paid,
      remaining_amount: remaining,
      payment_status,
      updated_at: new Date().toISOString()
    };

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('jamaah').update(updated).eq('id', id);
      if (error) {
        showToast(`Gagal update jamaah: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setJamaahList(prev => prev.map(j => j.id === id ? updated : j));
    showToast(`Data ${updated.name} berhasil diperbarui.`, 'success');
    return { success: true };
  };

  const deleteJamaah = async (id: string) => {
    const existing = jamaahList.find(j => j.id === id);
    if (!existing) return { success: false, error: 'Jamaah tidak ditemukan' };

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('jamaah').delete().eq('id', id);
      if (error) {
        showToast(`Gagal menghapus jamaah: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    // Also free seat if assigned
    if (existing.bus_id && existing.seat_number) {
      freeSeat(existing.bus_id, existing.seat_number);
    }

    setJamaahList(prev => prev.filter(j => j.id !== id));
    showToast(`Jamaah ${existing.name} telah dihapus.`, 'info');
    return { success: true };
  };

  const resolveDuplicateStatus = async (jamaahId: string, status: DuplicateStatus) => {
    await updateJamaah(jamaahId, { duplicate_status: status });
    showToast(`Status duplikasi diubah menjadi: ${status}`, 'info');
  };

  // Bulk Import
  const bulkImportJamaah = async (rows: any[]) => {
    let successful = 0;
    let failed = 0;
    let duplicates = 0;

    for (const row of rows) {
      if (!row.isValid) {
        failed++;
        continue;
      }

      // Check or create rombongan if needed
      let romb = rombonganList.find(r => r.name.toLowerCase() === row.rombonganName.toLowerCase());
      if (!romb) {
        const newRombId = `RMB-${String(rombonganList.length + 1).padStart(2, '0')}`;
        const newRomb: Rombongan = {
          id: newRombId,
          name: row.rombonganName,
          coordinator_name: 'Koordinator',
          total_members: 0,
          created_at: new Date().toISOString()
        };
        rombonganList.push(newRomb);
        setRombonganList([...rombonganList]);
        romb = newRomb;
      }

      const res = await addJamaah(
        {
          name: row.name,
          phone: row.phone,
          rombongan_id: romb.id,
          rombongan_name: romb.name,
          bill_amount: row.billAmount,
          notes: row.notes
        },
        row.initialPayment
      );

      if (res.success) {
        successful++;
        if (res.jamaah?.duplicate_status === 'unreviewed') {
          duplicates++;
        }
      } else {
        failed++;
      }
    }

    return {
      totalRead: rows.length,
      successful,
      failed,
      duplicates
    };
  };

  // CRUD Rombongan
  const addRombongan = async (data: Omit<Rombongan, 'id' | 'created_at'>) => {
    const id = `RMB-${String(rombonganList.length + 1).padStart(2, '0')}`;
    const newRomb: Rombongan = {
      ...data,
      id,
      created_at: new Date().toISOString()
    };

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('rombongan').insert(newRomb);
      if (error) {
        showToast(`Gagal menyimpan rombongan: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setRombonganList(prev => [...prev, newRomb]);
    showToast(`Rombongan ${newRomb.name} berhasil ditambahkan!`, 'success');
    return { success: true };
  };

  const updateRombongan = async (id: string, updates: Partial<Rombongan>) => {
    const existing = rombonganList.find(r => r.id === id);
    if (!existing) return { success: false, error: 'Rombongan tidak ditemukan' };

    const updated = { ...existing, ...updates };

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('rombongan').update(updated).eq('id', id);
      if (error) {
        showToast(`Gagal update rombongan: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setRombonganList(prev => prev.map(r => r.id === id ? updated : r));
    showToast(`Rombongan ${updated.name} berhasil diperbarui.`, 'success');
    return { success: true };
  };

  const deleteRombongan = async (id: string) => {
    // Check if any jamaah attached
    const attached = jamaahList.filter(j => j.rombongan_id === id);
    if (attached.length > 0) {
      showToast(`Tidak dapat menghapus: masih ada ${attached.length} jamaah dalam rombongan ini. Pindahkan jamaah terlebih dahulu.`, 'warning');
      return { success: false, error: 'Masih ada jamaah terdaftar di rombongan ini.' };
    }

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('rombongan').delete().eq('id', id);
      if (error) {
        showToast(`Gagal menghapus rombongan: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setRombonganList(prev => prev.filter(r => r.id !== id));
    showToast('Rombongan berhasil dihapus.', 'info');
    return { success: true };
  };

  // CRUD Bus & Staff
  const addBus = async (data: Omit<Bus, 'id' | 'created_at'>) => {
    const id = `BUS-${String(busesList.length + 1).padStart(2, '0')}`;
    const newBus: Bus = {
      ...data,
      id,
      created_at: new Date().toISOString(),
      staff: []
    };

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('buses').insert(newBus);
      if (error) {
        showToast(`Gagal menambah bus: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setBusesList(prev => [...prev, newBus]);
    // Generate default seat layout
    const initialSeats = generateDefaultSeatsForBus(id, newBus.capacity);
    setBusSeatsMap(prev => ({ ...prev, [id]: initialSeats }));

    showToast(`Bus ${newBus.name} (${newBus.capacity} Kursi) berhasil didaftarkan!`, 'success');
    return { success: true };
  };

  const updateBus = async (id: string, updates: Partial<Bus>) => {
    const existing = busesList.find(b => b.id === id);
    if (!existing) return { success: false, error: 'Bus tidak ditemukan' };

    const updated = { ...existing, ...updates };

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('buses').update(updated).eq('id', id);
      if (error) {
        showToast(`Gagal memperbarui bus: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setBusesList(prev => prev.map(b => b.id === id ? updated : b));
    showToast(`Informasi bus ${updated.name} berhasil diperbarui.`, 'success');
    return { success: true };
  };

  const deleteBus = async (id: string) => {
    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('buses').delete().eq('id', id);
      if (error) {
        showToast(`Gagal menghapus bus: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setBusesList(prev => prev.filter(b => b.id !== id));
    showToast('Bus berhasil dihapus.', 'info');
    return { success: true };
  };

  const assignBusStaff = async (busId: string, staffData: Omit<BusStaff, 'id'>) => {
    const newStaff: BusStaff = {
      ...staffData,
      id: `STF-${Math.random().toString(36).substring(2, 7)}`
    };

    setBusesList(prev => prev.map(b => {
      if (b.id === busId) {
        return { ...b, staff: [...(b.staff || []), newStaff] };
      }
      return b;
    }));

    showToast(`Petugas ${newStaff.name} ditetapkan untuk Bus.`, 'success');
  };

  const removeBusStaff = async (busId: string, staffId: string) => {
    setBusesList(prev => prev.map(b => {
      if (b.id === busId) {
        return { ...b, staff: (b.staff || []).filter(s => s.id !== staffId) };
      }
      return b;
    }));
    showToast('Petugas bus berhasil dihapus.', 'info');
  };

  // Seating Management
  const getSeatsForBus = (busId: string): BusSeat[] => {
    if (!busSeatsMap[busId]) {
      const bus = busesList.find(b => b.id === busId);
      const generated = generateDefaultSeatsForBus(busId, bus?.capacity || 59);
      setBusSeatsMap(prev => ({ ...prev, [busId]: generated }));
      return generated;
    }
    return busSeatsMap[busId];
  };

  const assignSeat = async (
    busId: string,
    seatNumber: string,
    occupantId: string,
    occupantName: string,
    role: 'jamaah' | 'tour_leader' | 'pembimbing' = 'jamaah'
  ) => {
    const currentSeats = getSeatsForBus(busId);

    // Rule: Cegah satu orang menempati 2 kursi sekaligus di bus manapun
    Object.keys(busSeatsMap).forEach(bId => {
      busSeatsMap[bId] = busSeatsMap[bId].map(seat => {
        if (seat.occupant_id === occupantId) {
          return {
            ...seat,
            role: 'empty',
            occupant_id: undefined,
            occupant_name: undefined,
            occupant_role_label: undefined
          };
        }
        return seat;
      });
    });

    // Assign to chosen seat
    const targetBus = busesList.find(b => b.id === busId);
    const updatedSeats = currentSeats.map(seat => {
      if (seat.seat_number === seatNumber) {
        return {
          ...seat,
          role,
          occupant_id: occupantId,
          occupant_name: occupantName,
          occupant_role_label: role === 'tour_leader' ? 'Tour Leader' : role === 'pembimbing' ? 'Pembimbing' : 'Jamaah'
        };
      }
      return seat;
    });

    setBusSeatsMap(prev => ({ ...prev, [busId]: updatedSeats }));

    // Also update jamaah record if role is jamaah
    if (role === 'jamaah') {
      await updateJamaah(occupantId, {
        bus_id: busId,
        bus_name: targetBus?.name,
        seat_number: seatNumber
      });
    }

    showToast(`Kursi ${seatNumber} di ${targetBus?.name} berhasil ditempati oleh ${occupantName}.`, 'success');
    return { success: true };
  };

  const freeSeat = async (busId: string, seatNumber: string) => {
    const currentSeats = getSeatsForBus(busId);
    let occupantIdToClear: string | undefined;

    const updatedSeats = currentSeats.map(seat => {
      if (seat.seat_number === seatNumber) {
        occupantIdToClear = seat.occupant_id;
        return {
          ...seat,
          role: 'empty' as const,
          occupant_id: undefined,
          occupant_name: undefined,
          occupant_role_label: undefined
        };
      }
      return seat;
    });

    setBusSeatsMap(prev => ({ ...prev, [busId]: updatedSeats }));

    if (occupantIdToClear) {
      const jm = jamaahList.find(j => j.id === occupantIdToClear);
      if (jm) {
        await updateJamaah(occupantIdToClear, {
          bus_id: undefined,
          bus_name: undefined,
          seat_number: undefined
        });
      }
    }

    showToast(`Kursi ${seatNumber} telah dikosongkan.`, 'info');
    return { success: true };
  };

  const saveCustomBusLayout = async (busId: string, seats: BusSeat[]) => {
    setBusSeatsMap(prev => ({ ...prev, [busId]: seats }));
    // Update bus capacity based on seats
    const passengerCapacity = seats.filter(s => s.role !== 'driver' && s.role !== 'door' && s.role !== 'facility').length;
    await updateBus(busId, { capacity: passengerCapacity });
    showToast(`Konfigurasi denah kursi bus berhasil disimpan (${passengerCapacity} kursi).`, 'success');
  };

  const updateBusLayoutDimensions = async (busId: string, totalRows: number, totalCols: number) => {
    const existingSeats = getSeatsForBus(busId);
    const existingOccupantsMap: Record<string, { role: any; occupant_id?: string; occupant_name?: string; occupant_role_label?: string }> = {};
    existingSeats.forEach(s => {
      if (s.occupant_id) {
        existingOccupantsMap[s.seat_number] = {
          role: s.role,
          occupant_id: s.occupant_id,
          occupant_name: s.occupant_name,
          occupant_role_label: s.occupant_role_label
        };
      }
    });

    const newSeats: BusSeat[] = [];

    // Row 1: Col 1 = Driver, Col 2 = TL, Col totalCols = Door, Col totalCols-1 = PB
    newSeats.push({
      id: `${busId}-R1-C1`,
      bus_id: busId,
      seat_number: 'SOPIR',
      row_num: 1,
      col_num: 1,
      role: 'driver',
      occupant_role_label: 'Sopir Bus'
    });

    const tlExisting = existingOccupantsMap['TL'];
    newSeats.push({
      id: `${busId}-R1-C2`,
      bus_id: busId,
      seat_number: 'TL',
      row_num: 1,
      col_num: 2,
      role: tlExisting?.role || 'tour_leader',
      occupant_id: tlExisting?.occupant_id,
      occupant_name: tlExisting?.occupant_name,
      occupant_role_label: tlExisting?.occupant_role_label || 'Tour Leader'
    });

    if (totalCols >= 4) {
      const pbExisting = existingOccupantsMap['PB'];
      newSeats.push({
        id: `${busId}-R1-C${totalCols - 1}`,
        bus_id: busId,
        seat_number: 'PB',
        row_num: 1,
        col_num: totalCols - 1,
        role: pbExisting?.role || 'pembimbing',
        occupant_id: pbExisting?.occupant_id,
        occupant_name: pbExisting?.occupant_name,
        occupant_role_label: pbExisting?.occupant_role_label || 'Pembimbing'
      });
    }

    newSeats.push({
      id: `${busId}-R1-C${totalCols}`,
      bus_id: busId,
      seat_number: 'PINTU',
      row_num: 1,
      col_num: totalCols,
      role: 'door',
      occupant_role_label: 'Pintu Masuk'
    });

    // Rows 2 to (totalRows - 1)
    let seatCounter = 1;
    for (let r = 2; r < totalRows; r++) {
      if (totalCols === 5) {
        // 2 - 2 with middle aisle (Col 3 empty space)
        ['A', 'B'].forEach((letter, idx) => {
          const seatNum = `${seatCounter}${letter}`;
          const ex = existingOccupantsMap[seatNum];
          newSeats.push({
            id: `${busId}-R${r}-C${idx + 1}`,
            bus_id: busId,
            seat_number: seatNum,
            row_num: r,
            col_num: idx + 1,
            role: ex?.role || 'empty',
            occupant_id: ex?.occupant_id,
            occupant_name: ex?.occupant_name,
            occupant_role_label: ex?.occupant_role_label
          });
        });

        ['C', 'D'].forEach((letter, idx) => {
          const seatNum = `${seatCounter}${letter}`;
          const ex = existingOccupantsMap[seatNum];
          newSeats.push({
            id: `${busId}-R${r}-C${idx + 4}`,
            bus_id: busId,
            seat_number: seatNum,
            row_num: r,
            col_num: idx + 4,
            role: ex?.role || 'empty',
            occupant_id: ex?.occupant_id,
            occupant_name: ex?.occupant_name,
            occupant_role_label: ex?.occupant_role_label
          });
        });
        seatCounter++;
      } else if (totalCols === 4) {
        // 2 - 2 layout: cols 1,2 and 3,4
        ['A', 'B'].forEach((letter, idx) => {
          const seatNum = `${seatCounter}${letter}`;
          const ex = existingOccupantsMap[seatNum];
          newSeats.push({
            id: `${busId}-R${r}-C${idx + 1}`,
            bus_id: busId,
            seat_number: seatNum,
            row_num: r,
            col_num: idx + 1,
            role: ex?.role || 'empty',
            occupant_id: ex?.occupant_id,
            occupant_name: ex?.occupant_name,
            occupant_role_label: ex?.occupant_role_label
          });
        });
        ['C', 'D'].forEach((letter, idx) => {
          const seatNum = `${seatCounter}${letter}`;
          const ex = existingOccupantsMap[seatNum];
          newSeats.push({
            id: `${busId}-R${r}-C${idx + 3}`,
            bus_id: busId,
            seat_number: seatNum,
            row_num: r,
            col_num: idx + 3,
            role: ex?.role || 'empty',
            occupant_id: ex?.occupant_id,
            occupant_name: ex?.occupant_name,
            occupant_role_label: ex?.occupant_role_label
          });
        });
        seatCounter++;
      } else {
        // Generic cols
        for (let c = 1; c <= totalCols; c++) {
          const seatNum = `${seatCounter}-${c}`;
          const ex = existingOccupantsMap[seatNum];
          newSeats.push({
            id: `${busId}-R${r}-C${c}`,
            bus_id: busId,
            seat_number: seatNum,
            row_num: r,
            col_num: c,
            role: ex?.role || 'empty',
            occupant_id: ex?.occupant_id,
            occupant_name: ex?.occupant_name,
            occupant_role_label: ex?.occupant_role_label
          });
        }
        seatCounter++;
      }
    }

    // Last row across: totalCols seats
    for (let c = 1; c <= totalCols; c++) {
      const seatNum = `BLKG-${c}`;
      const ex = existingOccupantsMap[seatNum];
      newSeats.push({
        id: `${busId}-R${totalRows}-C${c}`,
        bus_id: busId,
        seat_number: seatNum,
        row_num: totalRows,
        col_num: c,
        role: ex?.role || 'empty',
        occupant_id: ex?.occupant_id,
        occupant_name: ex?.occupant_name,
        occupant_role_label: ex?.occupant_role_label
      });
    }

    setBusSeatsMap(prev => ({ ...prev, [busId]: newSeats }));

    const passengerCount = newSeats.filter(s => s.role !== 'driver' && s.role !== 'door' && s.role !== 'facility').length;
    await updateBus(busId, { capacity: passengerCount });

    showToast(`Denah ${busId} diperbarui: ${totalRows} Baris × ${totalCols} Kolom (${passengerCount} Kursi)`, 'success');
    return { success: true, newSeatsCount: passengerCount };
  };

  // Payments
  const addPayment = async (data: Omit<PaymentTransaction, 'id' | 'status' | 'created_at'>) => {
    const newId = `TRX-${String(paymentsList.length + 1).padStart(4, '0')}`;
    const newTrx: PaymentTransaction = {
      ...data,
      id: newId,
      status: 'valid',
      created_at: new Date().toISOString()
    };

    if (isOnlineDb && supabase) {
      const { error } = await supabase.from('payments').insert(newTrx);
      if (error) {
        showToast(`Gagal mencatat transaksi: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    // Update jamaah's total paid
    const jm = jamaahList.find(j => j.id === data.jamaah_id);
    if (jm) {
      const newTotalPaid = jm.total_paid + data.amount;
      await updateJamaah(jm.id, {
        total_paid: newTotalPaid
      });
    }

    setPaymentsList(prev => [newTrx, ...prev]);
    showToast(`Pembayaran Rp ${data.amount.toLocaleString('id-ID')} berhasil dicatat!`, 'success');
    return { success: true };
  };

  const voidPayment = async (paymentId: string, reason: string) => {
    const existing = paymentsList.find(p => p.id === paymentId);
    if (!existing || existing.status === 'cancelled') return { success: false, error: 'Transaksi tidak valid' };

    const updatedTrx: PaymentTransaction = {
      ...existing,
      status: 'cancelled',
      cancelled_reason: reason,
      cancelled_at: new Date().toISOString()
    };

    if (isOnlineDb && supabase) {
      await supabase.from('payments').update(updatedTrx).eq('id', paymentId);
    }

    // Recalculate jamaah's balance
    const jm = jamaahList.find(j => j.id === existing.jamaah_id);
    if (jm) {
      const newTotalPaid = Math.max(0, jm.total_paid - existing.amount);
      await updateJamaah(jm.id, {
        total_paid: newTotalPaid
      });
    }

    setPaymentsList(prev => prev.map(p => p.id === paymentId ? updatedTrx : p));
    showToast(`Transaksi ${paymentId} telah DIBATALKAN (VOID). Jejak transaksi tetap dicatat.`, 'warning');
    return { success: true };
  };

  // Budget & Expenses
  const addBudgetItem = async (data: Omit<BudgetItem, 'id' | 'created_at'>) => {
    const id = `BDG-${String(budgetList.length + 1).padStart(2, '0')}`;
    const newItem: BudgetItem = {
      ...data,
      id,
      created_at: new Date().toISOString()
    };
    if (isOnlineDb && supabase) {
      await supabase.from('budget_items').insert(newItem);
    }
    setBudgetList(prev => [...prev, newItem]);
    showToast(`Pos anggaran "${newItem.name}" ditambahkan.`, 'success');
  };

  const updateBudgetItem = async (id: string, updates: Partial<BudgetItem>) => {
    const existing = budgetList.find(b => b.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    if (isOnlineDb && supabase) {
      await supabase.from('budget_items').update(updated).eq('id', id);
    }
    setBudgetList(prev => prev.map(b => b.id === id ? updated : b));
    showToast(`Pos anggaran "${updated.name}" diperbarui.`, 'success');
  };

  const deleteBudgetItem = async (id: string) => {
    if (isOnlineDb && supabase) {
      await supabase.from('budget_items').delete().eq('id', id);
    }
    setBudgetList(prev => prev.filter(b => b.id !== id));
    showToast('Pos anggaran berhasil dihapus.', 'info');
  };

  const addExpense = async (data: Omit<ExpenseTransaction, 'id' | 'status' | 'created_at'>) => {
    const id = `EXP-${String(expensesList.length + 1).padStart(4, '0')}`;
    const newExp: ExpenseTransaction = {
      ...data,
      id,
      status: 'valid',
      created_at: new Date().toISOString()
    };
    if (isOnlineDb && supabase) {
      await supabase.from('expenses').insert(newExp);
    }
    setExpensesList(prev => [newExp, ...prev]);
    showToast(`Pengeluaran "${newExp.title}" sebesar Rp ${newExp.amount.toLocaleString('id-ID')} dicatat!`, 'success');
  };

  const voidExpense = async (expenseId: string, reason: string) => {
    const existing = expensesList.find(e => e.id === expenseId);
    if (!existing) return;
    const updated: ExpenseTransaction = {
      ...existing,
      status: 'cancelled',
      cancelled_reason: reason
    };
    if (isOnlineDb && supabase) {
      await supabase.from('expenses').update(updated).eq('id', expenseId);
    }
    setExpensesList(prev => prev.map(e => e.id === expenseId ? updated : e));
    showToast(`Pengeluaran ${expenseId} telah DIBATALKAN (VOID).`, 'warning');
  };

  return (
    <AppContext.Provider
      value={{
        isOnlineDb,
        dbStatusInfo,
        refreshDbStatus,
        isAuthenticated,
        adminEmail,
        loginAdmin,
        logoutAdmin,
        changeAdminPassword,
        settings,
        updateSettings,
        jamaahList,
        rombonganList,
        busesList,
        paymentsList,
        budgetList,
        expensesList,
        busSeatsMap,
        addJamaah,
        updateJamaah,
        deleteJamaah,
        bulkImportJamaah,
        resolveDuplicateStatus,
        addRombongan,
        updateRombongan,
        deleteRombongan,
        addBus,
        updateBus,
        deleteBus,
        assignBusStaff,
        removeBusStaff,
        getSeatsForBus,
        assignSeat,
        freeSeat,
        saveCustomBusLayout,
        updateBusLayoutDimensions,
        addPayment,
        voidPayment,
        addBudgetItem,
        updateBudgetItem,
        deleteBudgetItem,
        addExpense,
        voidExpense,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
