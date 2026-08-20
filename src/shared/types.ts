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
  subtotal_rows: unknown
  df: unknown
  df_meaning: unknown
  df_note: string | null
  overhead_pct: number | null
  divisi_no?: string | null
  divisi_nama?: string | null
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

// baris tulangan dalam satu profil take-off (penulangan) — per volume row
export interface TulanganRow {
  id: number
  rab_volume_id: number
  posisi: string | null
  jenis: string | null
  diameter: number | null
  jumlah: number | null
  panjang: number | null
  pos: number
}

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
  ppn_pct: number
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
  divisi_nama?: string | null
  komponen?: RabItemKomponen[]
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

export interface ImportResult {
  divisi: number
  item: number
  item_with_card: number
  komponen: number
  master: number
  meta_id: number
}

export interface ItemSearchResult {
  id: number
  kode: string
  uraian: string
  satuan: string | null
  level: number
  parent_kode: string | null
  divisi_no: string | null
  divisi_nama: string | null
  tipe: string | null
  src?: 'ref' | 'user'
}

export interface MasterRow {
  id: number
  jenis: string
  uraian: string
  kode: string | null
  satuan: string | null
  count: number
  harga_satuan: number | null
}

// hasil pencarian komponen gabungan: ref_master_komponen + komponen_user
export interface KomponenResult {
  src: 'ref' | 'user'
  id: number
  jenis: string
  uraian: string
  kode: string | null
  satuan: string | null
  harga_satuan: number | null
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
  komponen_count?: number
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

export interface HitungResult {
  item: {
    id: number
    kode: string
    uraian: string
    satuan: string | null
    volume: number
    level: number
    is_user: number
  }
  subtotal: { A: number; B: number; C: number; D: number; E: number; F: number }
  komponen: (RabItemKomponen & { harga_satuan: number | null; harga_jumlah: number | null })[]
  overhead_pct: number
  total: number
}

export interface BomRow {
  jenis: string | null
  uraian: string | null
  kode: string | null
  satuan: string | null
  qty: number
  harga_satuan: number | null
  group: string
  total: number | null
}

export interface RabProfil {
  id: number
  rab_id: number
  uraian: string | null
  jumlah: number | null
  lebar: number | null
  tinggi: number | null
  selimut: number | null
  panjang_bentang: number | null
  jarak_tumpuan: number | null
  jarak_lapangan: number | null
  gambar: string | null
  pos: number
}

export interface ProfilTulangan {
  id: number
  rab_profil_id: number
  posisi: string | null
  jenis: string | null
  diameter: number | null
  jumlah: number | null
  panjang: number | null
  pos: number
}

export interface VolumeRow {
  id: number
  rab_item_id: number
  uraian: string | null
  panjang: number | null
  lebar: number | null
  tinggi: number | null
  jumlah: number | null
  gambar: string | null
  pos: number
  item_kode?: string
  item_uraian?: string
  item_satuan?: string
  volume?: number
}

export interface JadwalRow {
  id: number
  rab_item_id: number
  durasi: number | null
  jumlah_pekerja: number | null
  tanggal_mulai: string | null
  tanggal_selesai: string | null
  pos: number
  item_kode?: string
  item_uraian?: string
  item_satuan?: string
  item_level?: number
  item_parent?: number
  item_is_user?: number
  // hasil hitung CPM (frontend)
  es?: number | null
  ef?: number | null
  kritis?: boolean
}

export interface DependensiRow {
  id: number
  jadwal_id: number
  pred_jadwal_id: number
  pos: number
}

export interface Api {
  ref: {
    meta: () => Promise<RefMeta | null>
    import: (dataDir: string, asOf: string) => Promise<ImportResult>
    items: (q?: string, divisi?: string, limit?: number) => Promise<ItemSearchResult[]>
    parents: () => Promise<Array<{ kode: string; uraian: string; level: number; parent_kode: string | null; divisi_no: string | null; divisi_nama: string | null }>>
    item: (kode: string) => Promise<{ item: RefItem; komponen: RefKomponen[] } | null>
    master: (q?: string, jenis?: string) => Promise<MasterRow[]>
    masterBulk: (items: { id: number; hargaSatuan: number | null }[]) => Promise<{ updated: number }>
    besi: () => Promise<RefBesi[]>
  }
  projek: {
    list: () => Promise<Projek[]>
    create: (nama: string, klien?: string, lokasi?: string, deskripsi?: string) => Promise<Projek>
    update: (id: number, data: Partial<Pick<Projek, 'nama' | 'klien' | 'lokasi' | 'deskripsi'>>) => Promise<Projek>
    remove: (id: number) => Promise<{ ok: boolean }>
    setting: (projekId: number) => Promise<ProjekSetting | null>
    saveSetting: (projekId: number, data: Partial<Omit<ProjekSetting, 'projek_id'>>) => Promise<ProjekSetting>
  }
  rab: {
    list: (projekId: number) => Promise<Rab[]>
    meta: (rabId: number) => Promise<Rab | null>
    setPpn: (rabId: number, ppnPct: number) => Promise<Rab>
    create: (projekId: number, nama: string) => Promise<Rab>
    remove: (id: number) => Promise<{ ok: boolean }>
    items: (rabId: number) => Promise<RabItem[]>
    addItem: (rabId: number, kode: string, volume?: number) => Promise<RabItem>
    addUserItem: (rabId: number, parentId: number | null, uraian: string, satuan?: string, volume?: number) => Promise<RabItem>
    updateItem: (id: number, data: Partial<Pick<RabItem, 'uraian' | 'satuan' | 'volume'>>) => Promise<RabItem>
    removeItem: (id: number) => Promise<{ ok: boolean }>
    hitung: (rabId: number) => Promise<HitungResult[]>
    bom: (rabId: number) => Promise<BomRow[]>
    setHargaKomponen: (rabId: number, jenis: string | null, uraian: string | null, harga: number | null) => Promise<{ ok: boolean }>
    volumes: (rabId: number) => Promise<VolumeRow[]>
    addVolume: (rabItemId: number, uraian: string | null, panjang: number | null, lebar: number | null, tinggi: number | null, jumlah: number | null) => Promise<VolumeRow>
    updateVolume: (id: number, data: Partial<Pick<VolumeRow, 'uraian' | 'panjang' | 'lebar' | 'tinggi' | 'jumlah' | 'gambar'>>) => Promise<VolumeRow>
    removeVolume: (id: number) => Promise<{ ok: boolean }>
    tulangan: (rabVolumeId: number) => Promise<TulanganRow[]>
    addTulangan: (rabVolumeId: number, posisi: string | null, jenis: string | null, diameter: number | null, jumlah: number | null, panjang: number | null) => Promise<TulanganRow>
    updateTulangan: (id: number, data: Partial<Pick<TulanganRow, 'posisi' | 'jenis' | 'diameter' | 'jumlah' | 'panjang'>>) => Promise<TulanganRow>
    removeTulangan: (id: number) => Promise<{ ok: boolean }>
    profiles: (rabId: number) => Promise<RabProfil[]>
    addProfile: (rabId: number, data: { uraian: string | null; jumlah: number | null }) => Promise<RabProfil>
    updateProfile: (id: number, data: Partial<Pick<RabProfil, 'uraian' | 'jumlah' | 'lebar' | 'tinggi' | 'selimut' | 'panjang_bentang' | 'jarak_tumpuan' | 'jarak_lapangan' | 'gambar'>>) => Promise<RabProfil>
    removeProfile: (id: number) => Promise<{ ok: boolean }>
    profilTulangan: (rabProfilId: number) => Promise<ProfilTulangan[]>
    addProfilTulangan: (rabProfilId: number, posisi: string | null, jenis: string | null, diameter: number | null, jumlah: number | null, panjang: number | null) => Promise<ProfilTulangan>
    updateProfilTulangan: (id: number, data: Partial<Pick<ProfilTulangan, 'posisi' | 'jenis' | 'diameter' | 'jumlah' | 'panjang'>>) => Promise<ProfilTulangan>
    removeProfilTulangan: (id: number) => Promise<{ ok: boolean }>
    jadwal: (rabId: number) => Promise<JadwalRow[]>
    jadwalUpdate: (id: number, data: Partial<Pick<JadwalRow, 'durasi' | 'jumlah_pekerja' | 'tanggal_mulai' | 'tanggal_selesai'>>) => Promise<JadwalRow>
    dependensi: (jadwalId: number) => Promise<DependensiRow[]>
    addDependensi: (jadwalId: number, predJadwalId: number) => Promise<DependensiRow>
    removeDependensi: (id: number) => Promise<{ ok: boolean }>
  }
  report: {
    pdf: (html: string, defaultName?: string) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
  }
  komponen: {
    search: (q?: string, jenis?: string, limit?: number) => Promise<KomponenResult[]>
    create: (data: { jenis: string; uraian: string; kode?: string | null; satuan?: string | null; harga?: number | null }) => Promise<KomponenResult>
  }
  analisa: {
    list: () => Promise<AnalisaUser[]>
    get: (id: number) => Promise<{ analisa: AnalisaUser; komponen: AnalisaUserKomponen[] } | null>
    save: (data: { id?: number; kode: string; uraian: string; satuan?: string | null; parent_kode?: string | null; vol_ref?: number | null; komponen: Array<{ jenis: string; uraian: string; kode?: string | null; satuan?: string | null; koefisien: number; harga_satuan: number | null; ref_input1?: number | null; ref_input2?: number | null }> }) => Promise<AnalisaUser>
    remove: (id: number) => Promise<{ ok: boolean }>
    addToRab: (rabId: number, analisaId: number, volume?: number) => Promise<RabItem>
  }
}
