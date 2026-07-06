# Requirements — Master RAB Konstruksi

## A. Fungsional

### Modul Proyek
- [ ] Buat proyek baru (nama, lokasi, tahun anggaran, kategori bangunan)
- [ ] Edit & hapus proyek
- [ ] Duplikasi proyek (termasuk struktur pekerjaan)
- [ ] Daftar proyek dengan status (draft/proses/selesai)
- [ ] Arsip proyek

### Modul Master Data
- [ ] **Material**: nama, satuan, harga satuan, kategori, supplier
- [ ] **Upah Tenaga**: jenis tukang/kepala tukang/mandor, upah/hari
- [ ] **Alat**: nama alat, sewa/hari, kapasitas
- [ ] **HSPK**: Harga Satuan Pekerjaan kustom (import dari Excel)
- [ ] CRUD + search + filter + import/export Excel

### Modul WBS (Work Breakdown Structure)
- [ ] Tree/list pekerjaan bertingkat (misal: Pekerjaan Persiapan → Pembersihan Lahan)
- [ ] Tambah, edit, hapus, drag-drop reorder
- [ ] Kode item otomatis (misal: 1.1, 1.1.1)
- [ ] Copy-paste item pekerjaan

### Modul AHS (Analisa Harga Satuan)
- [ ] Library AHS SNI (built-in)
- [ ] Buat AHS kustom baru
- [ ] Edit koefisien material, tenaga, alat per satuan pekerjaan
- [ ] Kalkulasi otomatis harga satuan per item
- [ ] Import AHS dari Excel

### Modul Volume
- [ ] Input volume per item pekerjaan (angka + satuan)
- [ ] Rumus sederhana (PxL, PxLxT, 1/2xaxt)
- [ ] Copy volume antar item

### Modul Kalkulasi RAB
- [ ] Hitung otomatis: Volume × Harga Satuan
- [ ] Rekapitulasi per jenis pekerjaan
- [ ] PPN 11% (opsional, bisa diubah)
- [ ] Biaya tak terduga (overhead, laba)
- [ ] RAB summary (total, per jenis, per lantai)

### Modul Laporan
- [ ] RAB lengkap (per item pekerjaan)
- [ ] Rekapitulasi per jenis pekerjaan
- [ ] Rekapitulasi per material
- [ ] Export PDF (format standar RAB)
- [ ] Export Excel (edit lebih lanjut)
- [ ] Preview sebelum cetak

## B. Non-Fungsional

- [ ] **Offline-first**: semua data di lokal, tidak perlu internet
- [ ] **Backup & restore**: export/import database
- [ ] **Fast startup**: load aplikasi < 3 detik
- [ ] **Save otomatis**: setiap perubahan langsung tersimpan
- [ ] **UI Bahasa Indonesia** (default, opsi EN boleh)
- [ ] **Responsive layout**: minimal 1280×720
- [ ] **Error handling**: validasi input, toast notification
- [ ] **Log aktivitas**: catat perubahan penting (riwayat)
