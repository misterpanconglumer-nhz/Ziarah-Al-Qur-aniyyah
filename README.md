# ZIARAH AKBAR AL-QUR'ANIYYAH 2027
### Full-Stack Web App, Database PostgreSQL, Finance, Bus Management, Excel Engine, Orisinal Logo, dan PWA Mobile-First

Sistem aplikasi operasional tunggal terpadu untuk pengelola dan bendahara kegiatan ziarah akbar dengan target hingga **3.000 peserta** dan **puluhan armada bus**.

---

## 1. FITUR UTAMA SISTEM

1. **Dashboard Eksekutif Terpadu:**
   - Real-time KPI: Jumlah Jamaah, Rombongan, Armada Bus, Total Kapasitas, Kursi Terisi/Kosong, Tour Leader, Pembimbing.
   - Keuangan Akurat: Total Tagihan, Kas Masuk Aktual Diterima, Sisa Piutang/Tunggakan, Rencana Anggaran, Realisasi Kas Keluar, dan **Saldo Kas Bersih**.
   - Indikator status database Supabase yang transparan (Online vs Belum Terhubung/DATA DEMO).

2. **Data Jamaah & Deteksi Duplikasi:**
   - ID unik berurutan (`JM-0001`, dsb).
   - Pencarian cerdas, filter rombongan, armada bus, dan status pembayaran.
   - Algoritma deteksi nama ganda otomatis (case-insensitive, spasi berlebih, nomor HP sama, dan kemiripan fuzzy Levenshtein / singkatan seperti "Putri K." vs "Putri Kamilah").
   - Status peninjauan: *Belum Diperiksa*, *Terkonfirmasi Berbeda*, *Duplikat Terkonfirmasi*.

3. **Data Rombongan:**
   - Kelompok majelis ta'lim, keluarga besar, dan wilayah.
   - Koordinator dan kontak telepon.
   - Rekap anggota dan proteksi pencegahan hapus rombongan yang masih memiliki jamaah.

4. **Data Armada Bus & Petugas Operasional:**
   - Manajemen puluhan bus (operator Blue Star, pariwisata, kapasitas fleksibel 59/60 kursi).
   - Tour Leader dan Pembimbing Ibadah (ulama/asatidz) ditetapkan pada tingkat bus, bukan rombongan.
   - Rekap penghuni dan manifest bus.

