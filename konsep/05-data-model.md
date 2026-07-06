# Data Model — Master RAB Konstruksi

## Entity Relationship Diagram (Text)

```
Project
  ├── WbsItem (tree, self-referencing parent_id)
  │     ├── VolumeItem (untuk leaf node)
  │     └── AhsItem (AHS yang dipilih untuk item tsb)
  │
  ├── Ahs (library / master AHS)
  │     ├── AhsComponentMaterial (koefisien material)
  │     ├── AhsComponentWage (koefisien tenaga)
  │     └── AhsComponentEquipment (koefisien alat)
  │
  └── RabCalculation (hasil kalkulasi, bisa dicache)
```

## Detail Entity & Field

### Project
```
id              : TEXT (UUID)
name            : TEXT          — Nama proyek
projectNumber   : TEXT          — No. proyek (opsional)
location        : TEXT          — Lokasi
year            : INTEGER       — Tahun anggaran
buildingType    : TEXT          — Rumah, Gedung, Jalan, dll
buildingArea    : REAL          — Luas (m²)
floors          : INTEGER       — Jumlah lantai
status          : TEXT          — draft / active / completed / archived
ppn             : REAL          — PPN % (default 11)
overhead        : REAL          — Overhead & laba %
note            : TEXT
createdAt       : TEXT (ISO8601)
updatedAt       : TEXT (ISO8601)
```

### Material
```
id              : TEXT (UUID)
code            : TEXT          — Kode material (opsional)
name            : TEXT          — Nama material
specification   : TEXT          — Spesifikasi
category        : TEXT          — Struktur / Arsitektur / MEP / dll
unit            : TEXT          — Satuan (m³, m², kg, bh, zak, dll)
unitPrice       : REAL          — Harga satuan (Rp)
supplier        : TEXT          — Supplier (opsional)
createdAt       : TEXT (ISO8601)
updatedAt       : TEXT (ISO8601)
```

### Wage (Upah Tenaga)
```
id              : TEXT (UUID)
type            : TEXT          — Tukang Batu, Tukang Kayu, Kepala Tukang, Mandor
dailyWage       : REAL          — Upah/hari (Rp)
unit            : TEXT          — OH (default)
createdAt       : TEXT (ISO8601)
updatedAt       : TEXT (ISO8601)
```

### Equipment (Alat)
```
id              : TEXT (UUID)
name            : TEXT          — Nama alat
type            : TEXT          — Ringan / Berat
capacity        : TEXT          — Kapasitas (opsional)
rentalPrice     : REAL          — Sewa/hari (Rp)
unit            : TEXT          — Hari (default)
createdAt       : TEXT (ISO8601)
updatedAt       : TEXT (ISO8601)
```

### Ahs (Analisa Harga Satuan)
```
id              : TEXT (UUID)
code            : TEXT          — Kode AHS (AHS-001, SNI-xxx)
name            : TEXT          — Nama pekerjaan
unit            : TEXT          — Satuan output (m³, m², m', dll)
category        : TEXT          — Jenis (SNI / Kustom)
source          : TEXT          — Sumber AHS (opsional)
totalPrice      : REAL          — Harga satuan total (auto calc)
projectId       : TEXT (UUID?) — Null = library global, ada = milik proyek
createdAt       : TEXT (ISO8601)
updatedAt       : TEXT (ISO8601)
```

### AhsComponentMaterial
```
id              : TEXT (UUID)
ahsId           : TEXT (UUID)  → AHS
materialId      : TEXT (UUID)  → Material
coefficient     : REAL          — Koefisien (misal: 0.5 m³ material per m³ pekerjaan)
totalPrice      : REAL          — coefficient × material.unitPrice (auto)
```

### AhsComponentWage
```
id              : TEXT (UUID)
ahsId           : TEXT (UUID)  → AHS
wageId          : TEXT (UUID)  → Wage
coefficient     : REAL          — Koefisien (misal: 0.1 OH per m²)
totalPrice      : REAL          — coefficient × wage.dailyWage (auto)
```

### AhsComponentEquipment
```
id              : TEXT (UUID)
ahsId           : TEXT (UUID)  → AHS
equipmentId     : TEXT (UUID)  → Equipment
coefficient     : REAL          — Koefisien
totalPrice      : REAL          — coefficient × equipment.rentalPrice (auto)
```

### WbsItem (Work Breakdown Structure)
```
id              : TEXT (UUID)
projectId       : TEXT (UUID)  → Project
parentId        : TEXT (UUID?) → WbsItem (self-ref, null = root)
code            : TEXT          — Kode otomatis (1, 1.1, 1.1.1)
name            : TEXT          — Nama pekerjaan
unit            : TEXT          — Satuan
type            : TEXT          — group / item
sortOrder       : INTEGER       — Urutan di level yang sama
wbsPath         : TEXT          — Materialized path (1.1.2.3) untuk query cepat
createdAt       : TEXT (ISO8601)
updatedAt       : TEXT (ISO8601)

UNIQUE: (projectId, code)
```

### VolumeItem
```
id              : TEXT (UUID)
wbsItemId       : TEXT (UUID)  → WbsItem (harus type=item)
ahsId           : TEXT (UUID?) → AHS yang dipilih
volume          : REAL          — Volume pekerjaan
unit            : TEXT          — Satuan (copy dari AHS)
formula         : TEXT          — Rumus (opsional, misal "6*4*0.12")
notes           : TEXT
createdAt       : TEXT (ISO8601)
updatedAt       : TEXT (ISO8601)

UNIQUE: (wbsItemId)
```

### RabSnapshot (hasil kalkulasi cache)
```
id              : TEXT (UUID)
projectId       : TEXT (UUID)  → Project
calculatedAt    : TEXT (ISO8601)
totalPrice      : REAL          — Total RAB (sebelum PPN & overhead)
ppn             : REAL          — PPN %
overhead        : REAL          — Overhead %
grandTotal      : REAL          — Total akhir
data            : TEXT (JSON)   — Snapshot detail item (untuk history)
```

### AppSetting
```
id              : TEXT (UUID)  — "default"
companyName     : TEXT
companyLogo     : TEXT (path)
reportHeader    : TEXT
ppnDefault      : REAL
createdAt       : TEXT (ISO8601)
updatedAt       : TEXT (ISO8601)
```

## Relasi Ringkas

```
Project  1──* WbsItem
WbsItem  1──* WbsItem (parent-children self-ref)
WbsItem  1──? VolumeItem
VolumeItem *──? AHS

AHS  1──* AhsComponentMaterial
AHS  1──* AhsComponentWage
AHS  1──* AhsComponentEquipment

AhsComponentMaterial *──1 Material
AhsComponentWage     *──1 Wage
AhsComponentEquipment*──1 Equipment

Project 1──* Ahs (project-specific)
Project 1──* RabSnapshot
```

## Database
- Engine: SQLite via `better-sqlite3`
- Migration: manual SQL atau Prisma ORM
- Backup: export file `.sqlite` atau dump SQL
