# Master RAB Konstruksi

Aplikasi desktop premium untuk menyusun Rencana Anggaran Biaya (RAB) konstruksi dengan modularitas tinggi, dukungan Analisa Harga Satuan Pekerjaan (AHS/AHSP), Bill of Material (BOM), grafik Kurva S, serta backup kalkulator volume struktur beton secara presisi.

Aplikasi ini dibangun menggunakan teknologi modern berbasis **Electron**, **Vite**, **React (TypeScript)**, **TailwindCSS**, dan database relasional **SQLite (sql.js)**.

---

## Fitur Utama

1. **Struktur Rencana Anggaran Biaya (WBS)**:
   - Pengorganisasian pekerjaan konstruksi berbasis *Work Breakdown Structure* (WBS) bertingkat.
   - Pindai, tambah, hapus, dan pindahkan (*drag/drop* relokasi) kategori serta sub-pekerjaan secara dinamis.
   - Perhitungan subtotal biaya per divisi/kategori secara otomatis.
   
2. **Library AHS (Analisa Harga Satuan Pekerjaan)**:
   - Kelola koefisien bahan, upah harian tenaga kerja, dan biaya sewa peralatan.
   - Import otomatis berkas AHSP standar nasional dari lembar Excel (.xlsx).
   - Duplikasi dan kustomisasi analisis untuk harga satuan pekerjaan baru.

3. **Backup Volume Calculator**:
   - Kalkulator volume bawaan untuk menghitung dimensi panjang, lebar, tinggi, dan perkalian quantity.
   - **Kalkulator Besi & Sengkang Beton**: Masukkan parameter selimut beton, jumlah tulangan utama, diameter begel, serta jarak tumpuan/lapangan untuk menghitung total berat besi (kg) dan visualisasi penampang melintang (SVG).
   - Indikator volume proyek bersama (*project-wide volume sharing*) untuk konsistensi data.

4. **Laporan & Kurva S Rencana**:
   - Visualisasi diagram bar mingguan serta garis *cumulative progress* Kurva S halus menggunakan algoritma **Spline (Catmull-Rom)** berbasis grafik SVG.
   - Pengaturan durasi pelaksanaan proyek (4 s.d 52 minggu) serta pembagian rentang minggu pengerjaan tiap kelompok divisi.
   
5. **Ekspor & Cetak Laporan**:
   - **Ekspor Excel**: Menghasilkan berkas spreadsheet multi-tab berisi Rekapitulasi, RAB Detail, Lembar Analisa, BOM, dan Backup Volume lengkap dengan formula Excel otomatis.
   - **Ekspor & Cetak PDF**: Tata letak dokumen cetak profesional lengkap dengan logo perusahaan, kop surat, dan kolom persetujuan pemilik (*owner signature*).

---

## Arsitektur Teknologi

- **Frontend**: React (TypeScript), TailwindCSS, Lucide Icons, Zustand (State Management).
- **Backend (Main Process)**: Electron, Node.js.
- **Database**: SQLite (menggunakan library `sql.js` untuk eksekusi berbasis memori dan persistensi berkas ke disk).
- **Tooling**: Vite (sebagai bundler frontend/backend melalui `electron-vite`), TypeScript untuk pengetikan statis yang aman.

---

## Panduan Instalasi & Pengembangan

### Prasyarat
Pastikan Anda telah memasang:
- **Node.js** (versi 18.x atau yang lebih baru direkomendasikan)
- **NPM** (bawaan Node.js)

### Langkah Instalasi
1. Clone repositori ke direktori lokal Anda.
2. Buka terminal di folder proyek dan jalankan perintah untuk memasang dependensi:
   ```bash
   npm install
   ```

### Menjalankan Mode Pengembangan
Jalankan aplikasi dalam mode pengembangan lokal dengan hot-reload:
```bash
npm run dev
```

### Melakukan Pemeriksaan Tipe (TypeScript)
Untuk memverifikasi kebersihan kode dari kesalahan kompilasi tipe data:
```bash
# Untuk memeriksa backend (Node.js) & frontend (React)
npm run typecheck
```

---

## Panduan Build & Packaging

Untuk mengompilasi dan mengemas aplikasi menjadi installer desktop Windows (.exe):

1. **Build Aset**:
   ```bash
   npm run build
   ```
2. **Package Executable**:
   ```bash
   npm run dist
   ```
   *Installer dan hasil kompilasi akan berada di dalam direktori `dist/`.*

---

## Struktur Berkas Proyek

```text
├── .gemini/config      # Konfigurasi agen AI Antigravity
├── dist/               # Berkas aplikasi hasil kompilasi (output build)
├── electron/
│   ├── main/           # Proses backend utama (Database, Services, Repositories, IPC IPC)
│   └── preload/        # Preload script (Bridge API window.api)
├── src/
│   ├── components/     # Sub-komponen modular & visual (rekap, kalkulator besi, dll)
│   ├── hooks/          # Custom react hooks (kalkulasi data, ekspor excel)
│   ├── lib/            # Library pembantu (formatting, fungsi terbilang)
│   ├── pages/          # Halaman utama (laporan, input RAB, library AHS)
│   ├── stores/         # Zustand global state stores (rab, wbs, volume, ahs)
│   ├── types/          # Definisi interface model data & TypeScript types
│   └── App.tsx         # Root component React
└── package.json        # Dependensi proyek & konfigurasi build script
```

---

## Lokasi Database Lokal
Berkas database SQLite disimpan secara lokal pada direktori data user aplikasi:
- **Windows**: `%APPDATA%/master-rab/data/master-rab.sqlite`
