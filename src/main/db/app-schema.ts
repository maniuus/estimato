export interface Projek {
  id: number
  nama: string
  klien: string | null
  lokasi: string | null
  deskripsi: string | null
  created_at: string
  updated_at: string
}

export interface ProjekSetting {
  projek_id: number
  nama_perusahaan: string | null
  alamat: string | null
  telepon: string | null
  logo: string | null
  penanggung_jawab: string | null
  jabatan_pj: string | null
  disiapkan_nama: string | null
  disiapkan_jabatan: string | null
  diperiksa_nama: string | null
  diperiksa_jabatan: string | null
  disetujui_nama: string | null
  disetujui_jabatan: string | null
  catatan: string | null
}

export interface Rab {
  id: number
  projek_id: number
  nama: string
  ref_id: number | null
  overhead_pct: number
  created_at: string
  updated_at: string
}

export interface RabItem {
  id: number
  rab_id: number
  ref_item_id: number | null
  kode: string
  uraian: string
  satuan: string | null
  volume: number
  level: number
  parent_id: number | null
  is_user: number
  pos: number
}

export interface RabItemKomponen {
  id: number
  rab_item_id: number
  jenis: string | null
  uraian: string | null
  kode: string | null
  satuan: string | null
  koefisien: number | null
  harga_satuan: number | null
  pos: number
}

export interface RabVolumeRow {
  id: number
  rab_item_id: number
  uraian: string | null
  panjang: number | null
  lebar: number | null
  tinggi: number | null
  jumlah: number | null
  pos: number
}

export interface RabVolumeTulangan {
  id: number
  rab_volume_id: number
  posisi: string | null
  jenis: string | null
  diameter: number | null
  jumlah: number | null
  panjang: number | null
  pos: number
}

export interface RabProfil {
  id: number
  rab_id: number
  uraian: string | null
  jumlah: number | null
  // dimensi penampang (mm) & selimut beton (mm)
  lebar: number | null
  tinggi: number | null
  selimut: number | null
  // panjang bentang (m) & jarak sengkang (mm)
  panjang_bentang: number | null
  jarak_tumpuan: number | null
  jarak_lapangan: number | null
  // gambar penampang (data URL base64 JPEG/PNG)
  gambar: string | null
  pos: number
}

export interface RabProfilTulangan {
  id: number
  rab_profil_id: number
  posisi: string | null
  jenis: string | null
  diameter: number | null
  jumlah: number | null
  panjang: number | null
  pos: number
}

export interface RabJadwal {
  id: number
  rab_item_id: number
  durasi: number | null
  jumlah_pekerja: number | null
  tanggal_mulai: string | null
  tanggal_selesai: string | null
  pos: number
}

export interface RabDependensi {
  id: number
  jadwal_id: number
  pred_jadwal_id: number
  pos: number
}

export interface AnalisaUser {
  id: number
  kode: string
  uraian: string
  satuan: string | null
  parent_kode: string | null
  vol_ref: number | null
  pos: number
  created_at: string
  updated_at: string
}

export interface AnalisaUserKomponen {
  id: number
  analisa_id: number
  jenis: string | null
  uraian: string | null
  kode: string | null
  satuan: string | null
  koefisien: number | null
  harga_satuan: number | null
  ref_input1: number | null
  ref_input2: number | null
  pos: number
}

export interface KomponenUser {
  id: number
  jenis: string | null
  uraian: string
  kode: string | null
  satuan: string | null
  created_at: string
}