5. **Editor Denah Kursi Interaktif (Bird's Eye View):**
   - Tampilan visual bus tampak atas yang elegan.
   - Konfigurasi letak sopir, pintu depan, gang tengah, dan kursi belakang.
   - Penempatan kursi sekali klik (pilih nama dari daftar jamaah atau petugas).
   - Validasi ketat: mencegah satu orang menempati dua kursi dan mencegah dua orang pada satu kursi.
   - Cetak PDF denah kursi resmi bus.

6. **Import & Export Excel (.xlsx) Resmi:**
   - Unduh template Excel terstandarisasi untuk pendaftaran jamaah masal.
   - Unggah file Excel dengan parsing cerdas, validasi baris, dan pra-tinjau deteksi duplikasi.
   - Export Excel untuk seluruh jamaah, per rombongan, per bus, rekap pembayaran, dan manifest bus.

7. **Keuangan, Pembayaran & Kas:**
   - Dukungan pembayaran cicilan bertahap dan pelunasan lunas.
   - Kwitansi dan nomor referensi transaksi.
   - Pembatalan transaksi kas berjejak audit (VOID) tanpa menghapus data secara diam-diam.
   - Pemisahan tegas: Rencana Anggaran Biaya (RAB) vs Realisasi Pengeluaran Kas Aktual.

8. **Pusat Laporan & Neraca:**
   - Laporan ringkasan kas masuk vs keluar bersih.
   - Cetak dokumen PDF resmi dengan kop ziarah untuk evaluasi pengurus.

9. **Progressive Web App (PWA) & Mobile-First:**
   - Nyaman digunakan dengan satu tangan di layar smartphone (360px - 430px) hingga tablet dan monitor PC.
   - Dilengkapi `manifest.webmanifest`, service worker, dan icon SVG/PNG resolusi tinggi.
   - Panduan interaktif pasang ke layar utama Android Chrome dan iPhone Safari.

---

## 2. PALET WARNA & BRANDING RESMI

- **Midnight Navy:** `#142B4A` (Warna dasar kepemimpinan dan stabilitas)
- **Deep Teal:** `#236D78` (Elemen profesionalitas dan koordinasi)
- **Soft Teal:** `#4BC7BE` (Aksen dinamis dan modern)
- **Off-White:** `#F4F7FA` (Latar bersih yang nyaman di mata)
- **White:** `#FFFFFF`

### Aset Logo Orisinal (`public/brand/`)
- `logo-main.svg`: Logo utama dengan tipografi Ziarah 2027 Al-Qur'aniyyah (latar terang)
- `logo-main-dark.svg`: Logo utama untuk latar gelap / banner navy
- `logo-symbol.svg` & `logo-symbol-dark.svg`: Simbol geometris minimalis kubah & rute perjalanan
- `app-icon.svg`: Master ikon aplikasi beresolusi vektor
- `app-icon-192.png` & `app-icon-512.png`: Ikon PWA standar
- `app-icon-maskable.png`: Ikon PWA adaptive maskable Android
- `favicon.svg` & `favicon.ico`: Favicon browser

---

## 3. PANDUAN MENJALANKAN DI KOMPUTER LOKAL

### Prasyarat
- Node.js versi 18+ atau 20+

### Langkah-langkah
```bash
# 1. Masuk ke direktori proyek
cd "e:/MY PROJECT/Ziarah 2027"

# 2. Instal dependensi (jika belum)
npm install

# 3. Jalankan server pengembangan lokal
npm run dev

# 4. Buka di browser: http://localhost:3000
```

---

## 4. PANDUAN KONFIGURASI SUPABASE POSTGRESQL

Sistem ini didesain terintegrasi langsung dengan database PostgreSQL di cloud Supabase dengan Row Level Security (RLS).

### Langkah 1: Buat Proyek Supabase
1. Kunjungi [supabase.com](https://supabase.com) dan masuk atau buat akun baru.
2. Buat proyek baru (misal dengan nama `ziarah-2027`).
3. Pilih wilayah server terdekat (contoh: *Singapore*).

### Langkah 2: Eksekusi Skema Database SQL
1. Buka menu **SQL Editor** di dashboard proyek Supabase Anda.
2. Buka file `src/lib/db-schema.sql` di proyek ini, salin seluruh kodenya, lalu tempel di SQL Editor Supabase.
3. Klik tombol **Run** (Jalankan). Seluruh tabel, indeks pencarian skala 3.000 peserta, foreign key, dan kebijakan keamanan RLS akan langsung aktif.

### Langkah 3: Konfigurasi Environment Variables
1. Buka menu **Project Settings → API** di Supabase.
2. Salin nilai **Project URL** dan **anon / public key**.
3. Buat file `.env` di root proyek (atau duplikasi dari `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://[PROJECT-ID].supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Restart development server (`npm run dev`). Status di header aplikasi akan otomatis berubah menjadi hijau: **Supabase Online**.

---

## 5. PANDUAN DEPLOYMENT KE GITHUB & VERCEL

### Langkah Deployment ke GitHub
```bash
# Inisialisasi & Commit
git add .
git commit -m "feat: implementasi lengkap aplikasi Ziarah Akbar 2027"

# Buat repository baru di github.com, lalu hubungkan:
git branch -M main
git remote add origin https://github.com/[USERNAME-ANDA]/ziarah-2027.git
git push -u origin main
```

### Langkah Deployment ke Vercel (Gratis & Cepat)
1. Kunjungi [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik **Add New Project** dan pilih repository `ziarah-2027`.
3. Di bagian **Environment Variables**, tambahkan dua variabel berikut:
   - `VITE_SUPABASE_URL`: URL proyek Supabase Anda
   - `VITE_SUPABASE_ANON_KEY`: Anon key publik Supabase Anda
4. Klik **Deploy**.
5. Dalam waktu 1 menit, website resmi produksi berprotokol HTTPS akan aktif dan siap digunakan secara online melalui HP maupun PC!

---

## 6. CARA MEMASANG SHORTCUT PWA DI SMARTPHONE

Setelah dideploy ke Vercel dengan HTTPS:

### Di HP Android (Google Chrome):
1. Buka website produksi di Chrome.
2. Tekan menu titik tiga di kanan atas.
3. Pilih **"Install app"** atau **"Tambahkan ke layar utama"**.
4. Ikon resmi Ziarah 2027 akan otomatis terpasang di beranda HP Anda.

### Di iPhone (Safari):
1. Buka website produksi di browser Safari.
2. Tekan tombol **Share** (kotak dengan panah ke atas di bagian bawah).
3. Gulir ke bawah dan pilih **"Add to Home Screen"** (Tambahkan ke Layar Utama).
4. Tekan **Add** di kanan atas. Aplikasi akan tampil layaknya aplikasi native tanpa frame browser.

---

## 7. KREDENSIAL LOGIN ADMIN
- **Email:** `bendahara@ziarah2027.id` (atau email admin yang didaftarkan di Supabase Auth)
- **Kata Sandi Standar:** `adminziarah2027`
