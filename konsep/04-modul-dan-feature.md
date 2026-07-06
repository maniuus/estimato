# Modul & Fitur — Master RAB Konstruksi

---

## Modul 1: Dashboard
**Fitur:**
- Statistik ringkas: total proyek, proyek aktif, total nilai RAB
- Daftar proyek terbaru (card/table)
- Pencarian proyek
- Shortcut: Buat Proyek Baru

---

## Modul 2: Manajemen Proyek
**Fitur:**
- CRUD proyek (nama, nomor proyek, lokasi, tahun anggaran, deskripsi)
- Data: jenis bangunan, luas bangunan, jumlah lantai
- Status: Draft → Proses → Selesai
- Duplikasi proyek (copies WBS + AHS, reset volume)
- Arsip / Hapus

**Dependensi:** — (modul mandiri)

---

## Modul 3: Master Data
**Fitur:**
- **Material**: nama, spesifikasi, satuan, harga satuan, kategori (struktur, arsitektur, MEP, dll)
- **Upah Tenaga**: jenis (tukang batu, tukang kayu, kepala tukang, mandor), upah/hari, satuan (OH/Org Hari)
- **Alat**: nama, tipe, kapasitas, sewa/hari
- **HSPK**: Harga Satuan Pekerjaan (untuk item yang tidak pakai AHS detail)
- Import/export Excel
- Search & filter per kategori

**Dependensi:** — (modul mandiri, data dipakai oleh AHS)

---

## Modul 4: WBS (Work Breakdown Structure)
**Fitur:**
- Struktur tree dengan kedalaman tak terbatas
- Kode otomatis: 1, 1.1, 1.1.1, 1.1.1.1, dst
- Setiap node: nama pekerjaan, satuan, volume target
- Drag & drop reorder
- Expand/collapse tree
- Copy-paste subtree
- Tipe node: **Group** (induk, tidak punya volume) vs **Item** (leaf, punya volume & AHS)

**Dependensi:** terhubung ke proyek

---

## Modul 5: AHS (Analisa Harga Satuan)
**Fitur:**
- **Library AHS** — daftar AHS standar (SNI) yang bisa dipakai ulang
- **AHS Kustom** — buat baru dari komponen material + tenaga + alat
- Setiap AHS punya:
  - Kode AHS (misal: AHS-01)
  - Nama pekerjaan
  - Satuan (m³, m², m', kg, bh, dll)
  - Komponen: daftar material (koefisien × harga), tenaga (koefisien × upah), alat (koefisien × sewa)
  - Harga satuan total (auto calculated)
- Edit koefisien langsung → auto recalculate
- Duplikasi AHS
- Import/export AHS
- Riwayat perubahan harga

**Dependensi:** membaca data dari Master Data (material, upah, alat)

---

## Modul 6: Volume
**Fitur:**
- Input volume per item pekerjaan leaf (WBS leaf node)
- Bantuan rumus: P×L, P×L×T, ½×a×t, π×r², kustom
- Satuan volume otomatis dari AHS terkait
- Validasi: volume harus ≥ 0
- Batch edit volume

**Dependensi:** terhubung ke WBS dan AHS

---

## Modul 7: Kalkulasi RAB
**Fitur:**
- Kalkulasi otomatis:
  - `Harga Satuan` = dari AHS / HSPK
  - `Total Harga` = Volume × Harga Satuan
  - `Total Pekerjaan` = sum per grup
- Pengaturan: PPN (default 11%), Overhead & Laba (default 0-15%)
- Rekapitulasi per kategori pekerjaan
- Rekapitulasi per material (total volume material)
- Grafik pie/batangan (opsional)

**Dependensi:** WBS + AHS + Volume

---

## Modul 8: Laporan & Export
**Fitur:**
- **RAB Lengkap**: seluruh item pekerjaan dengan volume, harga satuan, dan total
- **Rekap per Jenis Pekerjaan**: total per grup
- **Rekap Material**: kebutuhan material seluruh proyek
- **Kurva S** (opsional, phase 2)
- **Format Output**:
  - PDF (format standar RAB dengan kop)
  - Excel (.xlsx, editable)
  - CSV (data mentah)
- Preview sebelum export
- Cetak langsung (print dialog)

**Dependensi:** Kalkulasi RAB

---

## Modul 9: Pengaturan
**Fitur:**
- Pengaturan umum: nama perusahaan, logo, kop laporan
- Pengaturan PPN default
- Backup database (.zip)
- Restore database
- Reset data (confirm)
- Tentang aplikasi

**Dependensi:** — (global)

---

## Matriks Dependensi Modul

| Modul | Membutuhkan |
|---|---|
| Dashboard | Proyek |
| Proyek | — |
| Master Data | — |
| WBS | Proyek |
| AHS | Master Data |
| Volume | WBS, AHS |
| Kalkulasi | WBS, AHS, Volume |
| Laporan | Kalkulasi |
| Pengaturan | — |