export const APP_SCHEMA = `
CREATE TABLE IF NOT EXISTS projek (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  klien TEXT,
  lokasi TEXT,
  deskripsi TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  projek_id INTEGER NOT NULL REFERENCES projek(id),
  nama TEXT NOT NULL,
  ref_id INTEGER,
  overhead_pct REAL NOT NULL DEFAULT 0.1,
  ppn_pct REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rab_projek ON rab(projek_id);
CREATE TABLE IF NOT EXISTS projek_setting (
  projek_id INTEGER PRIMARY KEY REFERENCES projek(id),
  nama_perusahaan TEXT,
  alamat TEXT,
  telepon TEXT,
  logo TEXT,
  penanggung_jawab TEXT,
  jabatan_pj TEXT,
  disiapkan_nama TEXT,
  disiapkan_jabatan TEXT,
  diperiksa_nama TEXT,
  diperiksa_jabatan TEXT,
  disetujui_nama TEXT,
  disetujui_jabatan TEXT,
  catatan TEXT
);
CREATE TABLE IF NOT EXISTS rab_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rab_id INTEGER NOT NULL REFERENCES rab(id),
  ref_item_id INTEGER,
  kode TEXT NOT NULL,
  uraian TEXT NOT NULL,
  satuan TEXT,
  volume REAL NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  parent_id INTEGER,
  is_user INTEGER NOT NULL DEFAULT 0,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_item_rab ON rab_item(rab_id);
CREATE INDEX IF NOT EXISTS idx_rab_item_parent ON rab_item(parent_id);
CREATE TABLE IF NOT EXISTS rab_item_komponen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rab_item_id INTEGER NOT NULL REFERENCES rab_item(id),
  jenis TEXT,
  uraian TEXT,
  kode TEXT,
  satuan TEXT,
  koefisien REAL,
  harga_satuan REAL,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_komponen_item ON rab_item_komponen(rab_item_id);
CREATE TABLE IF NOT EXISTS rab_volume (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rab_item_id INTEGER NOT NULL REFERENCES rab_item(id),
  uraian TEXT,
  panjang REAL,
  lebar REAL,
  tinggi REAL,
  jumlah REAL NOT NULL DEFAULT 1,
  gambar TEXT,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_volume_item ON rab_volume(rab_item_id);
CREATE TABLE IF NOT EXISTS rab_volume_tulangan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rab_volume_id INTEGER NOT NULL REFERENCES rab_volume(id),
  posisi TEXT,
  jenis TEXT,
  diameter REAL,
  jumlah REAL NOT NULL DEFAULT 1,
  panjang REAL NOT NULL DEFAULT 0,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_tulangan_vol ON rab_volume_tulangan(rab_volume_id);
CREATE TABLE IF NOT EXISTS rab_profil (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rab_id INTEGER NOT NULL REFERENCES rab(id),
  uraian TEXT,
  jumlah REAL NOT NULL DEFAULT 1,
  lebar REAL,
  tinggi REAL,
  selimut REAL,
  panjang_bentang REAL,
  jarak_tumpuan REAL,
  jarak_lapangan REAL,
  gambar TEXT,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_profil_rab ON rab_profil(rab_id);
CREATE TABLE IF NOT EXISTS rab_profil_tulangan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rab_profil_id INTEGER NOT NULL REFERENCES rab_profil(id),
  posisi TEXT,
  jenis TEXT,
  diameter REAL,
  jumlah REAL NOT NULL DEFAULT 1,
  panjang REAL NOT NULL DEFAULT 0,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_profil_tulangan_profil ON rab_profil_tulangan(rab_profil_id);
CREATE TABLE IF NOT EXISTS harga_katalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jenis TEXT NOT NULL,
  uraian TEXT NOT NULL,
  harga REAL,
  updated_at TEXT NOT NULL,
  UNIQUE(jenis, uraian)
);
CREATE TABLE IF NOT EXISTS rab_jadwal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rab_item_id INTEGER NOT NULL UNIQUE REFERENCES rab_item(id),
  durasi REAL,
  jumlah_pekerja REAL DEFAULT 1,
  tanggal_mulai TEXT,
  tanggal_selesai TEXT,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_jadwal_item ON rab_jadwal(rab_item_id);
CREATE TABLE IF NOT EXISTS rab_dependensi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jadwal_id INTEGER NOT NULL REFERENCES rab_jadwal(id),
  pred_jadwal_id INTEGER NOT NULL REFERENCES rab_jadwal(id),
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_dependensi_jadwal ON rab_dependensi(jadwal_id);
CREATE TABLE IF NOT EXISTS analisa_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL,
  uraian TEXT NOT NULL,
  satuan TEXT,
  parent_kode TEXT,
  vol_ref REAL,
  pos INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analisa_user_kode ON analisa_user(kode);
CREATE TABLE IF NOT EXISTS analisa_user_komponen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analisa_id INTEGER NOT NULL REFERENCES analisa_user(id),
  jenis TEXT,
  uraian TEXT,
  kode TEXT,
  satuan TEXT,
  koefisien REAL,
  harga_satuan REAL,
  ref_input1 REAL,
  ref_input2 REAL,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_analisa_komponen_analisa ON analisa_user_komponen(analisa_id);
CREATE TABLE IF NOT EXISTS komponen_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jenis TEXT NOT NULL,
  uraian TEXT NOT NULL,
  kode TEXT,
  satuan TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(jenis, uraian)
);
`
