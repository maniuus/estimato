# Roadmap Pengembangan — Master RAB Konstruksi

Durasi: **4 Minggu** (1 sprint per minggu)

---

## Phase 1: Foundation & Core (Minggu 1)
**Tujuan**: Boilerplate berfungsi + data master + proyek

| Hari | Task | Output |
|---|---|---|
| Senin | Init project Electron + Vite + React + TS | Boilerplate running |
| | Setup Tailwind + shadcn/ui + layout | Sidebar + routing bekerja |
| Selasa | Setup SQLite + schema migration | Database siap |
| | Implement IPC bridge (main ↔ renderer) | CRUD data lewat IPC |
| Rabu | Modul Master Data (Material, Upah, Alat) | CRUD + search |
| | Modul HSPK | CRUD HSPK |
| Kamis | Modul Manajemen Proyek | CRUD proyek + status |
| | Dashboard | Statistik + daftar proyek |
| Jumat | Integrasi Master Data ke dalam proyek | Data terhubung |
| | Backup & restore database | Export/import working |

**Deliverable**: Aplikasi bisa CRUD proyek + master data.

---

## Phase 2: WBS & AHS (Minggu 2)
**Tujuan**: Struktur pekerjaan + library analisa harga

| Hari | Task | Output |
|---|---|---|
| Senin | WBS Tree component (recursive tree) | Tree render + expand/collapse |
| | CRUD WBS item | Tambah/edit/hapus item |
| Selasa | Drag & drop reorder | Urutan bisa diatur |
| | Kode otomatis | Kode 1, 1.1, 1.1.1 otomatis |
| Rabu | Library AHS (CRUD master AHS) | AHS bisa ditambah |
| | AHS komponen material | Pilih material + koefisien |
| Kamis | AHS komponen tenaga & alat | Komponen lengkap |
| | Auto calculate harga satuan AHS | Harga satuan terhitung otomatis |
| Jumat | Assign AHS ke item WBS | Item punya harga satuan |
| | Import AHS dari Excel | Import bekerja |

**Deliverable**: WBS tree berfungsi + AHS terhubung ke item.

---

## Phase 3: Volume & Kalkulasi (Minggu 3)
**Tujuan**: RAB bisa dihitung + laporan dasar

| Hari | Task | Output |
|---|---|---|
| Senin | Input volume per item | Volume bisa diisi |
| | Bantuan rumus volume | P×L, P×L×T, dll |
| Selasa | Kalkulasi RAB engine | Total per item → per grup |
| | PPN & Overhead settings | Grand total akurat |
| Rabu | Rekapitulasi per jenis pekerjaan | Ringkasan grup |
| | Grafik sederhana (pie chart) | Visual breakdown |
| Kamis | Export PDF (jsPDF) | PDF RAB standar |
| | Export Excel (ExcelJS) | Excel bisa dibuka/edit |
| Jumat | Preview laporan | Print preview dialog |
| | Polish kalkulasi & validasi | Bug fixing |

**Deliverable**: RAB bisa dihitung, dilihat, dan diexport.

---

## Phase 4: Final & Polish (Minggu 4)
**Tujuan**: Testing, packaging, distribusi

| Hari | Task | Output |
|---|---|---|
| Senin | Error handling & validasi tambahan | Edge cases covered |
| | Riwayat perubahan log | Aktivitas tercatat |
| Selasa | UI polish (loading, empty state, toast) | UX mulus |
| | Responsive minimal (resize window) | Tidak broken |
| Rabu | Testing manual full flow | Uji semua skenario |
| | Bug fixing | Issues resolved |
| Kamis | Packaging Electron (electron-builder) | .exe / .msi file |
| | Testing installasi & run | Portable working |
| Jumat | Dokumentasi penggunaan | README + user guide |
| | Release v1.0.0 | Siap pakai! |

**Deliverable**: Aplikasi siap distribusi v1.0.0.

---

## Post-Release (v2.0 & Beyond)
- [ ] Dark mode
- [ ] Multi-user / login (lane terpisah)
- [ ] Kurva S
- [ ] Integrasi dengan harga material real-time (online)
- [ ] Template proyek
- [ ] Cloud sync (opsional)
- [ ] Mobile companion app (Flutter)

## Estimasi Total
| Fase | Jam |
|---|---|
| Foundation & Core | 12-16 jam |
| WBS & AHS | 12-16 jam |
| Volume & Kalkulasi | 12-16 jam |
| Final & Polish | 8-12 jam |
| **Total** | **44-60 jam** |
