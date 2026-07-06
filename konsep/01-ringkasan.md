# Ringkasan Eksekutif — Master RAB Konstruksi

## Latar Belakang
Rencana Anggaran Biaya (RAB) adalah dokumen inti dalam setiap proyek konstruksi. Proses pembuatan RAB saat ini masih banyak dilakukan secara manual (Excel) yang rawan kesalahan rumus, inkonsistensi data, dan sulit direvisi.

## Solusi
Aplikasi **Master RAB Konstruksi** — aplikasi desktop yang membantu estimator/QS membuat, mengelola, dan menghitung RAB secara sistematis dengan metode Analisa Harga Satuan (AHS).

## Target Pengguna
- Quantity Surveyor (QS)
- Estimator proyek
- Kontraktor kecil-menengah
- Konsultan perencana

## Platform
- **Desktop** (Windows utama, cross-platform via Electron)
- **Offline-first** — tidak perlu koneksi internet
- **Portable** — bisa dijalankan tanpa instalasi (opsional)

## Fitur Utama
| Fitur | Manfaat |
|---|---|
| Manajemen Proyek | Kelola banyak proyek dalam satu aplikasi |
| Master Data | Database material, upah, alat terpusat |
| WBS Tree | Struktur pekerjaan bertingkat |
| AHS Editor | Buat & edit analisa harga satuan |
| Kalkulasi Otomatis | Volume × Harga Satuan + PPN |
| Export Laporan | PDF, Excel, cetak |

## Tech Stack
- Electron + React + TypeScript
- SQLite (database lokal)
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- jsPDF / ExcelJS (report engine)

## Estimasi Pengembangan
4 minggu (1 sprint = 1 minggu), dengan total ~40-60 jam pengembangan.
