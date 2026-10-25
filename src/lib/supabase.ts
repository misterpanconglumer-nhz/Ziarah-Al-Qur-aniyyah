import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('your-project-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export type ConnectionStatus = 'connected' | 'not_configured' | 'connection_error' | 'checking';

export interface DatabaseStatusInfo {
  status: ConnectionStatus;
  message: string;
  url?: string;
}

export async function checkDatabaseConnection(): Promise<DatabaseStatusInfo> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      status: 'not_configured',
      message: 'Supabase Belum Dikonfigurasi. Masukkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di file .env atau Vercel Environment Variables.'
    };
  }

  try {
    const { error } = await supabase.from('activity_settings').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') { // table does not exist
        return {
          status: 'connection_error',
          message: 'Terkoneksi ke Supabase, namun tabel belum dibuat. Silakan jalankan script SQL migrasi di SQL Editor Supabase.',
          url: supabaseUrl
        };
      }
      return {
        status: 'connection_error',
        message: `Koneksi Supabase gagal: ${error.message}`,
        url: supabaseUrl
      };
    }

    return {
      status: 'connected',
      message: 'Database Supabase PostgreSQL Terhubung & Siap Operasional.',
      url: supabaseUrl
    };
  } catch (err: any) {
    return {
      status: 'connection_error',
      message: `Gagal menghubungi server database: ${err?.message || 'Network error'}`,
      url: supabaseUrl
    };
  }
}
