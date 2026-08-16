import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'fs'
import { join } from 'path'
import { REF_SCHEMA } from './ref-schema'

interface TocNode {
  kode: string
  uraian?: string
  satuan?: string
  tipe?: string
  status?: string
  synthetic?: boolean
  children?: TocNode[]
}

interface Komponen {
  section?: string | null
  uraian?: string | null
  kode?: string | null
  satuan?: string | null
  koefisien?: number | string | null
  ref?: string | null
  harga_satuan?: number | null
  harga_jumlah?: number | null
}

interface Card {
  kode: string
  uraian?: string
  satuan?: string
  subtotal_rows?: unknown
  df?: unknown
  df_meaning?: unknown
  df_note?: string | null
  overhead_pct?: number | null
  komponen?: Komponen[]
}

interface MasterFile {
  tenaga_kerja?: { uraian: string; kode?: string | null; satuan?: string | null; count?: number }[]
  bahan?: { uraian: string; kode?: string | null; satuan?: string | null; count?: number }[]
  alat?: { uraian: string; kode?: string | null; satuan?: string | null; count?: number }[]
}

export const M1_PAT = /^m\s*['\u2019]?$/i

export function normSatuan(s: unknown): string | null {
  if (s == null) return null
  let t = String(s).trim()
  if (M1_PAT.test(t)) return 'm1'
  if (/^m\u00b2$/i.test(t)) return 'm2'
  const ohOj = new Set(['OH', 'OJ', 'Oh', 'Oj', 'oh', 'oj'])
  if (ohOj.has(t)) return t.toUpperCase()
  return t.toLowerCase()
}

// parse satuan dari uraian kartu, mis. '1 kg ...', "Pemasangan 1 m' ...", '1 m2 ...', '1 Unit ...', '1 Buah ...'
export function satuanFromUraian(uraian: unknown): string | null {
  if (uraian == null) return null
  const m = /\b1\s+([^\s,;.()]+)/.exec(String(uraian))
  return m ? normSatuan(m[1]) : null
}

export interface ImportResult {
  divisi: number
  item: number
  item_with_card: number
  komponen: number
  master: number
  meta_id: number
}

function nearestAncestor(
  kode: string,
  kodeMap: Map<string, { id: number; level: number; satuan: string | null }>
): { kode: string; level: number; satuan: string | null } | null {
  // kode berakhiran huruf menempel tanpa titik, mis. '2.2.1.1.6d' -> '2.2.1.1.6'
  const lettersStripped = kode.replace(/[a-z]+$/i, '')
  const direct = lettersStripped !== kode ? kodeMap.get(lettersStripped) : undefined
  let parts = lettersStripped.split('.')
  let nearest: { kode: string; level: number; satuan: string | null } | null = null
  let withSatuan: { satuan: string | null } | null = null
  if (direct) {
    nearest = { kode: lettersStripped, level: direct.level, satuan: direct.satuan }
    if (direct.satuan) withSatuan = { satuan: direct.satuan }
  }
  while (parts.length > 1) {
    parts = parts.slice(0, -1)
    const parentKode = parts.join('.')
    const found = kodeMap.get(parentKode)
    if (!found) continue
    if (!nearest) nearest = { kode: parentKode, level: found.level, satuan: found.satuan }
    if (found.satuan && !withSatuan) withSatuan = { satuan: found.satuan }
    if (withSatuan) break
  }
  if (nearest && withSatuan) nearest = { ...nearest, satuan: withSatuan.satuan }
  return nearest
}

export function importReference(
  db: DatabaseSync,
  opts: {
    dataDir: string
    kode: string
    nama: string
    jenis: string
    bidang: string
    as_of: string
  }
): ImportResult {
  const { dataDir, kode, nama, jenis, bidang, as_of } = opts

  db.exec('BEGIN;')
  db.exec('DELETE FROM ref_meta; DELETE FROM ref_komponen; DELETE FROM ref_item; DELETE FROM ref_divisi; DELETE FROM ref_master_komponen; DELETE FROM ref_besi;')

  const insertMeta = db.prepare(
    'INSERT INTO ref_meta (kode, nama, jenis, bidang, as_of, imported_at, file_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const metaRes = insertMeta.run(kode, nama, jenis, bidang, as_of, new Date().toISOString(), dataDir)
  const metaId = Number(metaRes.lastInsertRowid)

  const insertDivisi = db.prepare('INSERT INTO ref_divisi (no, nama) VALUES (?, ?)')
  const insertItem = db.prepare(
    `INSERT INTO ref_item (kode, uraian, satuan, level, parent_kode, tipe, source_status, synthetic, subtotal_rows, df, df_meaning, df_note, overhead_pct)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertKomponen = db.prepare(
    `INSERT INTO ref_komponen (item_id, jenis, uraian, kode, satuan, koefisien, ref, pos)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const insertMaster = db.prepare(
    'INSERT INTO ref_master_komponen (jenis, uraian, kode, satuan, count) VALUES (?, ?, ?, ?, ?)'
  )

  const toc = JSON.parse(readFileSync(join(dataDir, 'toc.json'), 'utf-8')) as TocNode[]
  const divIdByNo = new Map<number, number>()
  const kodeMap = new Map<string, { id: number; level: number; satuan: string | null }>()
  let itemCount = 0

  const walk = (nodes: TocNode[], parentKode: string | null, depth: number, curDiv: number | null) => {
    for (const nd of nodes) {
      let div = curDiv
      const divMatch = /^DIVISI\s+(\d+)$/i.exec(nd.kode)
      if (divMatch) {
        const no = Number(divMatch[1])
        if (!divIdByNo.has(no)) {
          const res = insertDivisi.run(String(no), nd.uraian ?? '')
          divIdByNo.set(no, Number(res.lastInsertRowid))
        }
        div = divIdByNo.get(no)!
      }
      const isLeaf = !nd.children || nd.children.length === 0
      const res = insertItem.run(
        nd.kode,
        nd.uraian ?? '',
        normSatuan(nd.satuan),
        depth,
        parentKode,
        nd.tipe ?? null,
        nd.status ?? null,
        nd.synthetic ? 1 : 0,
        null,
        null,
        null,
        null,
        null
      )
      kodeMap.set(nd.kode, { id: Number(res.lastInsertRowid), level: depth, satuan: normSatuan(nd.satuan) })
      itemCount += 1
      if (!isLeaf) walk(nd.children!, nd.kode, depth + 1, div)
    }
  }
  walk(toc, null, 0, null)

  const cardItemId = db.prepare('SELECT id FROM ref_item WHERE kode = ?')
  let komponenCount = 0
  let itemWithCard = 0
  let autoCreated = 0
  const cards = JSON.parse(readFileSync(join(dataDir, 'cards-ck-enriched.json'), 'utf-8')) as Card[]
  for (const card of cards) {
    let row = cardItemId.get(card.kode) as { id: number } | undefined
    if (!row) {
      // Kartu tidak punya node toc (mis. kode berakhiran huruf) — auto-create item
      // di bawah ancestor terdekat yang ada di toc, warisi satuan kartu atau ancestor.
      const komponen = card.komponen ?? []
      if (!card.uraian && komponen.length === 0) continue // kartu kosong (data tak ada) — skip
      const ancestor = nearestAncestor(card.kode, kodeMap)
      const level = ancestor ? ancestor.level + 1 : 0
      const satuan = normSatuan(card.satuan) ?? satuanFromUraian(card.uraian) ?? ancestor?.satuan ?? null
      const res = insertItem.run(
        card.kode,
        card.uraian ?? '',
        satuan,
        level,
        ancestor?.kode ?? null,
        null,
        null,
        1,
        null,
        null,
        null,
        null,
        null
      )
      row = { id: Number(res.lastInsertRowid) }
      kodeMap.set(card.kode, { id: row.id, level, satuan })
      itemCount += 1
      autoCreated += 1
    }
    itemWithCard += 1
    const komponen = card.komponen ?? []
    const subtotalRows = card.subtotal_rows ? JSON.stringify(card.subtotal_rows) : null
    const df = card.df ? JSON.stringify(card.df) : null
    const dfMeaning = card.df_meaning ? JSON.stringify(card.df_meaning) : null
    db.prepare(
      'UPDATE ref_item SET subtotal_rows = ?, df = ?, df_meaning = ?, df_note = ?, overhead_pct = ? WHERE id = ?'
    ).run(subtotalRows, df, dfMeaning, card.df_note ?? null, card.overhead_pct ?? null, row.id)
    komponen.forEach((k, i) => {
      insertKomponen.run(
        row.id,
        k.section ?? null,
        k.uraian ?? null,
        k.kode ?? null,
        normSatuan(k.satuan),
        k.koefisien != null ? Number(String(k.koefisien).replace(',', '.')) : null,
        k.ref ?? null,
        i
      )
      komponenCount += 1
    })
  }

  const master = JSON.parse(readFileSync(join(dataDir, 'komponen-master-merged.json'), 'utf-8')) as MasterFile
  let masterCount = 0
  for (const jenis of ['tenaga_kerja', 'bahan', 'alat'] as const) {
    for (const rec of master[jenis] ?? []) {
      insertMaster.run(jenis, rec.uraian, rec.kode ?? null, normSatuan(rec.satuan), rec.count ?? 0)
      masterCount += 1
    }
  }

  const insertBesi = db.prepare('INSERT INTO ref_besi (diameter, berat_kg_per_m) VALUES (?, ?)')
  for (const d of [4, 6, 8, 10, 12, 13, 16, 19, 22, 25, 28, 32]) {
    insertBesi.run(d, Number((Math.pow(d, 2) / 162.1).toFixed(4)))
  }

  db.exec('COMMIT;')
  console.log(`auto-created items dari kartu tanpa node toc: ${autoCreated}`)
  return { divisi: divIdByNo.size, item: itemCount, item_with_card: itemWithCard, komponen: komponenCount, master: masterCount, meta_id: metaId }
}

export function importReferenceFromArgs(dataDir: string, asOf: string): ImportResult {
  const db = new DatabaseSync(join(process.cwd(), '.data', 'estimato-ref.db'))
  db.exec(REF_SCHEMA)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  return importReference(db, {
    dataDir,
    kode: 'SE-DJBK-47-2026',
    nama: 'SE DJBK No. 47/SE/Dk/2026 Lampiran VI (Cipta Karya)',
    jenis: 'ahsp',
    bidang: 'cipta-karya',
    as_of: asOf
  })
}
