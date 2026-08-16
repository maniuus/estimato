export interface RefMeta {
  id: number
  kode: string
  nama: string
  jenis: string
  bidang: string
  as_of: string
  imported_at: string
  file_json: string
}

export interface RefDivisi {
  id: number
  no: string
  nama: string
}

export interface RefItem {
  id: number
  kode: string
  uraian: string
  satuan: string | null
  level: number
  parent_kode: string | null
  tipe: string | null
  source_status: string | null
  synthetic: number
  subtotal_rows: string | null
  df: string | null
  df_meaning: string | null
  df_note: string | null
  overhead_pct: number | null
}

export interface RefKomponen {
  id: number
  item_id: number
  jenis: string | null
  uraian: string | null
  kode: string | null
  satuan: string | null
  koefisien: number | null
  ref: string | null
  pos: number
}

export interface RefMasterKomponen {
  id: number
  jenis: string
  uraian: string
  kode: string | null
  satuan: string | null
  count: number
}

export interface RefBesi {
  id: number
  diameter: number
  berat_kg_per_m: number
}

export const REF_SCHEMA = `
CREATE TABLE IF NOT EXISTS ref_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  jenis TEXT NOT NULL,
  bidang TEXT NOT NULL,
  as_of TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  file_json TEXT
);
CREATE TABLE IF NOT EXISTS ref_divisi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  no TEXT NOT NULL,
  nama TEXT NOT NULL,
  UNIQUE(no)
);
CREATE TABLE IF NOT EXISTS ref_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  uraian TEXT NOT NULL,
  satuan TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  parent_kode TEXT,
  tipe TEXT,
  source_status TEXT,
  synthetic INTEGER NOT NULL DEFAULT 0,
  subtotal_rows TEXT,
  df TEXT,
  df_meaning TEXT,
  df_note TEXT,
  overhead_pct REAL
);
CREATE INDEX IF NOT EXISTS idx_ref_item_parent ON ref_item(parent_kode);
CREATE TABLE IF NOT EXISTS ref_komponen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES ref_item(id),
  jenis TEXT,
  uraian TEXT,
  kode TEXT,
  satuan TEXT,
  koefisien REAL,
  ref TEXT,
  pos INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ref_komponen_item ON ref_komponen(item_id);
CREATE TABLE IF NOT EXISTS ref_master_komponen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jenis TEXT NOT NULL,
  uraian TEXT NOT NULL,
  kode TEXT,
  satuan TEXT,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(jenis, uraian)
);
CREATE TABLE IF NOT EXISTS ref_besi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diameter REAL NOT NULL UNIQUE,
  berat_kg_per_m REAL NOT NULL
);
`
