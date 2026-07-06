# User Flow — Master RAB Konstruksi

## Alur Utama

```
┌─────────────┐
│   Dashboard  │
│  (Daftar     │
│   Proyek)    │
└──────┬──────┘
       │
       ▼
┌───────────────────────────────────────┐
│         BUAT / PILIH PROYEK           │
│  - Nama proyek, lokasi, tahun, dll    │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│    1. INPUT STRUKTUR PEKERJAAN (WBS)  │
│       - Tambah grup/sub grup/item     │
│       - Atur kode & urutan            │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│    2. PILIH / BUAT AHS               │
│       - Pilih AHS dari library        │
│       - Buat AHS kustom               │
│       - Edit koefisien                │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│    3. INPUT VOLUME                    │
│       - Volume per item pekerjaan     │
│       - Gunakan rumus jika perlu      │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│    4. KALKULASI RAB                   │
│       - Otomatis hitung total         │
│       - Atur PPN & overhead           │
│       - Lihat rekap                   │
└──────────────────┬────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────┐
│    5. LAPORAN & EXPORT                │
│       - Preview RAB                   │
│       - Export PDF / Excel            │
│       - Cetak                         │
└───────────────────────────────────────┘
```

## Alur Detail Per Modul

### Manajemen Proyek
```
Dashboard → Klik "Buat Proyek" → Isi form → Submit → Masuk halaman proyek
Dashboard → Klik proyek → Lihat detail proyek
Dashboard → Klik ⋮ (aksi) → Edit / Duplikasi / Arsip
```

### Master Data
```
Sidebar → Master Data → Pilih tab (Material / Upah / Alat)
  → Tambah: Klik "Tambah" → Isi form → Simpan
  → Edit: Klik item → Ubah → Simpan
  → Hapus: Klik item → Konfirmasi → Hapus
  → Import: Klik "Import Excel" → Pilih file → Mapping kolom → Import
  → Export: Klik "Export" → Pilih format → Download
```

### WBS Tree
```
Halaman Proyek → Tab "Pekerjaan"
  → Tambah grup: Klik "Tambah Grup" → Isi nama → Enter
  → Tambah item: Klik "Tambah Item" di grup → Isi nama & satuan
  → Drag: Seret item ke posisi baru
  → Edit / Hapus: Klik kanan / ikon aksi
```

### AHS
```
Halaman Proyek → Tab "AHS"
  → Pilih AHS dari library (modal pencarian)
  → Buat baru: "Buat AHS" → Isi komponen (material/tenaga/alat) → Simpan
  → Edit: Klik AHS → Ubah koefisien → Auto recalculate
```

### Volume
```
Halaman Proyek → Tab "Volume"
  → Tabel: Item Pekerjaan | Volume | Satuan | AHS | Harga Satuan | Total
  → Klik kolom Volume → Input angka
  → Auto calculate total
```

### Laporan
```
Halaman Proyek → Tab "Laporan"
  → Pilih jenis laporan (Lengkap / Rekap)
  → Preview muncul
  → Klik "Export PDF" / "Export Excel"
  → Dialog save → Selesai
```
