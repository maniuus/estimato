import { Fragment, useEffect, useMemo, useState } from 'react'
import type { BomRow, DependensiRow, HitungResult, ItemSearchResult, JadwalRow, ProfilTulangan, RabItem, RabItemKomponen, RabProfil, RefBesi, VolumeRow } from '../../../shared/types'
import { fmt, fmtInputNum, fmtRp, fmtRpShort, parseInputNum, terbilang } from '../lib/format'

const JENIS_LABEL: Record<string, string> = {
  tenaga_kerja: 'Tenaga Kerja',
  bahan: 'Bahan',
  alat: 'Alat'
}

const cmpKode = (a: string, b: string) => {
  const pa = a.split('.')
  const pb = b.split('.')
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const sa = pa[i] ?? ''
    const sb = pb[i] ?? ''
    const na = /^\d+$/.test(sa) ? Number(sa) : sa
    const nb = /^\d+$/.test(sb) ? Number(sb) : sb
    if (na !== nb) return typeof na === 'number' && typeof nb === 'number' ? na - nb : String(na).localeCompare(String(nb))
  }
  return pa.length - pb.length
}

// volume per baris take-off — sama dengan rowVolume di ipc.ts
const rowVol = (sat: string | null, r: { panjang?: number | null; lebar?: number | null; tinggi?: number | null; jumlah?: number | null }) => {
  const s = String(sat ?? '').toLowerCase()
  const p = r.panjang ?? 0
  const l = r.lebar ?? 0
  const t = r.tinggi ?? 0
  const j = r.jumlah ?? 1
  if (s === 'm1' || s === "m'") return p * j
  if (s === 'm2') return p * l * j
  if (s === 'm3') return p * l * t * j
  return j
}

const emptyForm = () => ({ uraian: '', panjang: '', lebar: '', tinggi: '', jumlah: '' })

// berat besi (kg) per baris tulangan: batang 12m = ceil(total panjang / 12), berat = batang × 12 × d²/162,1
const beratTulangan = (t: { diameter?: number | null; jumlah?: number | null; panjang?: number | null }, nProfil: number) => {
  const d = t.diameter ?? 0
  const j = t.jumlah ?? 1
  const p = t.panjang ?? 0
  const total = nProfil * j * p
  if (total <= 0) return 0
  const batang = Math.ceil(total / 12)
  return batang * 12 * (Math.pow(d, 2) / 162.1)
}

// item penulangan: kode prefix 2.2.1.1
const isPenulangan = (kode: string | null | undefined) => String(kode ?? '').startsWith('2.2.1.1')

// kebutuhan batang 12m dari total panjang (untuk ringkasan)
const batangDariTotal = (total: number) => (total <= 0 ? 0 : Math.ceil(total / 12))

// hitung jumlah & panjang sengkang otomatis dari dimensi penampang (mm) — mirror hitungSengkang di ipc.ts.
// SNI: tumpuan L/4 tiap ujung (total L/2), lapangan L/2 tengah; jumlah = ceil(bagian/jarak)+1 tiap batas.
// Panjang sengkang = 2(b-2c + h-2c) + 2×6d (hook), dalam meter. Null bila dimensi tak lengkap.
const hitungSengkang = (p: { lebar: number | null; tinggi: number | null; selimut: number | null; panjang_bentang: number | null; jarak_tumpuan: number | null; jarak_lapangan: number | null }, d: number): { jumlah: number; panjang: number } | null => {
  const b = p.lebar, h = p.tinggi, c = p.selimut, L = p.panjang_bentang, sT = p.jarak_tumpuan, sL = p.jarak_lapangan
  if (b == null || h == null || c == null || L == null || sT == null || sL == null) return null
  if (b <= 0 || h <= 0 || sT <= 0 || sL <= 0 || b <= 2 * c || h <= 2 * c) return null
  const panjang = (2 * (b - 2 * c + h - 2 * c) + 2 * 6 * d) / 1000
  const Lmm = L * 1000
  const nTumpuan = 2 * (Math.ceil(Lmm / 4 / sT) + 1)
  const nLapangan = Math.ceil(Lmm / 2 / sL) + 1
  return { panjang, jumlah: nTumpuan + nLapangan }
}

// kategori tulangan dari uraian item analisa penulangan: BjTP=polos, BjTS=ulir, diameter <12/≥12
const tulanganKategori = (uraian: string | null | undefined): { jenis: string | null; lt12: boolean | null } => {
  const u = String(uraian ?? '')
  let jenis: string | null = null
  if (u.includes('BjTP')) jenis = 'polos'
  else if (u.includes('BjTS')) jenis = 'ulir'
  let lt12: boolean | null = null
  if (/diameter\s*<\s*12/.test(u)) lt12 = true
  else if (/diameter\s*(≥|>=)\s*12/.test(u)) lt12 = false
  return { jenis, lt12 }
}

// baris tulangan cocok dengan kategori item analisa?
const cocokTulangan = (t: { jenis?: string | null; diameter?: number | null }, kat: { jenis: string | null; lt12: boolean | null }): boolean => {
  if (kat.jenis && (t.jenis ?? '') !== kat.jenis) return false
  if (kat.lt12 !== null && ((t.diameter ?? 0) < 12) !== kat.lt12) return false
  return true
}

// pembulatan grand total: ke atas ke kelipatan 100.000
const PEMBULATAN = 100000
const roundUp = (n: number) => Math.ceil(n / PEMBULATAN) * PEMBULATAN

// ---- Jadwal: durasi otomatis dari tenaga kerja ----
// OH (orang-hari) total = volume × Σ koefisien tenaga kerja; durasi = ceil(OH / jumlah pekerja).
const OH_TK = /tenaga kerja/i
export function ohTenagaKerja(h: HitungResult | undefined): number {
  if (!h) return 0
  return (h.komponen ?? []).filter((k) => OH_TK.test(String(k.jenis ?? ''))).reduce((s, k) => s + (k.koefisien ?? 0), 0)
}
export function durasiOtomatis(h: HitungResult | undefined, pekerja: number | null | undefined): number | null {
  const oh = ohTenagaKerja(h)
  if (oh <= 0) return null
  const p = Math.max(1, Math.round(pekerja ?? 1) || 1)
  const vol = h?.item.volume ?? 0
  return Math.max(1, Math.ceil((vol * oh) / p))
}

// ---- Jadwal & WBS: CPM (earliest start/finish + jalur kritis) ----
// es/ef dalam hari kalender offset (hari ke-1 = mulai proyek).
export function hitungCPM(rows: { id: number; durasi: number | null; es?: number | null; ef?: number | null }[], depen: Map<number, number[]>) {
  const dur = new Map<number, number>()
  for (const r of rows) dur.set(r.id, Math.max(1, Math.round(r.durasi ?? 1)))
  // forward pass
  const es = new Map<number, number>()
  const ef = new Map<number, number>()
  const visited = new Set<number>()
  const visit = (id: number): number => {
    if (visited.has(id)) return ef.get(id) ?? 0
    visited.add(id)
    const preds = depen.get(id) ?? []
    let start = 1
    for (const p of preds) {
      const pef = visit(p)
      if (pef + 1 > start) start = pef + 1
    }
    const d = dur.get(id) ?? 1
    es.set(id, start)
    ef.set(id, start + d - 1)
    return ef.get(id) ?? 0
  }
  for (const r of rows) visit(r.id)
  // backward pass (untuk slack / jalur kritis)
  const succ = new Map<number, number[]>()
  for (const [id, preds] of depen) for (const p of preds) {
    const arr = succ.get(p) ?? []
    arr.push(id)
    succ.set(p, arr)
  }
  const maxEf = Math.max(0, ...[...ef.values()])
  const lf = new Map<number, number>()
  const ls = new Map<number, number>()
  const visitBack = (id: number): number => {
    if (lf.has(id)) return lf.get(id) ?? 0
    const kids = succ.get(id) ?? []
    let finish = maxEf
    if (kids.length > 0) {
      const minLs = Math.min(...kids.map((k) => visitBack(k) - (dur.get(k) ?? 1) + 1))
      finish = minLs
    }
    const d = dur.get(id) ?? 1
    lf.set(id, finish)
    ls.set(id, finish - d + 1)
    return finish
  }
  for (const r of rows) visitBack(r.id)
  return rows.map((r) => ({
    id: r.id,
    es: es.get(r.id) ?? 1,
    ef: ef.get(r.id) ?? 1,
    ls: ls.get(r.id) ?? null,
    lf: lf.get(r.id) ?? null,
    kritis: (es.get(r.id) ?? 0) === (ls.get(r.id) ?? -1)
  }))
}

