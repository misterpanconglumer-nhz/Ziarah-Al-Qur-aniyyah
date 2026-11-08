import { sanitizeBudgetCategory } from '../utils/excel';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Jamaah,
  Rombongan,
  Bus,
  BusSeat,
  BusStaff,
  PaymentTransaction,
  RombonganPaymentTransaction,
  RombonganPaymentStatus,
  RombonganFinancialSummary,
  BudgetItem,
  ExpenseTransaction,
  ActivitySettings,
  DuplicateStatus,
  DuplicateCheckResult,
  SeatRole,
  PaymentReceipt
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
  DEMO_ROMBONGAN_PAYMENTS,
  generateDefaultSeatsForBus,
  generate59StandardSeats
} from '../services/demoData';
import { checkDuplicateName } from '../utils/duplicateDetection';
import { sortBusesNaturally } from '../utils/formatters';

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
  updateSettings: (newSettings: Partial<ActivitySettings>, options?: { silent?: boolean }) => Promise<void>;

  // Data Collections
  jamaahList: Jamaah[];
  rombonganList: Rombongan[];
  busesList: Bus[];
  paymentsList: PaymentTransaction[];
  rombonganPaymentsList: RombonganPaymentTransaction[];
  budgetList: BudgetItem[];
  expensesList: ExpenseTransaction[];
  busSeatsMap: Record<string, BusSeat[]>; // busId -> seats array

  // CRUD Jamaah
  addJamaah: (
    jamaahData: Omit<Jamaah, 'id' | 'total_paid' | 'remaining_amount' | 'payment_status' | 'created_at' | 'updated_at'>,
    initialPayment?: number,
    initialPaymentDetails?: {
      method?: PaymentTransaction['payment_method'];
      reference?: string;
      notes?: string;
    }
  ) => Promise<{ success: boolean; jamaah?: Jamaah; error?: string }>;
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

  // Standalone Receipts / Kwitansi Pembayaran (Terpisah dari laporan utama)
  receiptsList: PaymentReceipt[];
  addReceipt: (data: Omit<PaymentReceipt, 'id' | 'receipt_number' | 'created_at'>) => Promise<PaymentReceipt>;
  updateReceipt: (id: string, data: Partial<PaymentReceipt>) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  generateNextReceiptNumber: () => string;

  // Anti-Double Seat & Seat Transfer
  moveJamaahSeat: (jamaahId: string, toBusId: string, toSeatNumber: string) => Promise<{ success: boolean; message: string }>;
  getJamaahSeatAssignment: (jamaahId: string) => { busId?: string; busName?: string; seatNumber?: string } | null;

  // Seat Assignments & Bus Layout (Row & Column)
  getSeatsForBus: (busId: string) => BusSeat[];
  assignSeat: (busId: string, seatNumber: string, occupantId: string, occupantName: string, role?: 'jamaah' | 'tour_leader' | 'pembimbing', options?: { allowMove?: boolean }) => Promise<{ success: boolean; error?: string; existingBusName?: string; existingSeatNumber?: string }>;
  freeSeat: (busId: string, seatNumber: string) => Promise<{ success: boolean; error?: string }>;
  saveCustomBusLayout: (busId: string, seats: BusSeat[]) => Promise<void>;
  updateBusLayoutDimensions: (busId: string, totalRows: number, totalCols: number) => Promise<{ success: boolean; newSeatsCount: number }>;
  standardizeBusTo59Seats: (busId: string) => Promise<void>;

  // Payments
  addPayment: (data: Omit<PaymentTransaction, 'id' | 'status' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  updatePayment: (paymentId: string, data: Partial<Pick<PaymentTransaction, 'payment_method' | 'reference_number' | 'notes' | 'date' | 'amount'>>) => Promise<{ success: boolean; error?: string }>;
  voidPayment: (paymentId: string, reason: string) => Promise<{ success: boolean; error?: string }>;

  // Rombongan Collective Payments
  addRombonganPayment: (data: Omit<RombonganPaymentTransaction, 'id' | 'created_at'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateRombonganPayment: (id: string, updates: Partial<RombonganPaymentTransaction>) => Promise<{ success: boolean; error?: string }>;
  voidRombonganPayment: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  deleteRombonganPayment: (id: string) => Promise<{ success: boolean; error?: string }>;
  getRombonganFinancialSummary: (rombonganId: string) => RombonganFinancialSummary;

  // Budget & Expenses
  addBudgetItem: (data: Omit<BudgetItem, 'id' | 'created_at'>) => Promise<void>;
  updateBudgetItem: (id: string, updates: Partial<BudgetItem>) => Promise<void>;
  deleteBudgetItem: (id: string) => Promise<void>;
  bulkImportBudget: (items: Omit<BudgetItem, 'id' | 'created_at'>[]) => Promise<{ success: boolean; count: number; error?: string }>;
  syncFleetAndBudget: (totalBuses: number, seatsPerBus: number, extraSettings?: Partial<ActivitySettings>) => Promise<{ success: boolean; targetParticipants: number }>;
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

  // LocalStorage Cache for Instant Load & Stale-While-Revalidate
  const cachedData = useMemo(() => {
    try {
      const raw = localStorage.getItem('ziarah_cache_data_v1');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }, []);

  // Business entities initialized from cache if available, otherwise DEMO
  const [settings, setSettings] = useState<ActivitySettings>(() => {
    if (cachedData?.settings) {
      const s = { ...cachedData.settings };
      if (s.notes && typeof s.notes === 'string' && s.notes.startsWith('{')) {
        try {
          const p = JSON.parse(s.notes);
          if (p.total_buses && !s.total_buses) s.total_buses = Number(p.total_buses);
          if (p.seats_per_bus && !s.seats_per_bus) s.seats_per_bus = Number(p.seats_per_bus);
        } catch {}
      }
      return s;
    }
    return DEMO_SETTINGS;
  });
  const [jamaahList, setJamaahList] = useState<Jamaah[]>(() => cachedData?.jamaah || DEMO_JAMAAH);
  const [rombonganList, setRombonganList] = useState<Rombongan[]>(() => cachedData?.rombongan || DEMO_ROMBONGAN);
  const [busesList, setBusesList] = useState<Bus[]>(() => cachedData?.buses || DEMO_BUSES);
  const [paymentsList, setPaymentsList] = useState<PaymentTransaction[]>(() => cachedData?.payments || DEMO_PAYMENTS);
  const [rombonganPaymentsList, setRombonganPaymentsList] = useState<RombonganPaymentTransaction[]>(() => cachedData?.rombonganPayments || DEMO_ROMBONGAN_PAYMENTS);
  const [budgetList, setBudgetList] = useState<BudgetItem[]>(() => cachedData?.budget || DEMO_BUDGET);
  const [expensesList, setExpensesList] = useState<ExpenseTransaction[]>(() => cachedData?.expenses || DEMO_EXPENSES);

  // Seat layout cache
  // Standalone Receipts state (completely isolated from main payments & expenses)
  const [receiptsList, setReceiptsList] = useState<PaymentReceipt[]>(() => {
    try {
      const cached = localStorage.getItem('ziarah_payment_receipts_v1');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

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

  // High-Speed Parallel Data Loading with Promise.all
  const loadSupabaseData = async () => {
    if (!supabase) return;
    try {
      const [
        stgRes,
        busesRes,
        rombonganRes,
        jmRes,
        pmRes,
        bgRes,
        expRes
      ] = await Promise.all([
        supabase.from('activity_settings').select('*').single(),
        supabase.from('buses').select('*, staff:bus_staff_assignments(*)'),
        supabase.from('rombongan').select('*'),
        supabase.from('jamaah').select('*'),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('budget_items').select('*'),
        supabase.from('expenses').select('*').order('created_at', { ascending: false })
      ]);

      const buses = sortBusesNaturally(busesRes.data || []);
      if (busesRes.data) setBusesList(buses);

      let currentSettings: ActivitySettings = stgRes.data || settings;
      if (stgRes.data) {
        currentSettings = { ...stgRes.data };
        if (stgRes.data.notes && typeof stgRes.data.notes === 'string' && stgRes.data.notes.startsWith('{')) {
          try {
            const parsedNotes = JSON.parse(stgRes.data.notes);
            if (parsedNotes.total_buses) currentSettings.total_buses = Number(parsedNotes.total_buses);
            if (parsedNotes.seats_per_bus) currentSettings.seats_per_bus = Number(parsedNotes.seats_per_bus);
          } catch {}
        }
        if (!currentSettings.total_buses && buses.length > 0) {
          currentSettings.total_buses = buses.length;
        }
        if (!currentSettings.seats_per_bus && buses.length > 0 && buses[0].capacity) {
          currentSettings.seats_per_bus = buses[0].capacity;
        }
        setSettings(currentSettings);
      }

      const rombongan = rombonganRes.data || [];
      if (rombonganRes.data) setRombonganList(rombongan);

      const rawJamaah = jmRes.data || [];
      const rombMap = new Map(rombongan.map(r => [r.id, r.name]));
      const busMap = new Map(buses.map(b => [b.id, b.name]));

      const enrichedJamaah: Jamaah[] = rawJamaah.map(j => ({
        ...j,
        rombongan_name: rombMap.get(j.rombongan_id) || j.rombongan_name || 'Umum',
        bus_name: j.bus_id ? (busMap.get(j.bus_id) || j.bus_name) : undefined
      }));
      if (jmRes.data) setJamaahList(enrichedJamaah);

      const jmMap = new Map(enrichedJamaah.map(j => [j.id, j.name]));
      const enrichedPayments: PaymentTransaction[] = (pmRes.data || []).map(p => ({
        ...p,
        jamaah_name: jmMap.get(p.jamaah_id) || p.jamaah_name
      }));
      if (pmRes.data) setPaymentsList(enrichedPayments);

      if (bgRes.data) setBudgetList(bgRes.data);
      if (expRes.data) setExpensesList(expRes.data);


      // Load rombongan payments
      let loadedRpy: RombonganPaymentTransaction[] = [];
      try {
        const rpyRes = await supabase.from('rombongan_payments').select('*').order('created_at', { ascending: false });
        if (!rpyRes.error && rpyRes.data) {
          loadedRpy = rpyRes.data;
        } else {
          const auditRpy = await supabase
            .from('audit_logs')
            .select('*')
            .eq('table_name', 'rombongan_payments')
            .order('created_at', { ascending: false });
          if (auditRpy.data && auditRpy.data.length > 0) {
            const auditMap = new Map<string, RombonganPaymentTransaction>();
            auditRpy.data.forEach(log => {
              if (log.details && log.record_id && !auditMap.has(log.record_id)) {
                if (log.action !== 'DELETE') {
                  auditMap.set(log.record_id, log.details as RombonganPaymentTransaction);
                }
              }
            });
            loadedRpy = Array.from(auditMap.values());
          }
        }
        if (loadedRpy.length > 0 || !rpyRes.error) {
          const enrichedRpy: RombonganPaymentTransaction[] = loadedRpy.map(rpy => ({
            ...rpy,
            rombongan_name: rombMap.get(rpy.rombongan_id) || rpy.rombongan_name
          }));
          setRombonganPaymentsList(enrichedRpy);
        }
      } catch (err) {
        console.warn('Error loading rombongan_payments:', err);
      }

      // Load receipts from dedicated Supabase table if available, or fallback to activity_settings.notes
      if (isOnlineDb && supabase) {
        try {
          const { data: recData, error: recErr } = await supabase.from('payment_receipts').select('*').order('created_at', { ascending: false });
          if (!recErr && recData && recData.length > 0) {
            setReceiptsList(recData);
            try { localStorage.setItem('ziarah_payment_receipts_v1', JSON.stringify(recData)); } catch {}
          } else if (stgRes.data?.notes) {
            try {
              const parsed = JSON.parse(stgRes.data.notes);
              if (Array.isArray(parsed.saved_receipts)) {
                setReceiptsList(parsed.saved_receipts);
                try { localStorage.setItem('ziarah_payment_receipts_v1', JSON.stringify(parsed.saved_receipts)); } catch {}
              }
            } catch {}
          }
        } catch {}

      }

      // Synchronize busSeatsMap with jamaah & staff assignments
      setBusSeatsMap(prevMap => {
        const newMap: Record<string, BusSeat[]> = { ...prevMap };
        buses.forEach(b => {
          let seats = newMap[b.id];
          if (!seats || seats.length === 0) {
            seats = generateDefaultSeatsForBus(b.id, b.capacity || 59);
          }
          const busJamaah = enrichedJamaah.filter(j => j.bus_id === b.id && j.seat_number);

          seats = seats.map(seat => {
            const matchedJamaah = busJamaah.find(
              j => j.seat_number === seat.seat_number ||
                   j.seat_number?.replace(/^SEAT\s*/i, '') === seat.seat_number.replace(/^SEAT\s*/i, '')
            );
            if (matchedJamaah) {
              return {
                ...seat,
                role: 'jamaah' as SeatRole,
                occupant_id: matchedJamaah.id,
                occupant_name: matchedJamaah.name,
                occupant_role_label: `Jamaah (${matchedJamaah.rombongan_name || 'Umum'})`
              };
            }
            if (seat.role === 'jamaah' && seat.occupant_id) {
              const stillThere = busJamaah.some(j => j.id === seat.occupant_id);
              if (!stillThere) {
                return {
                  ...seat,
                  role: 'empty' as SeatRole,
                  occupant_id: undefined,
                  occupant_name: undefined,
                  occupant_role_label: undefined
                };
              }
            }
            return seat;
          });
          newMap[b.id] = seats;
        });
        return newMap;
      });

      // Persist to local cache for instant zero-lag reload
      try {
        localStorage.setItem('ziarah_cache_data_v1', JSON.stringify({
          settings: currentSettings,
          buses,
          rombongan,
          jamaah: enrichedJamaah,
          payments: enrichedPayments,
          budget: bgRes.data,
          expenses: expRes.data,
          rombonganPayments: loadedRpy,
          timestamp: Date.now()
        }));
      } catch {}

      setDbStatusInfo({
        status: 'connected',
        message: 'Database Supabase PostgreSQL Terhubung & Siap Operasional.',
        url: import.meta.env.VITE_SUPABASE_URL
      });
    } catch (e: any) {
      console.error('Error loading Supabase data:', e);
      setDbStatusInfo({
        status: 'connection_error',
        message: `Gagal memuat data Supabase: ${e?.message || e}`,
        url: import.meta.env.VITE_SUPABASE_URL
      });
    }
  };

  // Check DB status and load data concurrently
  const refreshDbStatus = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await loadSupabaseData();
  };

  useEffect(() => {
    refreshDbStatus();
  }, []);

  // Auth handling
  const loginAdmin = async (passOrToken: string, email: string = 'bendahara@ziarah2027.id') => {
    const inputPass = passOrToken.trim();
    const storedPass = localStorage.getItem('ziarah_admin_custom_password');
    let dbPass: string | null = null;
    try {
      if (settings?.notes && typeof settings.notes === 'string' && settings.notes.startsWith('{')) {
        const parsed = JSON.parse(settings.notes);
        if (parsed?.admin_password) dbPass = parsed.admin_password;
      }
    } catch {
      // not JSON format
    }

    // 1. Verify against application Admin Passwords (default or custom)
    const isValidPass =
      inputPass === 'adminziarah2027' ||
      inputPass === 'ziarah2027' ||
      (Boolean(storedPass) && inputPass === storedPass) ||
      (Boolean(dbPass) && inputPass === dbPass);

    if (isValidPass) {
      setIsAuthenticated(true);
      setAdminEmail(email || 'bendahara@ziarah2027.id');
      localStorage.setItem('ziarah_admin_auth', 'true');
      localStorage.setItem('ziarah_admin_email', email || 'bendahara@ziarah2027.id');
      return { success: true, message: 'Berhasil login sebagai Pengelola/Bendahara.' };
    }

    // 2. If user configured a dedicated Supabase Auth user in Supabase Dashboard
    if (isOnlineDb && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: passOrToken
        });
        if (!error && data?.user) {
          setIsAuthenticated(true);
          setAdminEmail(data.user.email || email);
          localStorage.setItem('ziarah_admin_auth', 'true');
          localStorage.setItem('ziarah_admin_email', data.user.email || email);
          return { success: true, message: 'Berhasil masuk ke sistem.' };
        }
      } catch {
        // Continue to friendly error
      }
    }

    return {
      success: false,
      message: 'Kata sandi tidak valid. Silakan gunakan kata sandi admin standar (adminziarah2027).'
    };
  };

  const changeAdminPassword = async (oldPass: string, newPass: string) => {
    if (newPass.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter!', 'warning');
      return { success: false, message: 'Kata sandi baru minimal 6 karakter.' };
    }

    const storedPass = localStorage.getItem('ziarah_admin_custom_password');
    let dbPass: string | null = null;
    try {
      if (settings?.notes && typeof settings.notes === 'string' && settings.notes.startsWith('{')) {
        const parsed = JSON.parse(settings.notes);
        if (parsed?.admin_password) dbPass = parsed.admin_password;
      }
    } catch {
      // not JSON format
    }

    const isOldValid =
      oldPass.trim() === 'adminziarah2027' ||
      oldPass.trim() === 'ziarah2027' ||
      (Boolean(storedPass) && oldPass.trim() === storedPass) ||
      (Boolean(dbPass) && oldPass.trim() === dbPass);

    if (!isOldValid) {
      showToast('Kata sandi lama tidak sesuai!', 'error');
      return { success: false, message: 'Kata sandi lama yang Anda masukkan salah.' };
    }

    // Save locally in current browser
    localStorage.setItem('ziarah_admin_custom_password', newPass);

    // Sync to Supabase activity_settings.notes if online so all devices stay updated
    if (isOnlineDb && supabase) {
      try {
        let existingNotesObj: Record<string, any> = {};
        try {
          if (settings?.notes && settings.notes.startsWith('{')) {
            existingNotesObj = JSON.parse(settings.notes);
          }
        } catch {}
        const updatedNotes = JSON.stringify({ ...existingNotesObj, admin_password: newPass });
        await supabase
          .from('activity_settings')
          .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
          .eq('id', 'current_settings');
        setSettings(prev => ({ ...prev, notes: updatedNotes }));
      } catch (err) {
        console.warn('Gagal sinkronisasi password ke Supabase:', err);
      }

      // If there's an active Supabase Auth session, update it as well
      try {
        await supabase.auth.updateUser({ password: newPass });
      } catch {
        // Ignore if no Supabase Auth session
      }
    }

    showToast('Kata sandi Admin berhasil diperbarui!', 'success');
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
  const updateSettings = async (newSettings: Partial<ActivitySettings>, options?: { silent?: boolean }) => {
    let notesObj: Record<string, any> = {};
    try {
      if (settings?.notes && typeof settings.notes === 'string' && settings.notes.startsWith('{')) {
        notesObj = JSON.parse(settings.notes);
      }
    } catch {}

    if (newSettings.total_buses !== undefined) notesObj.total_buses = Number(newSettings.total_buses);
    if (newSettings.seats_per_bus !== undefined) notesObj.seats_per_bus = Number(newSettings.seats_per_bus);

    const mergedNotes = JSON.stringify(notesObj);

    const updated: ActivitySettings = { 
      ...settings, 
      ...newSettings, 
      notes: mergedNotes,
      updated_at: new Date().toISOString() 
    };

    setSettings(updated);

    // Save to local cache
    try {
      const cacheStr = localStorage.getItem('ziarah_cache_data_v1');
      if (cacheStr) {
        const c = JSON.parse(cacheStr);
        c.settings = updated;
        localStorage.setItem('ziarah_cache_data_v1', JSON.stringify(c));
      }
    } catch {}

    if (isOnlineDb && supabase) {
      const dbPayload = {
        id: 'current_settings',
        activity_name: updated.activity_name || "Ziarah Akbar Al-Qur'aniyyah 2027",
        activity_year: updated.activity_year || "2027",
        default_bill_amount: Number(updated.default_bill_amount) || 185000,
        target_participants: Number(updated.target_participants) || 1225,
        notes: mergedNotes,
        updated_at: updated.updated_at
      };

      const { error } = await supabase.from('activity_settings').upsert(dbPayload);
      if (error) {
        console.error('Error updating activity_settings in Supabase:', error);
      }
    }

    if (!options?.silent) {
      showToast('Pengaturan kegiatan berhasil disimpan.', 'success');
    }
  };

  // CRUD Jamaah
  const addJamaah = async (
    jamaahData: Omit<Jamaah, 'id' | 'total_paid' | 'remaining_amount' | 'payment_status' | 'created_at' | 'updated_at'>,
    initialPayment: number = 0,
    initialPaymentDetails?: {
      method?: PaymentTransaction['payment_method'];
      reference?: string;
      notes?: string;
    }
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
      // Strip virtual joined fields before sending to Supabase
      const { rombongan_name, bus_name, ...jamaahDbPayload } = newJamaah;
      const { error } = await supabase.from('jamaah').insert(jamaahDbPayload);
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
        payment_method: initialPaymentDetails?.method || 'Tunai',
        reference_number: initialPaymentDetails?.reference || `INIT-${newId}`,
        notes: initialPaymentDetails?.notes || 'Pembayaran awal saat pendaftaran',
        status: 'valid',
        created_at: new Date().toISOString()
      };
      if (isOnlineDb && supabase) {
        const { jamaah_name, ...pmDbPayload } = newTrx;
        await supabase.from('payments').insert(pmDbPayload);
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
      // Strip virtual joined fields before sending to Supabase
      const { rombongan_name, bus_name, ...rawDbPayload } = updated;
      const jamaahDbPayload: Record<string, any> = {
        ...rawDbPayload,
        // Ensure null is explicitly passed to Supabase when bus_id or seat_number is cleared
        bus_id: (updates.bus_id === undefined && 'bus_id' in updates) || !updated.bus_id ? null : updated.bus_id,
        seat_number: (updates.seat_number === undefined && 'seat_number' in updates) || !updated.seat_number ? null : updated.seat_number
      };
      const { error } = await supabase.from('jamaah').update(jamaahDbPayload).eq('id', id);
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
        if (isOnlineDb && supabase) {
          const { bus_name, total_members, ...rombDbPayload } = newRomb;
          await supabase.from('rombongan').insert(rombDbPayload);
        }
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
      const { bus_name, total_members, ...rombDbPayload } = newRomb;
      const { error } = await supabase.from('rombongan').insert(rombDbPayload);
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
      const { bus_name, total_members, ...rombDbPayload } = updated;
      const { error } = await supabase.from('rombongan').update(rombDbPayload).eq('id', id);
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
      const { staff, ...busDbPayload } = newBus;
      const { error } = await supabase.from('buses').insert(busDbPayload);
      if (error) {
        showToast(`Gagal menambah bus: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    setBusesList(prev => sortBusesNaturally([...prev, newBus]));
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
      const { staff, ...busDbPayload } = updated;
      const { error } = await supabase.from('buses').update(busDbPayload).eq('id', id);
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
    role: 'jamaah' | 'tour_leader' | 'pembimbing' = 'jamaah',
    options?: { allowMove?: boolean }
  ) => {
    const currentSeats = getSeatsForBus(busId);
    const targetBus = busesList.find(b => b.id === busId);
    const normSeatNumber = seatNumber.replace(/^SEAT\s*/i, '').trim();

    // 1. VALIDASI KURSI: Kursi yang sudah terisi tidak dapat dipilih kembali oleh orang lain
    const existingOccupantInTargetSeat = currentSeats.find(s => {
      const sNorm = s.seat_number.replace(/^SEAT\s*/i, '').trim();
      return (s.seat_number === seatNumber || sNorm === normSeatNumber) &&
             s.occupant_id && s.occupant_id !== occupantId &&
             s.role !== 'empty';
    });

    if (existingOccupantInTargetSeat) {
      const msg = 'Kursi ini sudah ditempati peserta lain. Silakan pilih kursi yang masih tersedia.';
      showToast(msg, 'error');
      return { success: false, error: msg };
    }

    // 2. VALIDASI PESERTA: Setiap peserta hanya dapat memiliki satu seat aktif
    if (!options?.allowMove && role === 'jamaah') {
      const existingAssignment = getJamaahSeatAssignment(occupantId);
      if (existingAssignment && existingAssignment.seatNumber) {
        const isSameSeat = existingAssignment.busId === busId &&
          (existingAssignment.seatNumber === seatNumber || existingAssignment.seatNumber.replace(/^SEAT\s*/i, '').trim() === normSeatNumber);

        if (!isSameSeat) {
          const msg = `Peserta ini sudah mendapatkan kursi pada ${existingAssignment.busName} - ${existingAssignment.seatNumber}. Silakan periksa kembali data penempatan kursi.`;
          showToast(msg, 'warning');
          return {
            success: false,
            error: msg,
            existingBusName: existingAssignment.busName,
            existingSeatNumber: existingAssignment.seatNumber
          };
        }
      }
    }

    // Kosongkan kursi lama peserta di bus lain jika allowMove aktif
    Object.keys(busSeatsMap).forEach(bId => {
      if (bId !== busId || options?.allowMove) {
        busSeatsMap[bId] = busSeatsMap[bId].map(seat => {
          if (seat.occupant_id === occupantId) {
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
      }
    });

    // Assign to chosen seat
    let matched = false;
    let updatedSeats = currentSeats.map(seat => {
      const sNorm = seat.seat_number.replace(/^SEAT\s*/i, '').trim();
      const match = seat.seat_number === seatNumber || sNorm === normSeatNumber;
      if (match) {
        matched = true;
        return {
          ...seat,
          seat_number: seatNumber,
          role,
          occupant_id: occupantId,
          occupant_name: occupantName,
          occupant_role_label: role === 'tour_leader' ? 'Tour Leader' : role === 'pembimbing' ? 'Pembimbing' : 'Jamaah'
        };
      }
      return seat;
    });

    if (!matched) {
      updatedSeats = [
        ...updatedSeats,
        {
          id: `${busId}-${seatNumber.replace(/\s+/g, '-')}`,
          bus_id: busId,
          seat_number: seatNumber,
          row_num: 1,
          col_num: 1,
          role,
          occupant_id: occupantId,
          occupant_name: occupantName,
          occupant_role_label: role === 'tour_leader' ? 'Tour Leader' : role === 'pembimbing' ? 'Pembimbing' : 'Jamaah'
        }
      ];
    }

    setBusSeatsMap(prev => ({ ...prev, [busId]: updatedSeats }));

    // Update data jamaah di database
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
    const normSeatNumber = seatNumber.replace(/^SEAT\s*/i, '').trim();

    const updatedSeats = currentSeats.map(seat => {
      const sNorm = seat.seat_number.replace(/^SEAT\s*/i, '').trim();
      const match = seat.seat_number === seatNumber || sNorm === normSeatNumber;
      if (match) {
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

    // 1. Direct persistent clear in Supabase PostgreSQL
    if (isOnlineDb && supabase) {
      try {
        if (occupantIdToClear) {
          await supabase.from('jamaah').update({
            bus_id: null,
            seat_number: null,
            updated_at: new Date().toISOString()
          }).eq('id', occupantIdToClear);
        }

        // Also proactively clear any jamaah assigned to this exact bus and seat
        await supabase.from('jamaah').update({
          bus_id: null,
          seat_number: null,
          updated_at: new Date().toISOString()
        })
        .eq('bus_id', busId)
        .or(`seat_number.eq.${seatNumber},seat_number.eq.${normSeatNumber},seat_number.eq.SEAT ${normSeatNumber}`);

        // Clear staff if any
        await supabase.from('bus_staff_assignments').delete()
          .eq('bus_id', busId)
          .eq('seat_number', seatNumber);
      } catch (err) {
        console.error('Error clearing seat in Supabase:', err);
      }
    }

    // 2. Clear in in-memory state
    setJamaahList(prev => prev.map(j => {
      const jNorm = (j.seat_number || '').replace(/^SEAT\s*/i, '').trim();
      const isThisSeat = j.bus_id === busId && (j.seat_number === seatNumber || jNorm === normSeatNumber);
      if (j.id === occupantIdToClear || isThisSeat) {
        return {
          ...j,
          bus_id: undefined,
          bus_name: undefined,
          seat_number: undefined,
          updated_at: new Date().toISOString()
        };
      }
      return j;
    }));

    // 3. Clear in localStorage cache
    try {
      const cacheStr = localStorage.getItem('ziarah_cache_data_v1');
      if (cacheStr) {
        const c = JSON.parse(cacheStr);
        if (Array.isArray(c.jamaah)) {
          c.jamaah = c.jamaah.map((j: any) => {
            const jNorm = (j.seat_number || '').replace(/^SEAT\s*/i, '').trim();
            const isThisSeat = j.bus_id === busId && (j.seat_number === seatNumber || jNorm === normSeatNumber);
            if (j.id === occupantIdToClear || isThisSeat) {
              return { ...j, bus_id: null, bus_name: null, seat_number: null };
            }
            return j;
          });
          localStorage.setItem('ziarah_cache_data_v1', JSON.stringify(c));
        }
      }
    } catch {}

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

  const standardizeBusTo59Seats = async (busId: string) => {
    const existing = getSeatsForBus(busId);
    const new59Seats = generate59StandardSeats(busId, existing);
    setBusSeatsMap(prev => ({ ...prev, [busId]: new59Seats }));
    await updateBus(busId, { capacity: 59 });
    showToast(`Denah ${busId} berhasil distandarisasi ke format 59 Kursi Resmi (2-3)`, 'success');
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
      const { jamaah_name, ...pmDbPayload } = newTrx;
      const { error } = await supabase.from('payments').insert(pmDbPayload);
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

  const updatePayment = async (
    paymentId: string, 
    data: Partial<Pick<PaymentTransaction, 'payment_method' | 'reference_number' | 'notes' | 'date' | 'amount'>>
  ) => {
    const existing = paymentsList.find(p => p.id === paymentId);
    if (!existing) return { success: false, error: 'Transaksi tidak ditemukan' };

    // If amount changed and transaction was valid, adjust jamaah total_paid
    if (data.amount !== undefined && data.amount !== existing.amount && existing.status === 'valid') {
      const diff = data.amount - existing.amount;
      const jm = jamaahList.find(j => j.id === existing.jamaah_id);
      if (jm) {
        await updateJamaah(jm.id, {
          total_paid: Math.max(0, jm.total_paid + diff)
        });
      }
    }

    const updatedTrx: PaymentTransaction = {
      ...existing,
      ...data
    };

    if (isOnlineDb && supabase) {
      const { jamaah_name, ...pmDbPayload } = updatedTrx;
      await supabase.from('payments').update(pmDbPayload).eq('id', paymentId);
    }

    setPaymentsList(prev => prev.map(p => p.id === paymentId ? updatedTrx : p));
    showToast('Metode / data pembayaran berhasil diperbarui!', 'success');
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
      const { jamaah_name, ...pmDbPayload } = updatedTrx;
      await supabase.from('payments').update(pmDbPayload).eq('id', paymentId);
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
  // Rombongan Collective Payments Implementation
  const getRombonganFinancialSummary = (rombonganId: string): RombonganFinancialSummary => {
    const romb = rombonganList.find(r => r.id === rombonganId) || {
      id: rombonganId,
      name: 'Rombongan',
      coordinator_name: 'Koordinator',
      created_at: new Date().toISOString()
    };
    const members = jamaahList.filter(j => j.rombongan_id === rombonganId);
    const totalMembers = members.length;
    const defaultBill = settings.default_bill_amount || 185000;
    const feePerJamaah = romb.fee_per_jamaah || (totalMembers > 0 ? (members[0].bill_amount || defaultBill) : defaultBill);
    const totalBill = totalMembers > 0 ? members.reduce((sum, j) => sum + (j.bill_amount || feePerJamaah), 0) : 0;
    const validPayments = rombonganPaymentsList.filter(p => p.rombongan_id === rombonganId && p.status === 'valid');
    const totalPaid = validPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remainingBill = Math.max(0, totalBill - totalPaid);
    const percentagePaid = totalBill > 0 ? Math.min(100, Math.round((totalPaid / totalBill) * 100)) : (totalPaid > 0 ? 100 : 0);

    let paymentStatus: RombonganPaymentStatus = 'Belum Bayar';
    if (totalPaid === 0) {
      paymentStatus = 'Belum Bayar';
    } else if (totalPaid > totalBill && totalBill > 0) {
      paymentStatus = 'Kelebihan Bayar';
    } else if (totalPaid >= totalBill && totalBill > 0) {
      paymentStatus = 'Lunas';
    } else {
      paymentStatus = 'Cicilan';
    }

    return {
      rombongan: romb,
      totalMembers,
      memberCount: totalMembers,
      feePerJamaah,
      totalBill,
      totalPaid,
      remainingBill,
      percentagePaid,
      percentage: percentagePaid,
      paymentStatus,
      status: paymentStatus.toUpperCase(),
      validPaymentsCount: validPayments.length
    };
  };

  const addRombonganPayment = async (data: Omit<RombonganPaymentTransaction, 'id' | 'created_at'>) => {
    const id = `RPY-${String(rombonganPaymentsList.length + 1).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const romb = rombonganList.find(r => r.id === data.rombongan_id);
    const newPayment: RombonganPaymentTransaction = {
      ...data,
      id,
      rombongan_name: romb?.name || data.rombongan_name,
      status: data.status || 'valid',
      created_at: now
    };

    setRombonganPaymentsList(prev => [newPayment, ...prev]);

    try {
      const cacheRaw = localStorage.getItem('ziarah_cache_data_v1');
      const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
      cache.rombonganPayments = [newPayment, ...(cache.rombonganPayments || [])];
      localStorage.setItem('ziarah_cache_data_v1', JSON.stringify(cache));
    } catch {}

    if (isOnlineDb && supabase) {
      try {
        const { rombongan_name, ...dbPayload } = newPayment;
        await supabase.from('rombongan_payments').insert([dbPayload]);
      } catch (err) {
        console.warn('Direct insert rombongan_payments failed:', err);
      }
      try {
        await supabase.from('audit_logs').insert([{
          action: 'INSERT',
          table_name: 'rombongan_payments',
          record_id: id,
          details: newPayment
        }]);
      } catch {}
    }

    showToast(`Setoran Rp ${newPayment.amount.toLocaleString('id-ID')} untuk ${newPayment.rombongan_name || 'Rombongan'} berhasil dicatat!`, 'success');
    return { success: true, id };
  };

  const updateRombonganPayment = async (id: string, updates: Partial<RombonganPaymentTransaction>) => {
    const updated = { ...updates, updated_at: new Date().toISOString() };
    setRombonganPaymentsList(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));

    try {
      const cacheRaw = localStorage.getItem('ziarah_cache_data_v1');
      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        cache.rombonganPayments = (cache.rombonganPayments || []).map((p: any) => p.id === id ? { ...p, ...updated } : p);
        localStorage.setItem('ziarah_cache_data_v1', JSON.stringify(cache));
      }
    } catch {}

    if (isOnlineDb && supabase) {
      try {
        const { rombongan_name, ...dbPayload } = updated;
        await supabase.from('rombongan_payments').update(dbPayload).eq('id', id);
      } catch {}
      try {
        await supabase.from('audit_logs').insert([{
          action: 'UPDATE',
          table_name: 'rombongan_payments',
          record_id: id,
          details: updated
        }]);
      } catch {}
    }

    showToast('Data setoran rombongan berhasil diperbarui.', 'success');
    return { success: true };
  };

  const voidRombonganPayment = async (id: string, reason: string = 'Dibatalkan oleh admin') => {
    return updateRombonganPayment(id, {
      status: 'cancelled',
      cancelled_reason: reason,
      cancelled_at: new Date().toISOString()
    });
  };

  const deleteRombonganPayment = async (id: string) => {
    setRombonganPaymentsList(prev => prev.filter(p => p.id !== id));

    try {
      const cacheRaw = localStorage.getItem('ziarah_cache_data_v1');
      if (cacheRaw) {
        const cache = JSON.parse(cacheRaw);
        cache.rombonganPayments = (cache.rombonganPayments || []).filter((p: any) => p.id !== id);
        localStorage.setItem('ziarah_cache_data_v1', JSON.stringify(cache));
      }
    } catch {}

    if (isOnlineDb && supabase) {
      try {
        await supabase.from('rombongan_payments').delete().eq('id', id);
      } catch {}
      try {
        await supabase.from('audit_logs').insert([{
          action: 'DELETE',
          table_name: 'rombongan_payments',
          record_id: id,
          details: { deleted_at: new Date().toISOString() }
        }]);
      } catch {}
    }

    showToast('Transaksi setoran rombongan berhasil dihapus.', 'info');
    return { success: true };
  };

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

  const bulkImportBudget = async (items: Omit<BudgetItem, 'id' | 'created_at'>[]) => {
    const timestamp = Date.now();
    const preparedItems: BudgetItem[] = items.map((item, idx) => ({
      id: `BDG-${String(idx + 1).padStart(3, '0')}`,
      name: item.name,
      category: sanitizeBudgetCategory(item.category),
      volume: Number(item.volume) || 1,
      unit: item.unit || 'Unit',
      unit_price: Number(item.unit_price) || 0,
      total_budget: Number(item.total_budget) || (Number(item.volume) * Number(item.unit_price)),
      notes: item.notes || '',
      created_at: new Date(timestamp + idx * 100).toISOString()
    }));

    if (isOnlineDb && supabase) {
      try {
        // Delete all existing budget items first to ensure clean state
        await supabase.from('budget_items').delete().gte('id', '');
        const { error } = await supabase.from('budget_items').insert(preparedItems);
        if (error) {
          console.error('Supabase bulk insert error:', error);
          throw error;
        }
      } catch (err: any) {
        console.error('Failed to save budget items to Supabase:', err);
        showToast(`Gagal menyimpan ke database online: ${err.message}`, 'error');
        throw err;
      }
    }

    setBudgetList(preparedItems);

    // Save to localStorage cache so refresh retains the data instantly
    try {
      const cacheRaw = localStorage.getItem('ziarah_cache_data_v1');
      const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
      cache.budget = preparedItems;
      cache.timestamp = Date.now();
      localStorage.setItem('ziarah_cache_data_v1', JSON.stringify(cache));
    } catch {}

    showToast(`Berhasil menyimpan ${preparedItems.length} pos anggaran ke sistem & database online!`, 'success');
    return { success: true, count: preparedItems.length };
  };

  const syncFleetAndBudget = async (
    totalBuses: number, 
    seatsPerBus: number, 
    extraSettings?: Partial<ActivitySettings>
  ) => {
    const newTarget = extraSettings?.target_participants ?? (totalBuses * seatsPerBus);

    // 1. Update settings
    const settingsPayload: Partial<ActivitySettings> = {
      total_buses: totalBuses,
      seats_per_bus: seatsPerBus,
      target_participants: newTarget,
      ...extraSettings
    };
    await updateSettings(settingsPayload, { silent: true });

    // 2. Adjust busesList
    // Always sort naturally first so we don't accidentally slice the wrong buses!
    const sortedBuses = sortBusesNaturally([...busesList]);
    let updatedBuses: Bus[] = [...sortedBuses];

    if (updatedBuses.length < totalBuses) {
      // Need to add missing buses
      const toAdd = totalBuses - updatedBuses.length;
      const newBusesToInsert: Bus[] = [];
      for (let i = 0; i < toAdd; i++) {
        const busNum = updatedBuses.length + 1;
        const busId = `BUS-${String(busNum).padStart(2, '0')}`;
        const newBus: Bus = {
          id: busId,
          name: `Bus ${String(busNum).padStart(2, '0')}`,
          operator: 'Blue Star',
          bus_type: 'Executive Jetbus 5',
          capacity: seatsPerBus,
          status: 'active',
          created_at: new Date().toISOString()
        };
        updatedBuses.push(newBus);
        newBusesToInsert.push(newBus);
      }
      if (isOnlineDb && supabase && newBusesToInsert.length > 0) {
        try {
          await supabase.from('buses').upsert(newBusesToInsert);
        } catch (e) {
          console.error('Error inserting new buses into Supabase:', e);
        }
      }
    } else if (updatedBuses.length > totalBuses) {
      // Need to remove excess buses (e.g. Bus 36-40 when reducing 40 -> 35)
      const excessBuses = updatedBuses.slice(totalBuses);
      const excessIds = excessBuses.map(b => b.id);
      updatedBuses = updatedBuses.slice(0, totalBuses);

      if (isOnlineDb && supabase && excessIds.length > 0) {
        // Unassign jamaah from excess buses
        try {
          await supabase.from('jamaah').update({ bus_id: null, bus_name: null, seat_number: null }).in('bus_id', excessIds);
        } catch (e) {
          console.warn('Error unassigning jamaah from excess buses:', e);
        }
        // Unassign staff
        try {
          await supabase.from('bus_staff_assignments').delete().in('bus_id', excessIds);
        } catch (e) {}
        // Delete excess buses in bulk
        try {
          await supabase.from('buses').delete().in('id', excessIds);
        } catch (e) {
          console.error('Error deleting excess buses:', e);
        }
      }
    }

    // Update capacity of all retained buses
    updatedBuses = sortBusesNaturally(updatedBuses.map(b => ({ ...b, capacity: seatsPerBus })));
    setBusesList(updatedBuses);

    if (isOnlineDb && supabase && updatedBuses.length > 0) {
      try {
        const busUpsertPayload = updatedBuses.map(b => ({
          id: b.id,
          name: b.name,
          operator: b.operator || 'Blue Star',
          bus_type: b.bus_type || 'Executive Jetbus 5',
          capacity: seatsPerBus,
          status: b.status || 'active'
        }));
        await supabase.from('buses').upsert(busUpsertPayload);
      } catch (err) {
        console.warn('Upsert buses capacity failed, falling back to iterative update:', err);
        for (const b of updatedBuses) {
          try {
            await supabase.from('buses').update({ capacity: seatsPerBus }).eq('id', b.id);
          } catch {}
        }
      }
    }

    // 3. Adjust budget items that depend on bus count
    let updatedCount = 0;
    const itemsToUpdateInDb: BudgetItem[] = [];
    const newBudgetList = budgetList.map(b => {
      const u = (b.unit || '').toLowerCase();
      const n = (b.name || '').toLowerCase();
      const isBusUnit = u.includes('bus') || 
                        n.includes('sewa bus') || 
                        n.includes('toll') || 
                        n.includes('tol') || 
                        n.includes('tips') || 
                        n.includes('parkir') || 
                        n.includes('doorprize bus') || 
                        n.includes('cetak no bus') ||
                        n.includes('tour leader') ||
                        n.includes('koordinator') ||
                        n.includes('asisten koordinator');

      if (isBusUnit && b.volume !== totalBuses) {
        updatedCount++;
        const newTotal = totalBuses * b.unit_price;
        const updatedItem = {
          ...b,
          volume: totalBuses,
          total_budget: newTotal
        };
        itemsToUpdateInDb.push(updatedItem);
        return updatedItem;
      }

      // Check snack or participant box
      const isSnackItem = n.includes('snack') && u.includes('box');
      if (isSnackItem && b.volume !== newTarget) {
        updatedCount++;
        const newTotal = newTarget * b.unit_price;
        const updatedItem = {
          ...b,
          volume: newTarget,
          total_budget: newTotal
        };
        itemsToUpdateInDb.push(updatedItem);
        return updatedItem;
      }

      return b;
    });

    setBudgetList(newBudgetList);

    if (isOnlineDb && supabase && itemsToUpdateInDb.length > 0) {
      try {
        const { error } = await supabase.from('budget_items').upsert(itemsToUpdateInDb);
        if (error) {
          console.warn('Budget items upsert returned error, falling back to iterative update:', error);
          for (const b of itemsToUpdateInDb) {
            try {
              await supabase.from('budget_items').update({
                volume: b.volume,
                total_budget: b.total_budget
              }).eq('id', b.id);
            } catch {}
          }
        }
      } catch (err) {
        console.error('Error saving updated budget items to Supabase:', err);
      }
    }

    // 4. Update cache
    try {
      const cacheStr = localStorage.getItem('ziarah_cache_data_v1');
      if (cacheStr) {
        const c = JSON.parse(cacheStr);
        c.settings = { 
          ...c.settings, 
          ...settingsPayload,
          total_buses: totalBuses, 
          seats_per_bus: seatsPerBus, 
          target_participants: newTarget 
        };
        c.buses = updatedBuses;
        c.budget = newBudgetList;
        localStorage.setItem('ziarah_cache_data_v1', JSON.stringify(c));
      }
    } catch {}

    showToast(`Sinkronisasi berhasil! ${totalBuses} Bus (@${seatsPerBus} kursi), target ${newTarget.toLocaleString('id-ID')} peserta, dan ${updatedCount} pos anggaran bus diperbarui permanen di database.`, 'success');
    return { success: true, targetParticipants: newTarget };
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


  // =========================================================================
  // STANDALONE RECEIPTS / KWITANSI PEMBAYARAN (Terpisah dari Pembayaran Utama)
  // =========================================================================
  const generateNextReceiptNumber = () => {
    const currentYear = new Date().getFullYear();
    let maxNum = 0;
    receiptsList.forEach(r => {
      const m = r.receipt_number.match(/(\d+)$/);
      if (m) {
        const val = parseInt(m[1], 10);
        if (val > maxNum) maxNum = val;
      }
    });
    const nextNum = maxNum + 1;
    return `KWT-${currentYear}-${String(nextNum).padStart(4, '0')}`;
  };

  const addReceipt = async (data: Omit<PaymentReceipt, 'id' | 'receipt_number' | 'created_at'>) => {
    const receiptNum = generateNextReceiptNumber();
    const id = `RCP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
    const newReceipt: PaymentReceipt = {
      ...data,
      id,
      receipt_number: receiptNum,
      created_at: new Date().toISOString()
    };

    const updated = [newReceipt, ...receiptsList];
    setReceiptsList(updated);

    try {
      localStorage.setItem('ziarah_payment_receipts_v1', JSON.stringify(updated));
    } catch {}

    if (isOnlineDb && supabase) {
      try {
        await supabase.from('payment_receipts').insert(newReceipt);
      } catch {}

      try {
        let notesObj: Record<string, any> = {};
        if (settings?.notes && settings.notes.startsWith('{')) {
          notesObj = JSON.parse(settings.notes);
        }
        notesObj.saved_receipts = updated.slice(0, 500);
        await supabase.from('activity_settings').update({
          notes: JSON.stringify(notesObj),
          updated_at: new Date().toISOString()
        }).eq('id', 'current_settings');
      } catch {}
    }

    showToast(`Kwitansi ${receiptNum} untuk ${newReceipt.participant_name} berhasil diterbitkan!`, 'success');
    return newReceipt;
  };

  const updateReceipt = async (id: string, updates: Partial<PaymentReceipt>) => {
    const updated = receiptsList.map(r => r.id === id ? { ...r, ...updates } : r);
    setReceiptsList(updated);

    try {
      localStorage.setItem('ziarah_payment_receipts_v1', JSON.stringify(updated));
    } catch {}

    if (isOnlineDb && supabase) {
      try {
        await supabase.from('payment_receipts').update(updates).eq('id', id);
      } catch {}

      try {
        let notesObj: Record<string, any> = {};
        if (settings?.notes && settings.notes.startsWith('{')) {
          notesObj = JSON.parse(settings.notes);
        }
        notesObj.saved_receipts = updated.slice(0, 500);
        await supabase.from('activity_settings').update({
          notes: JSON.stringify(notesObj),
          updated_at: new Date().toISOString()
        }).eq('id', 'current_settings');
      } catch {}
    }

    showToast('Kwitansi berhasil diperbarui.', 'success');
  };

  const deleteReceipt = async (id: string) => {
    const updated = receiptsList.filter(r => r.id !== id);
    setReceiptsList(updated);

    try {
      localStorage.setItem('ziarah_payment_receipts_v1', JSON.stringify(updated));
    } catch {}

    if (isOnlineDb && supabase) {
      try {
        await supabase.from('payment_receipts').delete().eq('id', id);
      } catch {}

      try {
        let notesObj: Record<string, any> = {};
        if (settings?.notes && settings.notes.startsWith('{')) {
          notesObj = JSON.parse(settings.notes);
        }
        notesObj.saved_receipts = updated.slice(0, 500);
        await supabase.from('activity_settings').update({
          notes: JSON.stringify(notesObj),
          updated_at: new Date().toISOString()
        }).eq('id', 'current_settings');
      } catch {}
    }

    showToast('Kwitansi berhasil dihapus.', 'info');
  };

  // =========================================================================
  // ANTI DOUBLE-SEAT VALIDATION & PINDAH KURSI
  // =========================================================================
  const getJamaahSeatAssignment = (jamaahId: string) => {
    // 1. Check in jamaahList
    const jm = jamaahList.find(j => j.id === jamaahId);
    if (jm?.bus_id && jm?.seat_number) {
      const b = busesList.find(bus => bus.id === jm.bus_id);
      return {
        busId: jm.bus_id,
        busName: b?.name || jm.bus_name || jm.bus_id,
        seatNumber: jm.seat_number
      };
    }

    // 2. Check across busSeatsMap
    for (const bId of Object.keys(busSeatsMap)) {
      const seat = busSeatsMap[bId]?.find(s => s.occupant_id === jamaahId && s.role !== 'empty');
      if (seat) {
        const b = busesList.find(bus => bus.id === bId);
        return {
          busId: bId,
          busName: b?.name || bId,
          seatNumber: seat.seat_number
        };
      }
    }

    return null;
  };

  const moveJamaahSeat = async (
    jamaahId: string,
    toBusId: string,
    toSeatNumber: string
  ) => {
    const jm = jamaahList.find(j => j.id === jamaahId);
    if (!jm) {
      const msg = 'Data peserta tidak ditemukan.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    const currentAssignment = getJamaahSeatAssignment(jamaahId);
    const fromBusId = currentAssignment?.busId || jm.bus_id;
    const fromSeatNumber = currentAssignment?.seatNumber || jm.seat_number;
    const fromBusName = currentAssignment?.busName || busesList.find(b => b.id === fromBusId)?.name || 'Bus Asal';
    const toBus = busesList.find(b => b.id === toBusId);
    const toBusName = toBus?.name || toBusId;

    // Pastikan kursi tujuan masih kosong
    const targetBusSeats = getSeatsForBus(toBusId);
    const toNorm = toSeatNumber.replace(/^SEAT\s*/i, '').trim();
    const isTargetOccupied = targetBusSeats.some(s => {
      const sNorm = s.seat_number.replace(/^SEAT\s*/i, '').trim();
      return (s.seat_number === toSeatNumber || sNorm === toNorm) &&
             s.occupant_id && s.occupant_id !== jamaahId &&
             s.role !== 'empty';
    });

    if (isTargetOccupied) {
      const msg = 'Kursi ini sudah ditempati peserta lain. Silakan pilih kursi yang masih tersedia.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }

    // 1. Kosongkan kursi lama
    if (fromBusId && fromSeatNumber) {
      await freeSeat(fromBusId, fromSeatNumber);
    }

    // 2. Masukkan ke kursi baru dengan allowMove = true
    const res = await assignSeat(toBusId, toSeatNumber, jm.id, jm.name, 'jamaah', { allowMove: true });
    if (!res.success) {
      return { success: false, message: res.error || 'Gagal memindahkan kursi.' };
    }

    const successMsg = `Berhasil memindahkan ${jm.name} dari ${fromBusName} (${fromSeatNumber || '-'}) ke ${toBusName} (${toSeatNumber})! Kursi lama otomatis dikosongkan.`;
    return { success: true, message: successMsg };
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
        receiptsList,
        addReceipt,
        updateReceipt,
        deleteReceipt,
        generateNextReceiptNumber,
        moveJamaahSeat,
        getJamaahSeatAssignment,
        assignSeat,
        freeSeat,
        saveCustomBusLayout,
        updateBusLayoutDimensions,
        standardizeBusTo59Seats,
        addPayment,
        updatePayment,
        voidPayment,
        rombonganPaymentsList,
        addRombonganPayment,
        updateRombonganPayment,
        voidRombonganPayment,
        deleteRombonganPayment,
        getRombonganFinancialSummary,
        addBudgetItem,
        updateBudgetItem,
        deleteBudgetItem,
        bulkImportBudget,
        syncFleetAndBudget,
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