// tanggal ISO (yyyy-mm-dd) + n hari → tanggal ISO
export function addDays(iso: string | null, n: number): string {
  const base = iso && !Number.isNaN(new Date(iso).getTime()) ? new Date(iso) : new Date()
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function RabBuilderPage({
  rabId,
  rabNama,
  onBack
}: {
  rabId: number
  rabNama: string
  onBack: () => void
}) {
  const [items, setItems] = useState<RabItem[]>([])
  const [volumes, setVolumes] = useState<VolumeRow[]>([])
  const [hitung, setHitung] = useState<HitungResult[]>([])
  const [bom, setBom] = useState<BomRow[]>([])
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; s: string } | null>(null)

  const [active, setActive] = useState<string>('daftar')
  const [volTarget, setVolTarget] = useState<number | null>(null)
  const [selItem, setSelItem] = useState<number | null>(null)
  const [selVolItem, setSelVolItem] = useState<number | null>(null)

  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ItemSearchResult[]>([])

  const [uUraian, setUUraian] = useState('')
  const [uSatuan, setUSatuan] = useState('')
  const [minRef, setMinRef] = useState(false)
  const [minUser, setMinUser] = useState(false)
  const [minBesi, setMinBesi] = useState(false)
  // profil yang sedang diedit di sidebar (tab Besi) — pilih lewat main view / pemilih
  const [selProfil, setSelProfil] = useState<number | null>(null)
  // komponen BOM yang sedang diedit di sidebar (tab BOM) — key `${jenis}|${uraian}|${kode}|${satuan}`
  const [selBom, setSelBom] = useState<string | null>(null)
  // teks input harga BOM saat diketik (key selBom → raw string), agar bisa format ribuan
  const [bomHarga, setBomHarga] = useState<Record<string, string>>({})

  // jadwal & WBS
  const [jadwal, setJadwal] = useState<JadwalRow[]>([])
  const [depen, setDepen] = useState<Record<number, DependensiRow[]>>({})
  const [selJadwal, setSelJadwal] = useState<number | null>(null)
  const [jMulai, setJMulai] = useState<string>('')

  // form take-off per item (id item → field string)
  const [vf, setVf] = useState<Record<number, { uraian: string; panjang: string; lebar: string; tinggi: string; jumlah: string }>>({})
  // edit sel baris take-off (id baris → field string), supaya input inline tetap bisa ketik sebelum blur
  const [edit, setEdit] = useState<Record<number, Record<string, string>>>({})
  // edit harga satuan komponen di sidebar (id komponen → string), supaya bisa ketik sebelum blur
  const [hEdit, setHEdit] = useState<Record<number, string>>({})

  // referensi besi (diameter → berat/m) + profil struktur level RAB + sub-tulangan
  const [besi, setBesi] = useState<RefBesi[]>([])
  const [profiles, setProfiles] = useState<RabProfil[]>([])
  const [ptul, setPtul] = useState<Record<number, ProfilTulangan[]>>({})
  // form tambah profil (uraian, jumlah) + form tambah tulangan per profil
  const [pf, setPf] = useState<{ uraian: string; jumlah: string }>({ uraian: '', jumlah: '' })
  const [ptf, setPtf] = useState<Record<number, { posisi: string; jenis: string; diameter: string; jumlah: string; panjang: string }>>({})
  // edit sel (id baris → field string), supaya bisa ketik sebelum blur
  const [pEdit, setPEdit] = useState<Record<number, Record<string, string>>>({})
  const [ptEdit, setPtEdit] = useState<Record<number, Record<string, string>>>({})

  const emptyPt = () => ({ posisi: 'utama', jenis: 'polos', diameter: '', jumlah: '1', panjang: '' })

  useEffect(() => {
    window.api.ref.besi().then(setBesi)
  }, [])

  const load = async () => {
    const [it, v, h, b, pr, jd] = await Promise.all([
      window.api.rab.items(rabId),
      window.api.rab.volumes(rabId),
      window.api.rab.hitung(rabId),
      window.api.rab.bom(rabId),
      window.api.rab.profiles(rabId),
      window.api.rab.jadwal(rabId)
    ])
    setItems(it)
    setVolumes(v)
    setHitung(h)
    setBom(b)
    setProfiles(pr)
    setJadwal(jd)
    const pt = await Promise.all(pr.map((p) => window.api.rab.profilTulangan(p.id)))
    const map: Record<number, ProfilTulangan[]> = {}
    pr.forEach((p, i) => { map[p.id] = pt[i] ?? [] })
    setPtul(map)
    const dp = await Promise.all(jd.map((j) => window.api.rab.dependensi(j.id)))
    const dmap: Record<number, DependensiRow[]> = {}
    jd.forEach((j, i) => { dmap[j.id] = dp[i] ?? [] })
    setDepen(dmap)
  }

  useEffect(() => {
    load()
  }, [rabId])

  // auto-scroll ke blok item di tab Volume ketika klik tombol Vol
  useEffect(() => {
    if (active === 'volume' && volTarget != null) {
      const el = document.getElementById(`vol-${volTarget}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setVolTarget(null)
    }
  }, [active, volTarget, volumes])

  const doSearch = async (q?: string) => {
    const query = (q ?? search).trim()
    if (!query) return
    setResults(await window.api.ref.items(query))
  }

  // Live search: hasil muncul otomatis saat ketik (debounce 300ms)
  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setResults([])
      return
    }
    const t = setTimeout(() => doSearch(q), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const addKode = async (kode: string) => {
    const created = await window.api.rab.addItem(rabId, kode, 0)
    setMsg({ t: 'ok', s: `Item "${kode}" ditambahkan.` })
    setResults([])
    setSearch('')
    if (created) setSelItem(Number(created.id))
    load()
  }

  const addUserItem = async () => {
    if (!uUraian.trim()) {
      setMsg({ t: 'err', s: 'Uraian item user wajib diisi' })
      return
    }
    const parent = items.find((i) => i.parent_id === null && i.level > 0) ?? null
    const created = await window.api.rab.addUserItem(rabId, parent ? parent.id : null, uUraian.trim(), uSatuan.trim() || undefined, 0)
    setMsg({ t: 'ok', s: 'Item userdefined ditambahkan.' })
    setUUraian('')
    setUSatuan('')
    if (created) setSelItem(Number(created.id))
    load()
  }

  const removeItem = async (it: RabItem) => {
    if (!confirm(`Hapus item "${it.uraian}" dari RAB?`)) return
    await window.api.rab.removeItem(it.id)
    if (selItem === it.id) setSelItem(null)
    if (selVolItem === it.id) setSelVolItem(null)
    load()
  }

  const setHargaBom = async (row: BomRow, v: string) => {
    const harga = v === '' ? null : Number(v)
    await window.api.rab.setHargaKomponen(rabId, row.jenis, row.uraian, Number.isNaN(harga as number) ? null : harga)
    load()
  }

  // set harga satuan komponen dari sidebar (via rab_item_komponen), sinkron ke harga_katalog + snapshot semua item
  const setHargaKomponen = async (k: RabItemKomponen, v: string) => {
    const harga = v === '' ? null : Number(v)
    await window.api.rab.setHargaKomponen(rabId, k.jenis, k.uraian, Number.isNaN(harga as number) ? null : harga)
    load()
  }

  // ---- take-off ----
  const addVolRow = async (itemId: number) => {
    const f = vf[itemId] ?? emptyForm()
    const num = (s: string) => (s === '' ? null : Number(s))
    await window.api.rab.addVolume(itemId, f.uraian.trim() || null, num(f.panjang), num(f.lebar), num(f.tinggi), num(f.jumlah))
    setVf((prev) => ({ ...prev, [itemId]: emptyForm() }))
    load()
  }

  const rowVal = (r: VolumeRow, field: keyof VolumeRow) => {
    const raw = edit[r.id]?.[field]
    if (raw !== undefined) return raw
    const v = r[field] as number | string | null | undefined
    return v == null ? '' : String(v)
  }

  const setRowField = (id: number, field: string, raw: string) => {
    setEdit((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: raw } }))
  }

  const saveRow = async (r: VolumeRow, field: string, raw: string) => {
    const data: Partial<Pick<VolumeRow, 'uraian' | 'panjang' | 'lebar' | 'tinggi' | 'jumlah'>> =
      field === 'uraian'
        ? { uraian: raw }
        : { [field]: raw === '' ? null : Number(raw) } as Partial<Pick<VolumeRow, 'panjang' | 'lebar' | 'tinggi' | 'jumlah'>>
    await window.api.rab.updateVolume(r.id, data)
    setEdit((prev) => {
      const n = { ...prev }
      delete n[r.id]
      return n
    })
    load()
  }

  const removeVol = async (r: VolumeRow) => {
    if (!confirm('Hapus baris take-off ini?')) return
    await window.api.rab.removeVolume(r.id)
    load()
  }

  // ---- profil struktur level RAB + sub-tulangan (penulangan) ----
  const addProfile = async () => {
    if (!pf.uraian.trim()) {
      setMsg({ t: 'err', s: 'Uraian profil wajib diisi' })
      return
    }
    const created = await window.api.rab.addProfile(rabId, { uraian: pf.uraian.trim(), jumlah: pf.jumlah === '' ? null : Number(pf.jumlah) })
    setPf({ uraian: '', jumlah: '' })
    if (created?.id != null) setSelProfil(created.id)
    load()
  }

  const addProfilTulangan = async (profilId: number) => {
    const f = ptf[profilId] ?? emptyPt()
    const num = (s: string) => (s === '' ? null : Number(s))
    await window.api.rab.addProfilTulangan(profilId, f.posisi || null, f.jenis || null, num(f.diameter), num(f.jumlah), num(f.panjang))
    setPtf((prev) => ({ ...prev, [profilId]: emptyPt() }))
    load()
  }

  const pVal = (p: RabProfil, field: keyof RabProfil) => {
    const raw = pEdit[p.id]?.[field]
    if (raw !== undefined) return raw
    const v = p[field] as number | string | null | undefined
    return v == null ? '' : String(v)
  }

  const setPField = (id: number, field: string, raw: string) => {
    setPEdit((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: raw } }))
  }

  const saveProfile = async (p: RabProfil, field: string, raw: string) => {
    const data: Partial<Pick<RabProfil, 'uraian' | 'jumlah' | 'lebar' | 'tinggi' | 'selimut' | 'panjang_bentang' | 'jarak_tumpuan' | 'jarak_lapangan'>> =
      field === 'uraian'
        ? { uraian: raw }
        : { [field]: raw === '' ? null : Number(raw) } as Partial<Pick<RabProfil, 'jumlah' | 'lebar' | 'tinggi' | 'selimut' | 'panjang_bentang' | 'jarak_tumpuan' | 'jarak_lapangan'>>
    await window.api.rab.updateProfile(p.id, data)
    setPEdit((prev) => {
      const n = { ...prev }
      delete n[p.id]
      return n
    })
    load()
  }

  // gambar penampang profil — data URL base64 (JPEG/PNG)
  const saveGambar = async (p: RabProfil, file: File | null) => {
    if (!file) return
    if (!/image\/(jpeg|png)/.test(file.type)) {
      alert('Hanya gambar JPEG atau PNG yang diterima.')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      await window.api.rab.updateProfile(p.id, { gambar: reader.result as string })
      load()
    }
    reader.readAsDataURL(file)
  }

  const hapusGambar = async (p: RabProfil) => {
    await window.api.rab.updateProfile(p.id, { gambar: null })
    load()
  }

  const removeProfile = async (p: RabProfil) => {
    if (!confirm(`Hapus profil "${p.uraian}" beserta seluruh baris tulangannya?`)) return
    await window.api.rab.removeProfile(p.id)
    if (selProfil === p.id) setSelProfil(null)
    load()
  }

  const ptVal = (t: ProfilTulangan, field: keyof ProfilTulangan) => {
    const raw = ptEdit[t.id]?.[field]
    if (raw !== undefined) return raw
    const v = t[field] as number | string | null | undefined
    return v == null ? '' : String(v)
  }

  const setPtField = (id: number, field: string, raw: string) => {
    setPtEdit((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: raw } }))
  }

  const saveProfilTulangan = async (t: ProfilTulangan, field: string, raw: string) => {
    const data: Partial<Pick<ProfilTulangan, 'posisi' | 'jenis' | 'diameter' | 'jumlah' | 'panjang'>> =
      field === 'jenis' || field === 'posisi'
        ? { [field]: raw }
        : { [field]: raw === '' ? null : Number(raw) } as Partial<Pick<ProfilTulangan, 'diameter' | 'jumlah' | 'panjang'>>
    await window.api.rab.updateProfilTulangan(t.id, data)
    setPtEdit((prev) => {
      const n = { ...prev }
      delete n[t.id]
      return n
    })
    load()
  }

  const removeProfilTulangan = async (t: ProfilTulangan) => {
    if (!confirm('Hapus baris tulangan ini?')) return
    await window.api.rab.removeProfilTulangan(t.id)
    load()
  }

  // posisi+jenis digabung satu select (Utama·Polos / Utama·Ulir / Sengkang·Polos / Sengkang·Ulir)
  const savePosisiJenis = async (t: ProfilTulangan, val: string) => {
    const [posisi, jenis] = val.split('|')
    setPtEdit((prev) => ({ ...prev, [t.id]: { ...(prev[t.id] ?? {}), posisi, jenis } }))
    await window.api.rab.updateProfilTulangan(t.id, { posisi, jenis })
    setPtEdit((prev) => {
      const n = { ...prev }
      delete n[t.id]
      return n
    })
    load()
  }

  // ringkasan FULL LIST berat besi atas semua profil level RAB, per posisi × polos/ulir × <12/≥12
  const besiFull = useMemo(() => {
    type Sel = { polos_lt: number; polos_ge: number; ulir_lt: number; ulir_ge: number; total: number }
    const empty = (): Sel => ({ polos_lt: 0, polos_ge: 0, ulir_lt: 0, ulir_ge: 0, total: 0 })
    const utama = empty()
    const sengkang = empty()
    let total = 0
    for (const p of profiles) {
      const nProfil = p.jumlah ?? 1
      for (const t of ptul[p.id] ?? []) {
        const isSk = (t.posisi ?? 'utama') === 'sengkang'
        const sk = isSk ? hitungSengkang(p, t.diameter ?? 0) : null
        const utPanj = !isSk && p.panjang_bentang != null ? p.panjang_bentang : null
        const effW = sk ? { diameter: t.diameter, jumlah: sk.jumlah, panjang: sk.panjang }
          : utPanj != null ? { diameter: t.diameter, jumlah: t.jumlah, panjang: p.panjang_bentang }
          : null
        const w = effW ? beratTulangan(effW, nProfil) : beratTulangan(t, nProfil)
        const s = isSk ? sengkang : utama
        const d = t.diameter ?? 0
        if ((t.jenis ?? '') === 'ulir') (d < 12 ? (s.ulir_lt += w) : (s.ulir_ge += w))
        else (d < 12 ? (s.polos_lt += w) : (s.polos_ge += w))
        s.total += w
        total += w
      }
    }
    return { utama, sengkang, total }
  }, [profiles, ptul])

  // kebutuhan batang 12m per diameter × jenis (polos/ulir) — Σ total panjang efektif (utama=bentang, sengkang=hitungSengkang)
  const besiBatang = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of profiles) {
      const nProfil = p.jumlah ?? 1
      for (const t of ptul[p.id] ?? []) {
        const d = t.diameter ?? 0
        if (d <= 0) continue
        const isSk = (t.posisi ?? 'utama') === 'sengkang'
        const sk = isSk ? hitungSengkang(p, d) : null
        const utPanj = !isSk && p.panjang_bentang != null ? p.panjang_bentang : null
        const panj = sk ? sk.panjang : utPanj != null ? utPanj : (t.panjang ?? 0)
        const jml = sk ? sk.jumlah : (t.jumlah ?? 1)
        const jenis = (t.jenis ?? '') === 'ulir' ? 'ulir' : 'polos'
        const key = `${jenis}|${d}`
        map.set(key, (map.get(key) ?? 0) + nProfil * jml * panj)
      }
    }
    return [...map.entries()]
      .sort((a, b) => (a[0].split('|')[1] as unknown as number) - (b[0].split('|')[1] as unknown as number))
      .map(([key, total]) => {
        const [jenis, d] = key.split('|')
        return { jenis, diameter: Number(d), total, batang: batangDariTotal(total) }
      })
  }, [profiles, ptul])

  const totalRAB = useMemo(() => hitung.reduce((s, h) => s + (h.total ?? 0), 0), [hitung])
  const hByItem = useMemo(() => new Map(hitung.map((h) => [h.item.id, h])), [hitung])

  // kebutuhan batang 12m per profil — Σ total panjang efektif (utama=bentang, sengkang=hitungSengkang)
  const batangPerProfil = useMemo(() => {
    const map = new Map<number, { jenis: string; diameter: number; total: number; batang: number }[]>()
    for (const p of profiles) {
      const nProfil = p.jumlah ?? 1
      const m = new Map<string, number>()
      for (const t of ptul[p.id] ?? []) {
        const d = t.diameter ?? 0
        if (d <= 0) continue
        const isSk = (t.posisi ?? 'utama') === 'sengkang'
        const sk = isSk ? hitungSengkang(p, d) : null
        const utPanj = !isSk && p.panjang_bentang != null ? p.panjang_bentang : null
        const panj = sk ? sk.panjang : utPanj != null ? utPanj : (t.panjang ?? 0)
        const jml = sk ? sk.jumlah : (t.jumlah ?? 1)
        const jenis = (t.jenis ?? '') === 'ulir' ? 'ulir' : 'polos'
        const key = `${jenis}|${d}`
        m.set(key, (m.get(key) ?? 0) + nProfil * jml * panj)
      }
      const rows = [...m.entries()]
        .sort((a, b) => (a[0].split('|')[1] as unknown as number) - (b[0].split('|')[1] as unknown as number))
        .map(([key, total]) => {
          const [jenis, d] = key.split('|')
          return { jenis, diameter: Number(d), total, batang: batangDariTotal(total) }
        })
      map.set(p.id, rows)
    }
    return map
  }, [profiles, ptul])

  // Daftar item dikelompokkan per divisi, urut kode natural, + total anggaran per divisi
  const grouped = useMemo(() => {
    const sorted = [...items].sort((a, b) => cmpKode(a.kode, b.kode))
    const map = new Map<string, { nama: string | null; list: RabItem[] }>()
    for (const it of sorted) {
      const div = it.kode.split('.')[0] || '-'
      const g = map.get(div) ?? { nama: it.divisi_nama ?? null, list: [] }
      g.list.push(it)
      map.set(div, g)
    }
    return [...map.entries()].map(([div, g]) => ({
      div,
      nama: g.nama,
      list: g.list,
      total: g.list.reduce((s, it) => s + (hByItem.get(it.id)?.total ?? 0), 0)
    }))
  }, [items, hByItem])

  const volByItem = useMemo(() => {
    const map = new Map<number, VolumeRow[]>()
    for (const v of volumes) {
      const arr = map.get(v.rab_item_id) ?? []
      arr.push(v)
      map.set(v.rab_item_id, arr)
    }
    return map
  }, [volumes])

  const bomGroups = useMemo(() => {
    const map = new Map<string, BomRow[]>()
    for (const r of bom) {
      const arr = map.get(r.group) ?? []
      arr.push(r)
      map.set(r.group, arr)
    }
    return [...map.entries()]
  }, [bom])

  // ---- Jadwal: CPM + pemetaan ----
  // depenMap: jadwalId → daftar pred jadwalId
  const depenMap = useMemo(() => {
    const m = new Map<number, number[]>()
    for (const id of Object.keys(depen)) {
      const preds = (depen[Number(id)] ?? []).map((d) => d.pred_jadwal_id)
      m.set(Number(id), preds)
    }
    return m
  }, [depen])

  const jadwalCpm = useMemo(() => {
    const rows = jadwal.map((j) => ({ id: j.id, durasi: j.durasi }))
    return hitungCPM(rows, depenMap)
  }, [jadwal, depenMap])

  // jadwalById: rab_item_id → JadwalRow
  const jadwalByItem = useMemo(() => {
    const m = new Map<number, JadwalRow>()
    for (const j of jadwal) m.set(j.rab_item_id, j)
    return m
  }, [jadwal])

  const cpmById = useMemo(() => {
    const m = new Map<number, { es: number; ef: number; ls: number | null; lf: number | null; kritis: boolean }>()
    for (const c of jadwalCpm) m.set(c.id, c)
    return m
  }, [jadwalCpm])

  const simpanJadwal = async (j: JadwalRow, field: 'durasi' | 'jumlah_pekerja' | 'tanggal_mulai' | 'tanggal_selesai', raw: string) => {
    const data: Partial<Pick<JadwalRow, 'durasi' | 'jumlah_pekerja' | 'tanggal_mulai' | 'tanggal_selesai'>> =
      field === 'durasi'
        ? { durasi: raw === '' ? null : Math.max(1, Math.round(Number(raw) || 1)) }
        : field === 'jumlah_pekerja'
          ? { jumlah_pekerja: raw === '' ? null : Math.max(1, Math.round(Number(raw) || 1)) }
          : { [field]: raw === '' ? null : raw }
    await window.api.rab.jadwalUpdate(j.id, data)
    load()
  }

  const terapkanDurasiAuto = async (j: JadwalRow) => {
    const d = durasiOtomatis(hByItem.get(j.rab_item_id), j.jumlah_pekerja ?? 1)
    if (d == null) return
    await window.api.rab.jadwalUpdate(j.id, { durasi: d })
    load()
  }

  const tambahDependensi = async (j: JadwalRow, predJadwalId: number) => {
    await window.api.rab.addDependensi(j.id, predJadwalId)
    load()
  }

  const hapusDependensi = async (d: DependensiRow) => {
    await window.api.rab.removeDependensi(d.id)
    load()
  }

  const renderKomponenCard = (h: HitungResult) => (
    <div key={h.item.id}>
      <div className="row">
        <div className="msg ok">
          {h.item.kode} — {h.item.uraian} · vol {fmt(h.item.volume)} {h.item.satuan ?? ''}
        </div>
        <button onClick={() => removeItem(items.find((i) => i.id === h.item.id)!)}>Hapus</button>
      </div>
      <table className="mt">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>No</th>
            <th>Komponen</th>
            <th style={{ width: '9%' }}>Kode</th>
            <th style={{ width: '7%' }} className="num">Sat</th>
            <th style={{ width: '10%' }} className="num">Koef</th>
            <th style={{ width: '16%' }} className="num">Harga Satuan</th>
            <th style={{ width: '16%' }} className="num">Harga Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const gOf = (j: string | null) => (/tenaga kerja/i.test(j ?? '') ? 'A' : /bahan/i.test(j ?? '') ? 'B' : /peralatan/i.test(j ?? '') ? 'C' : null)
            let last = null as string | null
            return h.komponen.map((k, i) => {
              const g = gOf(k.jenis)
              const header = g !== last ? g : null
              last = g
              return (
                <Fragment key={i}>
                  {header === 'A' && (
                    <tr className="group-row">
                      <td colSpan={5}>A. Tenaga Kerja</td>
                      <td className="num" colSpan={2}>{fmtRpShort(h.subtotal.A)}</td>
                    </tr>
                  )}
                  {header === 'B' && (
                    <tr className="group-row">
                      <td colSpan={5}>B. Bahan</td>
                      <td className="num" colSpan={2}>{fmtRpShort(h.subtotal.B)}</td>
                    </tr>
                  )}
                  {header === 'C' && (
                    <tr className="group-row">
                      <td colSpan={5}>C. Peralatan</td>
                      <td className="num" colSpan={2}>{fmtRpShort(h.subtotal.C)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="num">{i + 1}</td>
                    <td>{k.uraian ?? ''}</td>
                    <td>{k.kode ?? ''}</td>
                    <td className="num">{k.satuan ?? ''}</td>
                    <td className="num">{k.koefisien ?? ''}</td>
                    <td className="num">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        inputMode="decimal"
                        placeholder="0"
                        value={hEdit[k.id] ?? (k.harga_satuan ?? '')}
                        onChange={(e) => setHEdit((prev) => ({ ...prev, [k.id]: e.target.value }))}
                        onBlur={(e) => {
                          setHEdit((prev) => {
                            const n = { ...prev }
                            delete n[k.id]
                            return n
                          })
                          setHargaKomponen(k, e.target.value)
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      />
                    </td>
                    <td className="num">{fmtRpShort(k.harga_jumlah)}</td>
                  </tr>
                </Fragment>
              )
            })
          })()}
          <tr className="group-row">
            <td colSpan={5}>D. Jumlah Harga (A+B+C)</td>
            <td className="num" colSpan={2}>{fmtRpShort(h.subtotal.D)}</td>
          </tr>
          <tr className="group-row">
            <td colSpan={5}>E. Biaya Umum &amp; Keuntungan ({Math.round(h.overhead_pct * 100)}%)</td>
            <td className="num" colSpan={2}>{fmtRpShort(h.subtotal.E)}</td>
          </tr>
          <tr className="group-row">
            <td colSpan={5}>F. Harga Satuan Pekerjaan (D+E)</td>
            <td className="num" colSpan={2}>{fmtRpShort(h.subtotal.F)}</td>
          </tr>
        </tbody>
      </table>
      <div className="kicker mt" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
        Bill of Material Item Pekerjaan {h.item.kode} — {h.item.uraian} · Vol {fmt(h.item.volume ?? 0)} {h.item.satuan ?? ''}
      </div>
      <table className="mt">
        <thead>
          <tr>
            <th style={{ width: '10%' }}>Kode</th>
            <th>Komponen</th>
            <th style={{ width: '10%' }} className="num">Sat</th>
            <th style={{ width: '12%' }} className="num">Vol</th>
            <th style={{ width: '12%' }} className="num">Qty</th>
            <th style={{ width: '20%' }} className="num">Harga Satuan</th>
            <th style={{ width: '20%' }} className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {['A. Tenaga Kerja', 'B. Bahan', 'C. Peralatan'].map((g) => {
            const rows = h.komponen.filter((k) => (g.startsWith('A') ? /tenaga kerja/i.test(k.jenis ?? '') : g.startsWith('B') ? /bahan/i.test(k.jenis ?? '') : /peralatan/i.test(k.jenis ?? '')))
            if (rows.length === 0) return null
            const sub = rows.reduce((s, k) => {
              const qty = (k.koefisien ?? 0) * (h.item.volume ?? 0)
              return s + (k.harga_satuan != null ? qty * k.harga_satuan : 0)
            }, 0)
            return (
              <Fragment key={g}>
                <tr className="group-row">
                  <td colSpan={5}>{g}</td>
                  <td className="num" colSpan={2}>{fmtRpShort(sub)}</td>
                </tr>
                {rows.map((k, i) => {
                  const qty = (k.koefisien ?? 0) * (h.item.volume ?? 0)
                  const total = k.harga_satuan != null ? qty * k.harga_satuan : null
                  return (
                    <tr key={i}>
                      <td>{k.kode ?? ''}</td>
                      <td>{k.uraian ?? ''}</td>
                      <td className="num">{k.satuan ?? ''}</td>
                      <td className="num">{fmt(h.item.volume ?? 0)}</td>
                      <td className="num">{fmt(qty)}</td>
                      <td className="num">{fmtRpShort(k.harga_satuan)}</td>
                      <td className="num">{total != null ? fmtRpShort(total) : '-'}</td>
                    </tr>
                  )
                })}
              </Fragment>
            )
          })}
          <tr className="group-row">
            <td colSpan={5}>Biaya Umum & Keuntungan ({Math.round(h.overhead_pct * 100)}%) × Volume</td>
            <td className="num" colSpan={2}>{fmtRpShort(h.subtotal.E * h.item.volume)}</td>
          </tr>
          <tr className="group-row">
            <td colSpan={5}>Total Pekerjaan (F × Volume)</td>
            <td className="num" colSpan={2}>{fmtRpShort(h.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  // ---- Jadwal: main view (WBS tree + Gantt) & sidebar editor ----
  const fmtTgl = (iso: string | null) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const pad = (x: number) => String(x).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  }
  // tanggal mulai aktual utk display: tanggal_mulai terkecil yg diisi user, else jMulai/today
  const proyekMulai = useMemo(() => {
    const ts = jadwal.map((j) => j.tanggal_mulai).filter(Boolean) as string[]
    ts.sort()
    return ts[0] ?? (jMulai || '')
  }, [jadwal, jMulai])
  const tglHari = (hariKe: number) => addDays(proyekMulai || null, Math.max(0, hariKe - 1))

  // rencana kerja mingguan (Senin–Sabtu): petakan hari kerja ke tanggal nyata (skip Minggu),
  // kelompokkan per minggu, tandai item aktif tiap hari.
  const rencanaMingguan = useMemo(() => {
    const start = proyekMulai
    if (!start || jadwalCpm.length === 0) return []
    const maxEf = Math.max(...jadwalCpm.map((c) => c.ef))
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const days: { iso: string; wd: number; workDay: number }[] = []
    const cur = new Date(start + 'T00:00:00')
    let n = 0
    while (n < maxEf) {
      const wd = cur.getDay()
      if (wd !== 0) {
        n++
        days.push({ iso: iso(cur), wd, workDay: n })
      }
      cur.setDate(cur.getDate() + 1)
    }
    const weeks: { mon: string; days: { iso: string; workDay: number }[] }[] = []
    for (const d of days) {
      const dt = new Date(d.iso + 'T00:00:00')
      const diff = (dt.getDay() + 6) % 7
      const mon = new Date(dt)
      mon.setDate(mon.getDate() - diff)
      const monISO = iso(mon)
      let wk = weeks.find((w) => w.mon === monISO)
      if (!wk) {
        wk = { mon: monISO, days: [] }
        weeks.push(wk)
      }
      wk.days.push({ iso: d.iso, workDay: d.workDay })
    }
    return weeks
  }, [jadwalCpm, proyekMulai])

  const renderJadwalMain = () => {
    if (jadwal.length === 0) {
      return (
        <div className="card mt">
          <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
            Jadwal & WBS — belum ada item pekerjaan
          </div>
          <div className="empty mt">Tambahkan item ke RAB dulu untuk menyusun jadwal.</div>
        </div>
      )
    }
    const cpm = jadwalCpm
    const span = Math.max(1, Math.max(...cpm.map((c) => c.ef)) - Math.min(...cpm.map((c) => c.es)) + 1)
    const minEs = Math.min(...cpm.map((c) => c.es))
    const predKode = (j: JadwalRow) =>
      (depen[j.id] ?? [])
        .map((d) => jadwal.find((x) => x.id === d.pred_jadwal_id)?.item_kode ?? '')
        .filter(Boolean)
        .join(', ')
    return (
      <div className="mt">
        <div className="card mt2">
          <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
            Work Breakdown Structure — hierarki otomatis dari item RAB (klik baris untuk edit di sidebar kanan)
          </div>
          <table className="mt">
            <thead>
              <tr>
                <th className="num">No</th>
                <th>Kode</th>
                <th>Uraian</th>
                <th className="num">Durasi (hari)</th>
                <th className="num">Mulai</th>
                <th className="num">Selesai</th>
                <th>Predecessor</th>
                <th className="num">Kritis</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <Fragment key={g.div}>
                  <tr className="group-row">
                    <td colSpan={8}>
                      {g.nama ? g.nama : 'DIVISI ' + g.div} · {g.list.length} item
                    </td>
                  </tr>
                  {g.list.map((it, idx) => {
                    const j = jadwalByItem.get(it.id)
                    const c = j ? cpmById.get(j.id) : null
                    return (
                      <tr key={it.id} data-click onClick={() => setSelJadwal(j ? j.id : null)} style={{ cursor: 'pointer' }}>
                        <td className="num">{idx + 1}</td>
                        <td>{it.kode}</td>
                        <td>{it.uraian}</td>
                        <td className="num">{j ? fmt(j.durasi ?? 1) : '-'}</td>
                        <td className="num">{j && c ? fmtTgl(tglHari(c.es)) : '-'}</td>
                        <td className="num">{j && c ? fmtTgl(tglHari(c.ef)) : '-'}</td>
                        <td>{j ? predKode(j) || '-' : '-'}</td>
                        <td className="num">{c?.kritis ? '●' : ''}</td>
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="group-row">
                <td colSpan={3}>Total</td>
                <td className="num">{fmt(jadwal.reduce((s, j) => s + Math.max(1, j.durasi ?? 1), 0))} hari</td>
                <td colSpan={4}>{cpm.length ? `Hari ke-${minEs} s/d ${minEs + span - 1} (${fmtTgl(tglHari(minEs))} — ${fmtTgl(tglHari(minEs + span - 1))})` : ''}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="card mt2">
          <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
            Gantt Chart — total {fmt(jadwal.reduce((s, j) => s + Math.max(1, j.durasi ?? 1), 0))} hari kerja · {span} hari kalender ({fmtTgl(tglHari(minEs))} — {fmtTgl(tglHari(minEs + span - 1))})
          </div>
          <table className="mt">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Pekerjaan</th>
                <th>Timeline (hari)</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) =>
                g.list.map((it, idx) => {
                  const j = jadwalByItem.get(it.id)
                  const c = j ? cpmById.get(j.id) : null
                  if (!j || !c) return null
                  const left = ((c.es - minEs) / span) * 100
                  const width = (Math.max(1, c.ef - c.es + 1) / span) * 100
                  return (
                    <tr key={it.id}>
                      <td style={{ paddingLeft: 4 }}>
                        <span style={{ opacity: 0.5 }}>{idx + 1}.</span> {it.uraian}
                      </td>
                      <td>
                        <div style={{ position: 'relative', height: 18, width: '100%' }}>
                          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, border: '1px solid var(--ink)', opacity: 0.15 }} />
                          <div
                            data-click
                            onClick={() => setSelJadwal(j.id)}
                            title={`${it.kode} · hari ${c.es}-${c.ef}${c.kritis ? ' · KRITIS' : ''}`}
                            style={{
                              position: 'absolute',
                              top: 1,
                              bottom: 1,
                              left: `calc(${left}% + 1px)`,
                              width: `calc(${width}% - 2px)`,
                              minWidth: 8,
                              background: c.kritis ? 'var(--red)' : 'var(--ink)',
                              opacity: 0.85,
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="card mt2">
          <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
            Rencana Kerja Mingguan — Senin s/d Sabtu (Minggu libur)
          </div>
          {rencanaMingguan.map((wk, i) => {
            const wkItems = jadwal.filter((j) => {
              const c = cpmById.get(j.id)
              if (!c) return false
              const d1 = wk.days[0]?.workDay
              const d2 = wk.days[wk.days.length - 1]?.workDay
              return c.es <= (d2 ?? 0) && c.ef >= (d1 ?? 0)
            })
            if (wkItems.length === 0) return null
            const wkEnd = new Date(wk.mon + 'T00:00:00')
            wkEnd.setDate(wkEnd.getDate() + 5)
            const wkEndIso = `${wkEnd.getFullYear()}-${String(wkEnd.getMonth() + 1).padStart(2, '0')}-${String(wkEnd.getDate()).padStart(2, '0')}`
            return (
              <div key={wk.mon} className="mt2">
                <div className="group-row" style={{ padding: '6px 12px' }}>
                  Minggu {i + 1} · {fmtTgl(wk.mon)} — {fmtTgl(wkEndIso)} · {wk.days.length} hari kerja
                </div>
                <table className="mt">
                  <thead>
                    <tr>
                      <th className="num">Hari</th>
                      <th style={{ width: '22%' }}>Tanggal</th>
                      <th>Pekerjaan</th>
                      <th className="num">Durasi (hari)</th>
                      <th className="num">Kritis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wk.days.map((d) => {
                      const aktif = jadwal.filter((j) => {
                        const c = cpmById.get(j.id)
                        return c ? c.es <= d.workDay && c.ef >= d.workDay : false
                      })
                      return (
                        <tr key={d.iso}>
                          <td className="num">{['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date(d.iso + 'T00:00:00').getDay() - 1] ?? '-'}</td>
                          <td>{fmtTgl(d.iso)}</td>
                          <td>
                            {aktif.length === 0 ? (
                              <span style={{ opacity: 0.45 }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {aktif.map((j) => (
                                  <span key={j.id} data-click onClick={() => setSelJadwal(j.id)} style={{ cursor: 'pointer' }}>
                                    {j.item_kode} — {j.item_uraian}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="num">{aktif.length ? fmt(aktif.reduce((s, j) => s + Math.max(1, j.durasi ?? 1), 0)) : '-'}</td>
                          <td className="num">{aktif.some((j) => cpmById.get(j.id)?.kritis) ? '●' : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
          {rencanaMingguan.every((wk) => !jadwal.some((j) => { const c = cpmById.get(j.id); const d1 = wk.days[0]?.workDay; const d2 = wk.days[wk.days.length - 1]?.workDay; return c ? c.es <= (d2 ?? 0) && c.ef >= (d1 ?? 0) : false })) && (
            <div className="empty mt">Belum ada jadwal. Isi durasi & jumlah pekerja tiap item lewat sidebar kanan.</div>
          )}
        </div>
      </div>
    )
  }

  const renderJadwalEditor = () => {
    if (!selJadwal) {
      return (
        <div className="empty mt">
          Klik baris pekerjaan di main view (tabel WBS atau Gantt) untuk mengedit jadwal di sini.
        </div>
      )
    }
    const j = jadwal.find((x) => x.id === selJadwal)
    if (!j) return <div className="empty mt">Jadwal tidak ditemukan.</div>
    const c = cpmById.get(j.id)
    const preds = depen[j.id] ?? []
    const opsi = jadwal.filter((x) => x.id !== j.id).sort((a, b) => (a.item_kode ?? '').localeCompare(b.item_kode ?? ''))
    return (
      <div className="mt">
        <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
          {j.item_kode} — {j.item_uraian} · {j.item_satuan ?? ''}
        </div>
        <table className="mt">
          <tbody>
            <tr>
              <th style={{ width: '40%' }}>Durasi (hari)</th>
              <td>
                <input
                  type="number"
                  min="1"
                  defaultValue={j.durasi ?? 1}
                  onBlur={(e) => simpanJadwal(j, 'durasi', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              </td>
            </tr>
            <tr>
              <th>Jumlah Pekerja</th>
              <td>
                <input
                  type="number"
                  min="1"
                  defaultValue={j.jumlah_pekerja ?? 1}
                  onBlur={(e) => simpanJadwal(j, 'jumlah_pekerja', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
              </td>
            </tr>
            {(() => {
              const oh = ohTenagaKerja(hByItem.get(j.rab_item_id))
              const dAuto = durasiOtomatis(hByItem.get(j.rab_item_id), j.jumlah_pekerja ?? 1)
              if (oh <= 0) return null
              return (
                <tr>
                  <th>Durasi otomatis</th>
                  <td>
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                      <div>Σ tenaga kerja: {fmt(oh)} OH (volume {fmt(hByItem.get(j.rab_item_id)?.item.volume ?? 0)})</div>
                      <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                        <b>{dAuto != null ? `${fmt(dAuto)} hari` : '-'}</b>
                        <button className="mini" onClick={() => terapkanDurasiAuto(j)}>pakai</button>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })()}
            <tr>
              <th>Mulai (manual)</th>
              <td>
                <input
                  type="date"
                  value={j.tanggal_mulai ?? ''}
                  onChange={(e) => simpanJadwal(j, 'tanggal_mulai', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <th>Predecessor</th>
              <td>
                <select
                  value=""
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (v) tambahDependensi(j, v)
                  }}
                >
                  <option value="">+ tambah predecessor…</option>
                  {opsi.map((o) => (
                    <option key={o.id} value={o.id}>{o.item_kode} — {o.item_uraian}</option>
                  ))}
                </select>
                {preds.length > 0 && (
                  <div className="mt" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {preds.map((d) => {
                      const pj = jadwal.find((x) => x.id === d.pred_jadwal_id)
                      return (
                        <div key={d.id} className="row" style={{ alignItems: 'center', gap: 6 }}>
                          <span style={{ flex: 1, fontSize: 11 }}>{pj?.item_kode} — {pj?.item_uraian}</span>
                          <button className="mini" onClick={() => hapusDependensi(d)}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </td>
            </tr>
            <tr>
              <th>Hasil (CPM)</th>
              <td>
                {c ? (
                  <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                    <div>Mulai: hari ke-{c.es} ({fmtTgl(tglHari(c.es))})</div>
                    <div>Selesai: hari ke-{c.ef} ({fmtTgl(tglHari(c.ef))})</div>
                    <div>{c.kritis ? <b style={{ color: 'var(--red)' }}>● KRITIS (slack 0)</b> : <span>slack {((c.ls ?? c.es) - c.es)} hari</span>}</div>
                  </div>
                ) : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // blok take-off per item — dipakai di tab Volume dan di sidebar kanan
  // tampilan read-only take-off per item non-penulangan — untuk main view tab Volume (hasil)
  const renderVolMain = (it: RabItem) => {
    const rows = volByItem.get(it.id) ?? []
    const s = String(it.satuan ?? '').toLowerCase().trim()
    const isM1 = s === 'm1'
    const isM2 = s === 'm2'
    const isM3 = s === 'm3'
    const dims = (isM1 ? ['panjang', 'jumlah'] : isM2 ? ['panjang', 'lebar', 'jumlah'] : isM3 ? ['panjang', 'lebar', 'tinggi', 'jumlah'] : ['jumlah']) as ('panjang' | 'lebar' | 'tinggi' | 'jumlah')[]
    const formula = isM1 ? 'Vol = P × J' : isM2 ? 'Vol = P × L × J' : isM3 ? 'Vol = P × L × T × J' : 'Vol = Jumlah'
    return (
      <div id={`vol-${it.id}`} className="mt2" style={{ border: '1px solid var(--ink)', padding: 12 }}>
        <div className="row" data-click onClick={() => setSelVolItem(it.id)}>
          <b>{it.kode}</b> <span>{it.uraian}</span>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Volume total: {fmt(it.volume)} {it.satuan ?? ''}</span>
        </div>
        <div className="kicker mt" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
          {formula} — klik baris ini untuk edit di sidebar kanan
        </div>
        <table className="mt">
          <thead>
            <tr>
              <th style={{ width: '5%' }} className="num">No</th>
              <th>Uraian Pengukuran</th>
              {dims.includes('panjang') && <th style={{ width: '10%' }} className="num">Panjang</th>}
              {dims.includes('lebar') && <th style={{ width: '9%' }} className="num">Lebar</th>}
              {dims.includes('tinggi') && <th style={{ width: '9%' }} className="num">Tinggi</th>}
              <th style={{ width: '9%' }} className="num">Jumlah</th>
              <th style={{ width: '11%' }} className="num">Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="num">{i + 1}</td>
                <td style={{ whiteSpace: 'normal' }}>{r.uraian ?? ''}</td>
                {dims.includes('panjang') && <td className="num">{r.panjang != null ? fmt(r.panjang) : ''}</td>}
                {dims.includes('lebar') && <td className="num">{r.lebar != null ? fmt(r.lebar) : ''}</td>}
                {dims.includes('tinggi') && <td className="num">{r.tinggi != null ? fmt(r.tinggi) : ''}</td>}
                <td className="num">{r.jumlah != null ? fmt(r.jumlah) : ''}</td>
                <td className="num">{fmt(r.volume)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">Belum ada baris take-off. Tambahkan lewat sidebar kanan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  const renderVolBlock = (it: RabItem) => {
    if (isPenulangan(it.kode)) return renderItemBesi(it)
    const rows = volByItem.get(it.id) ?? []
    const f = vf[it.id] ?? emptyForm()
    const s = String(it.satuan ?? '').toLowerCase().trim()
    const isM1 = s === 'm1'
    const isM2 = s === 'm2'
    const isM3 = s === 'm3'
    // kolom dimensi yang relevan per satuan (opsi 1: form dinamis)
    const dims = (isM1 ? ['panjang', 'jumlah'] : isM2 ? ['panjang', 'lebar', 'jumlah'] : isM3 ? ['panjang', 'lebar', 'tinggi', 'jumlah'] : ['jumlah']) as ('panjang' | 'lebar' | 'tinggi' | 'jumlah')[]
    // rumus per satuan (opsi 3: formula helper)
    const formula = isM1 ? 'Vol = P × J' : isM2 ? 'Vol = P × L × J' : isM3 ? 'Vol = P × L × T × J' : 'Vol = Jumlah'
    return (
      <div id={`vol-${it.id}`} className="mt2" style={{ border: '1px solid var(--ink)', padding: 12 }}>
        <div className="row" data-click onClick={() => setSelVolItem(it.id)}>
          <b>{it.kode}</b> <span>{it.uraian}</span>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Volume total: {fmt(it.volume)} {it.satuan ?? ''}</span>
        </div>
        <div className="kicker mt" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
          {formula}
        </div>
        <table className="mt">
          <thead>
            <tr>
              <th style={{ width: '5%' }} className="num">No</th>
              <th>Uraian Pengukuran</th>
              {dims.includes('panjang') && <th style={{ width: '10%' }} className="num">Panjang</th>}
              {dims.includes('lebar') && <th style={{ width: '9%' }} className="num">Lebar</th>}
              {dims.includes('tinggi') && <th style={{ width: '9%' }} className="num">Tinggi</th>}
              <th style={{ width: '9%' }} className="num">Jumlah</th>
              <th style={{ width: '11%' }} className="num">Volume</th>
              <th style={{ width: '9%' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="num">{i + 1}</td>
                <td>
                  <input
                    style={{ width: '100%' }}
                    value={rowVal(r, 'uraian')}
                    onChange={(e) => setRowField(r.id, 'uraian', e.target.value)}
                    onBlur={(e) => saveRow(r, 'uraian', e.target.value)}
                  />
                </td>
                {dims.map((fld) => (
                  <td key={fld} className="num">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      style={{ width: 80, textAlign: 'right' }}
                      value={rowVal(r, fld)}
                      onChange={(e) => setRowField(r.id, fld, e.target.value)}
                      onBlur={(e) => saveRow(r, fld, e.target.value)}
                    />
                  </td>
                ))}
                <td className="num">{fmt(r.volume)}</td>
                <td>
                  <button onClick={() => removeVol(r)}>Hapus</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">Belum ada baris take-off. Tambahkan di bawah.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="row mt">
          <input
            placeholder="Uraian pengukuran"
            style={{ flex: 1, minWidth: 140 }}
            value={f.uraian}
            onChange={(e) => setVf((prev) => ({ ...prev, [it.id]: { ...prev[it.id], uraian: e.target.value } }))}
          />
          {dims.map((fld) => (
            <input
              key={fld}
              type="number"
              step="any"
              min="0"
              placeholder={fld}
              style={{ width: 90 }}
              value={f[fld]}
              onChange={(e) => setVf((prev) => ({ ...prev, [it.id]: { ...(prev[it.id] ?? emptyForm()), [fld]: e.target.value } }))}
            />
          ))}
          <button onClick={() => addVolRow(it.id)}>+ Tambah Baris</button>
        </div>
        <div className="subtotal mt">
          <div className="line"><span>Total Volume ({it.satuan ?? ''})</span><b>{fmt(it.volume)}</b></div>
        </div>
      </div>
    )
  }

  // sub-tabel tulangan dalam satu profil (level RAB)
  const renderProfilTulanganTable = (p: RabProfil) => {
    const ts = ptul[p.id] ?? []
    const nProfil = p.jumlah ?? 1
    const f = ptf[p.id] ?? emptyPt()
    return (
      <div key={p.id} style={{ border: '1px dashed var(--muted)', padding: 6, marginTop: 6 }}>
        <div className="row">
          <b>{profiles.findIndex((x) => x.id === p.id) + 1}.</b>
          <input
            style={{ flex: 1, minWidth: 80 }}
            value={pVal(p, 'uraian')}
            onChange={(e) => setPField(p.id, 'uraian', e.target.value)}
            onBlur={(e) => saveProfile(p, 'uraian', e.target.value)}
          />
          <button onClick={() => removeProfile(p)}>Hapus</button>
        </div>
        <div className="mt" style={{ border: '1px solid var(--ink)', padding: 6 }}>
          <div className="row" style={{ alignItems: 'center', gap: 8 }}>
            <b style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>Gambar Penampang</b>
            <label className="mini" style={{ cursor: 'pointer', border: '1px solid var(--ink)', padding: '2px 6px', fontSize: 10 }}>
              + Pilih JPEG/PNG
              <input type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={(e) => saveGambar(p, e.target.files?.[0] ?? null)} />
            </label>
            {p.gambar && (
              <button className="mini" onClick={() => hapusGambar(p)}>Hapus gambar</button>
            )}
          </div>
          {p.gambar ? (
            <div className="mt" style={{ border: '1px solid var(--muted)', padding: 6, textAlign: 'center' }}>
              <img src={p.gambar} alt="penampang" style={{ width: 120, height: 120, objectFit: 'contain', border: '1px solid var(--ink)' }} />
            </div>
          ) : (
            <div className="mt" style={{ border: '1px dashed var(--muted)', padding: 6, textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>
              Tidak ada gambar penampang
            </div>
          )}
        </div>
        <table className="mt">
          <tbody>
            <tr>
              <th style={{ width: '38%' }}>Jml Profil</th>
              <td><input type="number" step="any" min="0"
                value={pVal(p, 'jumlah')}
                onChange={(e) => setPField(p.id, 'jumlah', e.target.value)}
                onBlur={(e) => saveProfile(p, 'jumlah', e.target.value)} /></td>
            </tr>
            <tr>
              <th>Lebar (mm)</th>
              <td><input type="number" step="any" min="0"
                value={pVal(p, 'lebar')}
                onChange={(e) => setPField(p.id, 'lebar', e.target.value)}
                onBlur={(e) => saveProfile(p, 'lebar', e.target.value)} /></td>
            </tr>
            <tr>
              <th>Tinggi (mm)</th>
              <td><input type="number" step="any" min="0"
                value={pVal(p, 'tinggi')}
                onChange={(e) => setPField(p.id, 'tinggi', e.target.value)}
                onBlur={(e) => saveProfile(p, 'tinggi', e.target.value)} /></td>
            </tr>
            <tr>
              <th>Selimut (mm)</th>
              <td><input type="number" step="any" min="0"
                value={pVal(p, 'selimut')}
                onChange={(e) => setPField(p.id, 'selimut', e.target.value)}
                onBlur={(e) => saveProfile(p, 'selimut', e.target.value)} /></td>
            </tr>
            <tr>
              <th>Bentang (m)</th>
              <td><input type="number" step="any" min="0"
                value={pVal(p, 'panjang_bentang')}
                onChange={(e) => setPField(p.id, 'panjang_bentang', e.target.value)}
                onBlur={(e) => saveProfile(p, 'panjang_bentang', e.target.value)} /></td>
            </tr>
            <tr>
              <th>Tumpuan (mm)</th>
              <td><input type="number" step="any" min="0"
                value={pVal(p, 'jarak_tumpuan')}
                onChange={(e) => setPField(p.id, 'jarak_tumpuan', e.target.value)}
                onBlur={(e) => saveProfile(p, 'jarak_tumpuan', e.target.value)} /></td>
            </tr>
            <tr>
              <th>Lapangan (mm)</th>
              <td><input type="number" step="any" min="0"
                value={pVal(p, 'jarak_lapangan')}
                onChange={(e) => setPField(p.id, 'jarak_lapangan', e.target.value)}
                onBlur={(e) => saveProfile(p, 'jarak_lapangan', e.target.value)} /></td>
            </tr>
            <tr>
              <td colSpan={2} style={{ color: 'var(--muted)', fontSize: 9 }}>Sengkang dihitung otomatis dari dimensi + diameter (SNI: tumpuan L/4, lapangan L/2, hook 2×6d).</td>
            </tr>
          </tbody>
        </table>
        {ts.length > 0 && (
          <table className="mt">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Posisi/Jenis</th>
                <th style={{ width: '20%' }} className="num">D (mm)</th>
                <th style={{ width: '26%' }} className="num">Jml × Panjang</th>
                <th style={{ width: '14%' }} className="num">Berat</th>
                <th style={{ width: '10%' }}></th>
              </tr>
            </thead>
            <tbody>
              {ts.map((t) => {
                const isSk = ptVal(t, 'posisi') === 'sengkang'
                const sk = isSk ? hitungSengkang(p, t.diameter ? Number(t.diameter) : 0) : null
                const utPanj = !isSk && p.panjang_bentang != null ? p.panjang_bentang : null
                const effPanj = sk ? sk.panjang : (utPanj ?? null)
                const effJml = sk ? sk.jumlah : null
                const effW = sk ? { diameter: t.diameter, jumlah: sk.jumlah, panjang: sk.panjang }
                  : utPanj ? { diameter: t.diameter, jumlah: t.jumlah, panjang: p.panjang_bentang }
                  : null
                const berat = effW ? beratTulangan(effW, nProfil) : beratTulangan(t, nProfil)
                return (
                  <tr key={t.id} style={isSk ? { opacity: 0.85 } : undefined}>
                    <td>
                      <select
                        style={{ width: '100%' }}
                        value={`${ptVal(t, 'posisi')}|${ptVal(t, 'jenis')}`}
                        onChange={(e) => savePosisiJenis(t, e.target.value)}
                      >
                        <option value="utama|polos">Utama · Polos</option>
                        <option value="utama|ulir">Utama · Ulir</option>
                        <option value="sengkang|polos">Sengkang · Polos</option>
                        <option value="sengkang|ulir">Sengkang · Ulir</option>
                      </select>
                    </td>
                    <td className="num">
                      <select
                        value={ptVal(t, 'diameter')}
                        onChange={(e) => { setPtField(t.id, 'diameter', e.target.value); saveProfilTulangan(t, 'diameter', e.target.value) }}
                      >
                        <option value="">-</option>
                        {besi.map((b) => <option key={b.diameter} value={b.diameter}>D{b.diameter}</option>)}
                      </select>
                    </td>
                    <td className="num">
                      {isSk ? (
                        sk ? `${fmt(sk.jumlah)} × ${fmt(sk.panjang)} m` : <span title="Lengkapi dimensi &amp; jarak sengkang profil">-</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                          <input type="number" step="any" min="0" style={{ width: 44, textAlign: 'right' }}
                            value={ptVal(t, 'jumlah')}
                            onChange={(e) => setPtField(t.id, 'jumlah', e.target.value)}
                            onBlur={(e) => saveProfilTulangan(t, 'jumlah', e.target.value)} />
                          <span style={{ alignSelf: 'center', fontSize: 10 }}>×</span>
                          {utPanj != null ? (
                            <span style={{ alignSelf: 'center', fontSize: 10, whiteSpace: 'nowrap' }}>{fmt(utPanj)} m</span>
                          ) : (
                            <input type="number" step="any" min="0" style={{ width: 44, textAlign: 'right' }}
                              value={ptVal(t, 'panjang')}
                              onChange={(e) => setPtField(t.id, 'panjang', e.target.value)}
                              onBlur={(e) => saveProfilTulangan(t, 'panjang', e.target.value)} />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="num">{fmt(berat)}</td>
                    <td><button onClick={() => removeProfilTulangan(t)}>✕</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <table className="mt" style={{ marginTop: 6 }}>
          <tbody>
            <tr>
              <th style={{ width: '38%' }}>Posisi</th>
              <td>
                <select
                  style={{ width: '100%' }}
                  value={f.posisi}
                  onChange={(e) => setPtf((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? emptyPt()), posisi: e.target.value } }))}
                >
                  <option value="utama">Utama</option>
                  <option value="sengkang">Sengkang</option>
                </select>
              </td>
            </tr>
            <tr>
              <th>Jenis</th>
              <td>
                <select
                  style={{ width: '100%' }}
                  value={f.jenis}
                  onChange={(e) => setPtf((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? emptyPt()), jenis: e.target.value } }))}
                >
                  <option value="polos">Polos</option>
                  <option value="ulir">Ulir</option>
                </select>
              </td>
            </tr>
            <tr>
              <th>D (mm)</th>
              <td>
                <select
                  style={{ width: '100%' }}
                  value={f.diameter}
                  onChange={(e) => setPtf((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? emptyPt()), diameter: e.target.value } }))}
                >
                  <option value="">-</option>
                  {besi.map((b) => <option key={b.diameter} value={b.diameter}>D{b.diameter}</option>)}
                </select>
              </td>
            </tr>
            {f.posisi === 'utama' && (
              <>
                <tr>
                  <th>Jml</th>
                  <td><input type="number" step="any" min="0"
                    value={f.jumlah}
                    onChange={(e) => setPtf((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? emptyPt()), jumlah: e.target.value } }))} /></td>
                </tr>
                {p.panjang_bentang == null ? (
                  <tr>
                    <th>Panjang (m)</th>
                    <td><input type="number" step="any" min="0"
                      value={f.panjang}
                      onChange={(e) => setPtf((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? emptyPt()), panjang: e.target.value } }))} /></td>
                  </tr>
                ) : (
                  <tr>
                    <th colSpan={2} style={{ fontSize: 10, fontWeight: 'normal', color: 'var(--muted)' }}>
                      Panjang tulangan utama otomatis = bentang ({fmt(p.panjang_bentang)} m).
                    </th>
                  </tr>
                )}
              </>
            )}
            {f.posisi === 'sengkang' && (
              <tr>
                <th colSpan={2} style={{ fontSize: 10, fontWeight: 'normal', color: 'var(--muted)' }}>
                  Jumlah &amp; panjang sengkang dihitung otomatis dari dimensi penampang + diameter.
                </th>
              </tr>
            )}
            <tr>
              <td colSpan={2}><button onClick={() => addProfilTulangan(p.id)}>+ Tulangan</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // editor profil struktur BESI level RAB — sidebar: pilih profil → edit satu profil saja
  const renderBesiEditor = (compact: boolean) => {
    const summary = besiFull
    const idx = profiles.findIndex((p) => p.id === selProfil)
    const active = idx >= 0 ? profiles[idx] : null
    return (
      <div className="mt2" style={compact ? undefined : { border: '1px solid var(--ink)', padding: 12 }}>
        <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
          Profil struktur &amp; penulangan — level RAB. Klik profil di main view untuk mengedit, atau pilih di bawah.
        </div>
        {profiles.length === 0 && <div className="empty mt">Belum ada profil struktur. Tambahkan profil di bawah.</div>}
        {profiles.length > 0 && (
          <div className="row mt" style={{ gap: 4, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 10, color: 'var(--muted)' }}>Profil:</label>
            <select
              style={{ flex: 1, minWidth: 80 }}
              value={selProfil ?? ''}
              onChange={(e) => setSelProfil(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">— pilih profil —</option>
              {profiles.map((p, i) => (
                <option key={p.id} value={p.id}>{i + 1}. {p.uraian}</option>
              ))}
            </select>
          </div>
        )}
        {active && (
          <div className="mt2">
            <div className="row" style={{ alignItems: 'center' }}>
              <b>{idx + 1}. {active.uraian}</b>
              <button className="mini" onClick={() => removeProfile(active)}>Hapus Profil</button>
            </div>
            {renderProfilTulanganTable(active)}
          </div>
        )}
        <table className="mt" style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <th style={{ width: '30%' }}>Uraian Profil</th>
              <td><input
                placeholder="mis. Kolom K1 30×30"
                value={pf.uraian}
                onChange={(e) => setPf((prev) => ({ ...prev, uraian: e.target.value }))} /></td>
              <th style={{ width: '22%' }}>Jml Profil</th>
              <td><input type="number" step="any" min="0"
                value={pf.jumlah}
                onChange={(e) => setPf((prev) => ({ ...prev, jumlah: e.target.value }))} /></td>
              <td style={{ width: '18%' }}><button onClick={addProfile}>+ Profil</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // editor komponen BOM terpilih — sidebar tab BOM: input harga satuan
  const renderBomEditor = () => {
    if (!selBom) {
      return (
        <div className="empty mt">Klik baris komponen di main view untuk mengedit harga di sini.</div>
      )
    }
    const [j, u, k, s] = selBom.split('|')
    const row = bomGroups.flatMap(([, rows]) => rows).find((r) => `${r.jenis}|${r.uraian}|${r.kode}|${r.satuan}` === selBom)
    if (!row) return <div className="empty mt">Komponen tidak ditemukan.</div>
    const total = row.harga_satuan != null ? row.harga_satuan * row.qty : null
    return (
      <div className="mt">
        <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
          {k} — {u} · {s ?? ''}
        </div>
        <div className="line mt"><span>Qty Total</span><b>{fmt(row.qty)}</b></div>
        <div className="line"><span>Harga Satuan</span></div>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Harga satuan (Rp)"
          style={{ width: '100%', padding: '6px 8px', fontSize: 14, fontFamily: "'JetBrains Mono',monospace", textAlign: 'right' }}
          value={fmtInputNum(bomHarga[selBom] ?? (row.harga_satuan != null ? String(row.harga_satuan) : ''))}
          onChange={(e) => setBomHarga((prev) => ({ ...prev, [selBom]: e.target.value.replace(/[^\d.,-]/g, '') }))}
          onBlur={(e) => {
            const raw = bomHarga[selBom] ?? e.target.value
            setHargaBom(row, parseInputNum(raw))
            setBomHarga((prev) => { const n = { ...prev }; delete n[selBom]; return n })
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <div className="line mt"><span>Total</span><b>{total != null ? fmtRp(total) : '-'}</b></div>
        {j !== '' && <div className="kicker mt" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>{j}</div>}
      </div>
    )
  }

  // tampilan read-only per item penulangan — volume sesuai kategori analisa item ini
  // breakdown per profil untuk sidebar — berat per kategori / batang per jenis×diameter
  const renderItemBesi = (it: RabItem) => {
    const kat = tulanganKategori(it.uraian)
    return (
      <div id={`vol-${it.id}`} className="mt2" style={{ border: '1px solid var(--ink)', padding: 12 }}>
        <div className="row" data-click onClick={() => setSelVolItem(it.id)}>
          <b>{it.kode}</b> <span>{it.uraian}</span>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Volume: {fmt(it.volume)} kg</span>
        </div>
        <div className="kicker mt" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
          Volume item ini diambil dari daftar profil besi level RAB — kategori: {kat.jenis ? (kat.jenis === 'ulir' ? 'BjTS (ulir)' : 'BjTP (polos)') : 'semua jenis'} × {kat.lt12 === null ? 'semua diameter' : kat.lt12 ? 'D &lt; 12 mm' : 'D ≥ 12 mm'}
        </div>
        <div className="subtotal mt" style={{ border: '1px solid var(--ink)' }}>
          <div className="line total"><span>Volume Item — sesuai analisa</span><b>{fmt(it.volume)} kg</b></div>
        </div>
      </div>
    )
  }

  // tampilan main view read-only profil struktur besi level RAB — input lewat sidebar kanan
  const renderBesiMain = () => {
    const summary = besiFull
    return (
      <div className="mt">
        <div className="card">
          <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
            Profil struktur &amp; penulangan — level RAB. Berat = Σ (kebutuhan batang 12m × d²/162,1). Daftar profil dipakai bersama semua item penulangan. Input &amp; edit lewat sidebar kanan.
          </div>
          {profiles.length === 0 && <div className="empty mt">Belum ada profil struktur. Tambahkan lewat sidebar kanan.</div>}
          {profiles.map((p) => {
            const ts = ptul[p.id] ?? []
            const nProfil = p.jumlah ?? 1
            return (
              <div key={p.id} className="mt2" style={{ border: '1px dashed var(--muted)', padding: 8 }}>
                <div className="row" data-click onClick={() => setSelProfil(p.id)} style={{ cursor: 'pointer' }}>
                  <b>{profiles.findIndex((x) => x.id === p.id) + 1}.</b>
                  <span style={{ flex: 1 }}>{p.uraian}</span>
                  <span className="num" style={{ color: 'var(--muted)', fontSize: 11 }}>Jml Profil: {fmt(nProfil)}</span>
                </div>
                <div className="mt" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {p.gambar ? (
                    <img src={p.gambar} alt="penampang" style={{ width: 160, height: 160, objectFit: 'contain', border: '1px solid var(--ink)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 160, height: 160, flexShrink: 0, border: '1px dashed var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 10 }}>Tanpa gambar</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 12, flexShrink: 0 }}>
                    <div><b style={{ display: 'inline-block', width: 64 }}>Lebar</b> <span>{p.lebar != null ? `${p.lebar} mm` : '-'}</span></div>
                    <div><b style={{ display: 'inline-block', width: 64 }}>Tinggi</b> <span>{p.tinggi != null ? `${p.tinggi} mm` : '-'}</span></div>
                    <div><b style={{ display: 'inline-block', width: 64 }}>Selimut</b> <span>{p.selimut != null ? `${p.selimut} mm` : '-'}</span></div>
                    <div><b style={{ display: 'inline-block', width: 64 }}>Bentang</b> <span>{p.panjang_bentang != null ? `${p.panjang_bentang} m` : '-'}</span></div>
                    <div><b style={{ display: 'inline-block', width: 64 }}>Tumpuan</b> <span>{p.jarak_tumpuan != null ? `Ø${p.jarak_tumpuan} mm` : '-'}</span></div>
                    <div><b style={{ display: 'inline-block', width: 64 }}>Lapangan</b> <span>{p.jarak_lapangan != null ? `Ø${p.jarak_lapangan} mm` : '-'}</span></div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {ts.length > 0 && (
                      <table style={{ marginTop: 0, width: '100%', tableLayout: 'fixed' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '12%' }}>Posisi</th>
                            <th style={{ width: '13%' }}>Jenis</th>
                            <th style={{ width: '15%' }} className="num">D (mm)</th>
                            <th style={{ width: '13%' }} className="num">Jml</th>
                            <th style={{ width: '15%' }} className="num">Panjang (m)</th>
                            <th style={{ width: '15%' }} className="num">Berat (kg)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ts.map((t) => {
                            const isSk = t.posisi === 'sengkang'
                            const sk = isSk ? hitungSengkang(p, t.diameter ? Number(t.diameter) : 0) : null
                            const utPanj = !isSk && p.panjang_bentang != null ? p.panjang_bentang : null
                            const effJml = sk ? sk.jumlah : (t.jumlah ?? 1)
                            const effPanj = sk ? sk.panjang : (utPanj ?? t.panjang ?? 0)
                            const berat = beratTulangan({ diameter: t.diameter, jumlah: effJml, panjang: effPanj }, nProfil)
                            return (
                              <tr key={t.id}>
                                <td>{t.posisi === 'sengkang' ? 'Sengkang' : 'Utama'}</td>
                                <td>{t.jenis}</td>
                                <td className="num">{t.diameter ? 'D' + t.diameter : '-'}</td>
                                <td className="num">{fmt(effJml)}</td>
                                <td className="num">{fmt(effPanj)}</td>
                                <td className="num">{fmt(berat)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                    {(batangPerProfil.get(p.id) ?? []).length > 0 && (
                      <div className="mt">
                        <div className="line" style={{ fontSize: 11 }}><b>Kebutuhan Besi Profil Ini — batang 12 m</b></div>
                        <table className="mt" style={{ marginTop: 4, width: '100%', tableLayout: 'fixed' }}>
                          <thead>
                            <tr>
                              <th className="num" style={{ width: '20%' }}>Jenis</th>
                              <th className="num" style={{ width: '20%' }}>D (mm)</th>
                              <th className="num" style={{ width: '30%' }}>Total Panjang (m)</th>
                              <th className="num" style={{ width: '30%' }}>Kebutuhan (batang)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(batangPerProfil.get(p.id) ?? []).map((r) => {
                              return (
                                <tr key={`${r.jenis}|${r.diameter}`}>
                                  <td className="num">{r.jenis}</td>
                                  <td className="num">{r.diameter}</td>
                                  <td className="num">{fmt(r.total)}</td>
                                  <td className="num">{fmt(r.batang)} × 12 m</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                {ts.length === 0 && <div className="empty mt">Belum ada baris tulangan. Tambahkan lewat sidebar kanan.</div>}
              </div>
            )
          })}
        </div>
        <div className="subtotal mt" style={{ border: '1px solid var(--ink)' }}>
          <div className="line"><b>Ringkasan Berat Besi</b></div>
          <div className="line"><span>Polos &lt; 12mm</span><b>{fmt(summary.utama.polos_lt + summary.sengkang.polos_lt)} kg</b></div>
          <div className="line"><span>Polos ≥ 12mm</span><b>{fmt(summary.utama.polos_ge + summary.sengkang.polos_ge)} kg</b></div>
          <div className="line"><span>Ulir &lt; 12mm</span><b>{fmt(summary.utama.ulir_lt + summary.sengkang.ulir_lt)} kg</b></div>
          <div className="line"><span>Ulir ≥ 12mm</span><b>{fmt(summary.utama.ulir_ge + summary.sengkang.ulir_ge)} kg</b></div>
          <div className="line total"><span>Total Berat Besi (full list)</span><b>{fmt(summary.total)} kg</b></div>
        </div>
        {besiBatang.length > 0 && (
          <div className="mt" style={{ border: '1px solid var(--ink)', padding: 8 }}>
            <div className="line"><b>Kebutuhan Besi — batang 12 m</b></div>
            <table className="mt">
              <thead>
                <tr>
                  <th className="num">Jenis</th>
                  <th className="num">D (mm)</th>
                  <th className="num">Total Panjang (m)</th>
                  <th className="num">Kebutuhan (batang)</th>
                  <th className="num">Berat (kg)</th>
                </tr>
              </thead>
              <tbody>
                {besiBatang.map((r) => {
                  const berat = r.batang * 12 * (Math.pow(r.diameter, 2) / 162.1)
                  return (
                    <tr key={`${r.jenis}|${r.diameter}`}>
                      <td className="num">{r.jenis}</td>
                      <td className="num">{r.diameter}</td>
                      <td className="num">{fmt(r.total)}</td>
                      <td className="num">{r.batang} × 12m</td>
                      <td className="num">{fmt(berat)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // input cepat volume — dipakai di sidebar kanan pada tab RAB (detail di tab Volume)
  const renderVolQuick = (it: RabItem) => {
    if (isPenulangan(it.kode)) return renderItemBesi(it)
    const rows = volByItem.get(it.id) ?? []
    const f = vf[it.id] ?? emptyForm()
    const s = String(it.satuan ?? '').toLowerCase().trim()
    const isM1 = s === 'm1'
    const isM2 = s === 'm2'
    const isM3 = s === 'm3'
    const dims = (isM1 ? ['panjang', 'jumlah'] : isM2 ? ['panjang', 'lebar', 'jumlah'] : isM3 ? ['panjang', 'lebar', 'tinggi', 'jumlah'] : ['jumlah']) as ('panjang' | 'lebar' | 'tinggi' | 'jumlah')[]
    const formula = isM1 ? 'Vol = P × J' : isM2 ? 'Vol = P × L × J' : isM3 ? 'Vol = P × L × T × J' : 'Vol = Jumlah'
    return (
      <div id={`vol-${it.id}`} className="mt2">
        <div className="row">
          <b>{it.kode}</b> <span>{it.uraian}</span>
          <span style={{ color: 'var(--muted)', fontSize: 10 }}>Vol: {fmt(it.volume)} {it.satuan ?? ''}</span>
        </div>
        <div className="kicker mt" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
          {formula}
        </div>
        <div className="row mt">
          <input
            placeholder="Uraian pengukuran"
            style={{ flex: 1, minWidth: 0 }}
            value={f.uraian}
            onChange={(e) => setVf((prev) => ({ ...prev, [it.id]: { ...prev[it.id], uraian: e.target.value } }))}
          />
          {dims.map((fld) => (
            <input
              key={fld}
              type="number"
              step="any"
              min="0"
              placeholder={fld}
              style={{ width: 70 }}
              value={f[fld]}
              onChange={(e) => setVf((prev) => ({ ...prev, [it.id]: { ...(prev[it.id] ?? emptyForm()), [fld]: e.target.value } }))}
            />
          ))}
          <button onClick={() => addVolRow(it.id)}>+ Baris</button>
        </div>
        {rows.length > 0 && (
          <table className="mt">
            <thead>
              <tr>
                <th className="num">No</th>
                <th>Uraian</th>
                <th className="num">Vol</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="num">{i + 1}</td>
                  <td style={{ whiteSpace: 'normal' }}>{r.uraian ?? ''}</td>
                  <td className="num">{fmt(r.volume)}</td>
                  <td>
                    <button onClick={() => removeVol(r)}>Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  return (
    <div>
      <button onClick={onBack}>‹ Kembali ke Daftar RAB</button>
      <div className="row mt">
        <h2>RAB BUILDER · {rabNama}</h2>
      </div>

      {msg && <div className={'msg mt ' + msg.t}>{msg.s}</div>}

      <div className="builder mt">
        <div className="builder-main">
          <div className="tabs mt">
            <button className={active === 'daftar' ? 'active' : ''} onClick={() => setActive('daftar')}>[ RAB ]</button>
            <button className={active === 'volume' ? 'active' : ''} onClick={() => setActive('volume')}>[ Volume ]</button>
            <button className={active === 'besi' ? 'active' : ''} onClick={() => setActive('besi')}>[ Besi ]</button>
            <button className={active === 'bom' ? 'active' : ''} onClick={() => setActive('bom')}>[ Bill of Material ]</button>
            <button className={active === 'jadwal' ? 'active' : ''} onClick={() => setActive('jadwal')}>[ Jadwal ]</button>
            <button className={active === 'rekap' ? 'active' : ''} onClick={() => setActive('rekap')}>[ Rekapitulasi ]</button>
          </div>

          {active === 'daftar' && (
            <div className="mt">
              <div className="card mt2">
            <table>
              <thead>
                <tr>
                  <th className="th-c">No</th>
                  <th className="th-c">Kode</th>
                  <th className="th-c">Uraian</th>
                  <th className="th-c">Sat<br /><span className="hdr-sub">A</span></th>
                  <th className="th-c">Volume<br /><span className="hdr-sub">B</span></th>
                  <th className="th-c">Harga Satuan<br /><span className="hdr-sub">C</span></th>
                  <th className="th-c">Total<br /><span className="hdr-sub">B × C</span></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let seq = 0
                  return grouped.map((g) => (
                    <Fragment key={g.div}>
                      <tr className="group-row">
                        <td colSpan={6}>
                          {g.nama ? g.nama : 'DIVISI ' + g.div}
                        </td>
                        <td className="num">{fmtRp(g.total)}</td>
                      </tr>
                      {g.list.map((it) => {
                        seq += 1
                        const h = hByItem.get(it.id)
                        return (
                          <tr key={it.id}>
                            <td className="num">{seq}</td>
                            <td data-click onClick={() => setSelItem(it.id)}>
                              {it.kode}
                              {it.is_user ? <span style={{ color: 'var(--red)' }}> · user</span> : ''}
                            </td>
                            <td data-click onClick={() => setSelItem(it.id)}>{it.uraian}</td>
                            <td className="num">{it.satuan ?? ''}</td>
                            <td className="num" data-click onClick={() => setSelVolItem(it.id)}>{fmt(it.volume)}</td>
                            <td className="num">{h ? fmtRp(h.subtotal.F) : ''}</td>
                            <td className="num">{h ? fmtRp(h.total) : ''}</td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))
                })()}
                {items.length > 0 && (
                  <tr className="group-row">
                    <td colSpan={6}>Total RAB</td>
                    <td className="num">{fmtRp(totalRAB)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {items.length === 0 && <div className="empty">Belum ada item. Tambahkan lewat pencarian referensi atau item user.</div>}
          </div>
        </div>
      )}

      {active === 'volume' && (
        <div className="mt">
          {grouped.map((g) => {
            const vg = g.list.filter((it) => !isPenulangan(it.kode))
            if (vg.length === 0) return null
            return (
              <div key={g.div} className="card mt2">
                <div className="group-row" style={{ padding: '6px 12px' }}>
                  {g.nama ? g.nama : 'DIVISI ' + g.div} · Total {fmtRp(g.total)}
                </div>
                {vg.map((it) => renderVolMain(it))}
                {vg.length === 0 && <div className="empty mt">Tidak ada item di divisi ini.</div>}
              </div>
            )
          })}
          {items.filter((it) => !isPenulangan(it.kode)).length === 0 && <div className="empty">Belum ada item volume (non-penulangan).</div>}
        </div>
      )}

      {active === 'besi' && (
        <div className="mt">
          {renderBesiMain()}
          {(() => {
            const pg = items.filter((it) => isPenulangan(it.kode))
            if (pg.length === 0) return null
            return (
              <>
                <div className="kicker mt" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                  Volume item penulangan — diambil otomatis dari profil besi level RAB sesuai kategori analisa
                </div>
                <table className="mt">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Uraian</th>
                      <th className="num">Kategori</th>
                      <th className="num">Volume (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.map((it) => {
                      const kat = tulanganKategori(it.uraian)
                      return (
                        <tr key={it.id} data-click onClick={() => setSelItem(it.id)}>
                          <td>{it.kode}</td>
                          <td>{it.uraian}</td>
                          <td className="num">
                            {kat.jenis ? (kat.jenis === 'ulir' ? 'BjTS' : 'BjTP') : 'semua'} × {kat.lt12 === null ? 'semua D' : kat.lt12 ? 'D&lt;12' : 'D≥12'}
                          </td>
                          <td className="num">{fmt(it.volume)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )
          })()}
        </div>
      )}

      {active === 'bom' && (
        <div className="card mt">
          <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
            Bill of Material — kebutuhan global (Σ koefisien × volume take-off), harga satuan per komponen. Klik baris untuk edit harga di sidebar kanan.
          </div>
          {bomGroups.map(([group, rows]) => (
            <div key={group} className="mt2">
              <table style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>Kode</th>
                    <th style={{ width: '38%' }}>Komponen</th>
                    <th style={{ width: '9%' }} className="num">Sat</th>
                    <th style={{ width: '13%' }} className="num">Qty Total</th>
                    <th style={{ width: '16%' }} className="num">Harga Satuan</th>
                    <th style={{ width: '12%' }} className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="group-row">
                    <td colSpan={6}>{group}</td>
                  </tr>
                  {rows.map((r) => {
                    const key = `${r.jenis}|${r.uraian}|${r.kode}|${r.satuan}`
                    return (
                      <tr key={key} data-click onClick={() => setSelBom(key)}>
                        <td>{r.kode ?? ''}</td>
                        <td>{r.uraian ?? ''}</td>
                        <td className="num">{r.satuan ?? ''}</td>
                        <td className="num">{fmt(r.qty)}</td>
                        <td className="num">{r.harga_satuan != null ? fmtRp(r.harga_satuan) : '-'}</td>
                        <td className="num">{r.total != null ? fmtRp(r.total) : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
          {bom.length === 0 && <div className="empty mt">Belum ada komponen. Tambahkan item pekerjaan dulu.</div>}
        </div>
      )}

      {active === 'jadwal' && renderJadwalMain()}

      {active === 'rekap' && (
        <div className="card mt">
          <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
            Rekapitulasi — anggaran per divisi, grand total & pembulatan
          </div>

          <table className="mt">
            <thead>
              <tr>
                <th className="num">No</th>
                <th>Divisi</th>
                <th className="num">Item</th>
                <th className="num">Anggaran</th>
                <th className="num">%</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g, i) => (
                <tr key={g.div}>
                  <td className="num">{i + 1}</td>
                  <td>{g.nama ? g.nama : 'DIVISI ' + g.div}</td>
                  <td className="num">{g.list.length}</td>
                  <td className="num">{fmtRp(g.total)}</td>
                  <td className="num">{totalRAB > 0 ? ((g.total / totalRAB) * 100).toFixed(1) + '%' : '-'}</td>
                </tr>
              ))}
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">Belum ada item pekerjaan.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="subtotal mt">
            <div className="line total"><span>Grand Total</span><b>{fmtRp(totalRAB)}</b></div>
            <div className="line"><span>Pembulatan (ke atas kelipatan {PEMBULATAN.toLocaleString('id-ID')})</span><b>{fmtRp(roundUp(totalRAB) - totalRAB)}</b></div>
            <div className="line total f"><span>Total Setelah Pembulatan</span><b>{fmtRp(roundUp(totalRAB))}</b></div>
            <div className="line"><span>Terbilang</span><b style={{ textTransform: 'none' }}>{terbilang(roundUp(totalRAB))}</b></div>
          </div>
        </div>
      )}
        </div>

        <div className="builder-tools">
          {active === 'volume' ? (
            // tab Volume: sidebar = editor input take-off item terpilih (hasil di main view)
            selVolItem != null && (() => {
              const it = items.find((i) => i.id === selVolItem)
              return it ? (
                <div className="tools-card anim" key={`v-${selVolItem}`}>
                  <div className="row" style={{ alignItems: 'center' }}>
                    <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                      Volume · {it.kode} — input
                    </div>
                    <button className="mini" onClick={() => setSelVolItem(null)}>Hide</button>
                  </div>
                  {renderVolBlock(it)}
                </div>
              ) : null
            })() || (
              <div className="tools-card">
                <div className="kicker" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                  Volume — input
                </div>
                <div className="empty mt">Klik baris take-off di main view untuk mengedit di sini.</div>
              </div>
            )
          ) : active === 'bom' ? (
            // tab BOM: sidebar = editor harga satuan komponen BOM terpilih (input di sini)
            <div className="tools-card anim" key="bom-editor">
              <div className="row" style={{ alignItems: 'center' }}>
                <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                  Komponen BOM — input
                </div>
                {selBom != null && <button className="mini" onClick={() => setSelBom(null)}>Hide</button>}
              </div>
              {renderBomEditor()}
            </div>
          ) : active === 'besi' ? (
            // tab Besi: sidebar = editor profil struktur + sub-tulangan (input di sini)
            <div className="tools-card anim" key="besi-editor">
              <div className="row" style={{ alignItems: 'center' }}>
                <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                  Profil Struktur — input
                </div>
                <button className="mini" onClick={() => setMinBesi((v) => !v)}>{minBesi ? '▸' : '▾'}</button>
              </div>
              {!minBesi && renderBesiEditor(true)}
            </div>
          ) : active === 'jadwal' ? (
            // tab Jadwal: sidebar = editor jadwal item terpilih (durasi, tanggal, predecessor)
            <div className="tools-card anim" key="jadwal-editor">
              <div className="row" style={{ alignItems: 'center' }}>
                <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                  Jadwal — input
                </div>
                {selJadwal != null && <button className="mini" onClick={() => setSelJadwal(null)}>Hide</button>}
              </div>
              {renderJadwalEditor()}
            </div>
          ) : (
            <>
              <div className="tools-card">
                <div className="row" style={{ alignItems: 'center' }}>
                  <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                    Tambah Item dari Referensi AHSP
                  </div>
                  <button className="mini" onClick={() => setMinRef((v) => !v)}>{minRef ? '▸' : '▾'}</button>
                </div>
                {!minRef && (
                  <>
                    <form className="row mt" onSubmit={(e) => { e.preventDefault(); doSearch() }}>
                      <input placeholder="Cari pekerjaan (mis. pagar, pondasi, beton)" value={search} onChange={(e) => setSearch(e.target.value)} />
                      <button type="submit">Cari</button>
                    </form>
                    {results.length > 0 && (
                      <table className="mt2">
                        <thead>
                          <tr>
                            <th style={{ width: '22%' }}>Kode</th>
                            <th>Uraian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((r) => (
                            <tr key={r.kode} onClick={() => addKode(r.kode)}>
                              <td data-click>{r.kode}</td>
                              <td data-click style={{ whiteSpace: 'normal' }}>{r.uraian}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>

              <div className="tools-card">
                <div className="row" style={{ alignItems: 'center' }}>
                  <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                    Item Userdefined
                  </div>
                  <button className="mini" onClick={() => setMinUser((v) => !v)}>{minUser ? '▸' : '▾'}</button>
                </div>
                {!minUser && (
                  <div className="mt" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input placeholder="Uraian (mis. Pekerjaan finishing custom)" value={uUraian} onChange={(e) => setUUraian(e.target.value)} />
                    <input placeholder="Satuan" value={uSatuan} onChange={(e) => setUSatuan(e.target.value)} />
                    <button onClick={addUserItem}>+ Tambah User</button>
                  </div>
                )}
              </div>

              {selItem != null && (() => {
                const h = hByItem.get(selItem)
                return h ? (
                  <div className="tools-card anim" key={`a-${selItem}`}>
                    <div className="row" style={{ alignItems: 'center' }}>
                      <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                        Analisa · {h.item.kode}
                      </div>
                      <button className="mini" onClick={() => setSelItem(null)}>Hide</button>
                    </div>
                    <div className="mt">
                      {renderKomponenCard(h)}
                    </div>
                  </div>
                ) : null
              })()}

              {selVolItem != null && (() => {
                const it = items.find((i) => i.id === selVolItem)
                return it ? (
                  <div className="tools-card anim" key={`v-${selVolItem}`}>
                    <div className="row" style={{ alignItems: 'center' }}>
                      <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
                        Volume · {it.kode}
                      </div>
                      <button className="mini" onClick={() => setSelVolItem(null)}>Hide</button>
                    </div>
                    {renderVolQuick(it)}
                  </div>
                ) : null
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
