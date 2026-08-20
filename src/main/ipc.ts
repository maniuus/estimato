import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { SQLInputValue } from 'node:sqlite'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'path'
import { existsSync, copyFileSync, rmSync } from 'fs'
import { writeFile } from 'fs/promises'
import { app } from 'electron'
import { openDb } from './db'
import { APP_SCHEMA } from './db/app-schema'
import { REF_SCHEMA } from './db/ref-schema'
import { importReference } from './db/import-ref'

const DEFAULT_REF_SOURCE = {
  kode: 'SE-DJBK-47-2026',
  nama: 'SE DJBK No. 47/SE/Dk/2026 Lampiran VI (Cipta Karya)',
  jenis: 'ahsp',
  bidang: 'cipta-karya',
  as_of: '2026-08-15'
}

export function registerIpc() {
  const appDb = openDb('app')
  appDb.exec(APP_SCHEMA)

  // migrasi: kolom posisi (tulangan utama/sengkang) untuk db lama
  const tulCols = appDb.prepare("SELECT name FROM pragma_table_info('rab_volume_tulangan')").all() as { name: string }[]
  if (!tulCols.some((c) => c.name === 'posisi')) {
    appDb.exec('ALTER TABLE rab_volume_tulangan ADD COLUMN posisi TEXT')
  }

  // migrasi: dimensi penampang & jarak sengkang di rab_profil (model profil struktur)
  const profCols = appDb.prepare("SELECT name FROM pragma_table_info('rab_profil')").all() as { name: string }[]
  const profColsAdd: [string, string][] = [
    ['lebar', 'REAL'],
    ['tinggi', 'REAL'],
    ['selimut', 'REAL'],
    ['panjang_bentang', 'REAL'],
    ['jarak_tumpuan', 'REAL'],
    ['jarak_lapangan', 'REAL'],
  ]
  for (const [name, type] of profColsAdd) {
    if (!profCols.some((c) => c.name === name)) {
      appDb.exec(`ALTER TABLE rab_profil ADD COLUMN ${name} ${type}`)
    }
  }

  // migrasi: gambar penampang profil (data URL base64)
  const profCols2 = appDb.prepare("SELECT name FROM pragma_table_info('rab_profil')").all() as { name: string }[]
  if (!profCols2.some((c) => c.name === 'gambar')) {
    appDb.exec('ALTER TABLE rab_profil ADD COLUMN gambar TEXT')
  }

  // migrasi: jumlah pekerja utk hitung durasi di rab_jadwal
  const jadCols = appDb.prepare("SELECT name FROM pragma_table_info('rab_jadwal')").all() as { name: string }[]
  if (!jadCols.some((c) => c.name === 'jumlah_pekerja')) {
    appDb.exec('ALTER TABLE rab_jadwal ADD COLUMN jumlah_pekerja REAL DEFAULT 1')
  }

  const refDbPath = join(app.getPath('userData'), 'estimato-ref.db')
  const bundled = join(process.resourcesPath, 'estimato-ref.db')
  let needSeed = existsSync(bundled) && !existsSync(refDbPath)
  if (!needSeed && existsSync(bundled) && existsSync(refDbPath)) {
    try {
      const probe = new DatabaseSync(refDbPath, { readOnly: true })
      const m = probe.prepare('SELECT COUNT(*) AS c FROM ref_meta').get() as { c: number }
      probe.close()
      needSeed = m.c === 0
    } catch {
      needSeed = true
    }
  }
  if (needSeed) {
    try {
      rmSync(refDbPath, { force: true })
      rmSync(refDbPath + '-wal', { force: true })
      rmSync(refDbPath + '-shm', { force: true })
      copyFileSync(bundled, refDbPath)
      console.log('[estimato] referensi AHSP disalin dari bundled resources')
    } catch (err) {
      console.warn('[estimato] gagal salin referensi bundled:', err)
    }
  }

  const refDb = openDb('ref')
  refDb.exec(REF_SCHEMA)

  const metaCount = refDb.prepare('SELECT COUNT(*) AS c FROM ref_meta').get() as { c: number }
  if (metaCount.c === 0) {
    const dataDir = join(process.cwd(), '..', 'db-kons', 'data')
    if (existsSync(join(dataDir, 'toc.json'))) {
      try {
        importReference(refDb, { dataDir, ...DEFAULT_REF_SOURCE })
        console.log(`[estimato] referensi auto-seeded dari ${dataDir}`)
      } catch (err) {
        console.warn('[estimato] auto-seed referensi gagal:', err)
      }
    }
  }

  const now = () => new Date().toISOString()
  const json = <T>(v: unknown): T => (typeof v === 'string' ? (JSON.parse(v) as T) : (v as T))

  // Normalisasi jenis komponen kartu → jenis master (harga_katalog key).
  // ref_komponen.jenis = section kartu ('Tenaga Kerja'/'Bahan'/'Peralatan'),
  // ref_master_komponen.jenis = 'tenaga_kerja'/'bahan'/'alat'.
  const normJenis = (j: unknown): string | null => {
    const s = String(j ?? '').toLowerCase()
    if (s.includes('tenaga kerja')) return 'tenaga_kerja'
    if (s.includes('bahan')) return 'bahan'
    if (s.includes('peralatan')) return 'alat'
    return null
  }

  ipcMain.handle('ref:meta', () => {
    const row = refDb.prepare('SELECT * FROM ref_meta ORDER BY id DESC LIMIT 1').get()
    return row ? { ...row } : null
  })

  ipcMain.handle('ref:import', (_e, dataDir: string, asOf: string) => {
    return importReference(refDb, {
      dataDir,
      kode: 'SE-DJBK-47-2026',
      nama: 'SE DJBK No. 47/SE/Dk/2026 Lampiran VI (Cipta Karya)',
      jenis: 'ahsp',
      bidang: 'cipta-karya',
      as_of: asOf
    })
  })

  ipcMain.handle('ref:items', (_e, q?: string, divisi?: string, limit = 200) => {
    const params: (string | number)[] = []
    let sql = `
      SELECT i.id, i.kode, i.uraian, i.satuan, i.level, i.parent_kode, i.tipe,
             d.no AS divisi_no, d.nama AS divisi_nama
      FROM ref_item i LEFT JOIN ref_divisi d ON d.no = substr(i.kode, 1, 1)
    `
    const where: string[] = ['EXISTS (SELECT 1 FROM ref_komponen k WHERE k.item_id = i.id)']
    if (q) {
      where.push('(i.uraian LIKE ? OR i.kode LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }
    if (divisi) {
      where.push('d.no = ?')
      params.push(divisi)
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ' ORDER BY i.kode LIMIT ?'
    params.push(limit)
    return refDb.prepare(sql).all(...params)
  })

  ipcMain.handle('ref:item', (_e, kode: string) => {
    const item = refDb.prepare('SELECT * FROM ref_item WHERE kode = ?').get(kode) as Record<string, unknown> | undefined
    if (!item) return null
    const komponen = refDb.prepare('SELECT * FROM ref_komponen WHERE item_id = ? ORDER BY pos').all(Number(item.id))
    return {
      item: { ...item, subtotal_rows: json(item.subtotal_rows), df: json(item.df), df_meaning: json(item.df_meaning) },
      komponen
    }
  })

  ipcMain.handle('ref:master', (_e, q?: string, jenis?: string) => {
    const params: (string | number)[] = []
    let sql = `
      SELECT m.id, m.jenis, m.uraian, m.kode, m.satuan, m.count,
             h.harga AS harga_satuan
      FROM ref_master_komponen m
      LEFT JOIN harga_katalog h ON h.jenis = m.jenis AND h.uraian = m.uraian
    `
    const where: string[] = []
    if (q) {
      where.push('(m.uraian LIKE ? OR m.kode LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }
    if (jenis) {
      where.push('m.jenis = ?')
      params.push(jenis)
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ` ORDER BY CASE m.jenis WHEN 'tenaga_kerja' THEN 1 WHEN 'bahan' THEN 2 ELSE 3 END,
       CASE WHEN m.jenis = 'tenaga_kerja' THEN m.kode ELSE NULL END,
       CASE WHEN m.jenis != 'tenaga_kerja' THEN m.count END DESC, m.uraian`
    return appDb.prepare(sql).all(...params)
  })

  ipcMain.handle('ref:masterBulk', (_e, items: { id: number; hargaSatuan: number | null }[]) => {
    if (!Array.isArray(items) || items.length === 0) return { updated: 0 }
    const upd = appDb.prepare(
      `INSERT INTO harga_katalog (jenis, uraian, harga, updated_at)
       SELECT m.jenis, m.uraian, ?, ? FROM ref_master_komponen m WHERE m.id = ?
       ON CONFLICT(jenis, uraian) DO UPDATE SET harga = excluded.harga, updated_at = excluded.updated_at`
    )
    appDb.exec('BEGIN;')
    let updated = 0
    for (const it of items) {
      const v = typeof it.hargaSatuan === 'number' && !Number.isNaN(it.hargaSatuan) ? it.hargaSatuan : null
      const res = upd.run(v, now(), it.id)
      updated += Number(res.changes)
    }
    appDb.exec('COMMIT;')
    return { updated }
  })

  ipcMain.handle('ref:besi', () => refDb.prepare('SELECT id, diameter, berat_kg_per_m FROM ref_besi ORDER BY diameter').all())

  ipcMain.handle('projek:list', () => appDb.prepare('SELECT * FROM projek ORDER BY updated_at DESC').all())

  ipcMain.handle('projek:create', (_e, nama: string, klien?: string, lokasi?: string, deskripsi?: string) => {
    const t = now()
    const res = appDb.prepare(
      'INSERT INTO projek (nama, klien, lokasi, deskripsi, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(nama, klien ?? null, lokasi ?? null, deskripsi ?? null, t, t)
    return appDb.prepare('SELECT * FROM projek WHERE id = ?').get(Number(res.lastInsertRowid))
  })

  ipcMain.handle('projek:update', (_e, id: number, data: Partial<Pick<{ nama: string; klien: string; lokasi: string; deskripsi: string }, 'nama' | 'klien' | 'lokasi' | 'deskripsi'>>) => {
    const fields = Object.keys(data)
    if (!fields.length) return appDb.prepare('SELECT * FROM projek WHERE id = ?').get(id)
    const set = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => (data as Record<string, string | null | undefined>)[f] ?? null)
    appDb.prepare(`UPDATE projek SET ${set}, updated_at = ? WHERE id = ?`).run(...values, now(), id)
    return appDb.prepare('SELECT * FROM projek WHERE id = ?').get(id)
  })

  ipcMain.handle('projek:setting', (_e, projekId: number) =>
    appDb.prepare('SELECT * FROM projek_setting WHERE projek_id = ?').get(projekId)
  )

  ipcMain.handle('projek:saveSetting', (_e, projekId: number, data: Record<string, string | null | undefined>) => {
    const fields = Object.keys(data).filter((f) => f !== 'projek_id')
    const keys = [...fields, 'projek_id']
    const marks = keys.map(() => '?').join(', ')
    const values = keys.map((f) => (f === 'projek_id' ? projekId : (data[f] ?? null)))
    appDb.prepare(
      `INSERT INTO projek_setting (${keys.join(', ')}) VALUES (${marks})
       ON CONFLICT(projek_id) DO UPDATE SET ${fields.map((f) => `${f} = excluded.${f}`).join(', ')}`
    ).run(...values)
    return appDb.prepare('SELECT * FROM projek_setting WHERE projek_id = ?').get(projekId)
  })

  ipcMain.handle('projek:remove', (_e, id: number) => {
    appDb.exec('BEGIN;')
    appDb.prepare('DELETE FROM rab_item_komponen WHERE rab_item_id IN (SELECT id FROM rab_item WHERE rab_id IN (SELECT id FROM rab WHERE projek_id = ?))').run(id)
    appDb.prepare('DELETE FROM rab_item WHERE rab_id IN (SELECT id FROM rab WHERE projek_id = ?)').run(id)
    appDb.prepare('DELETE FROM rab WHERE projek_id = ?').run(id)
    appDb.prepare('DELETE FROM projek WHERE id = ?').run(id)
    appDb.exec('COMMIT;')
    return { ok: true }
  })

  ipcMain.handle('rab:list', (_e, projekId: number) =>
    appDb.prepare('SELECT * FROM rab WHERE projek_id = ? ORDER BY created_at').all(projekId)
  )

  ipcMain.handle('rab:create', (_e, projekId: number, nama: string) => {
    const meta = refDb.prepare('SELECT id FROM ref_meta ORDER BY id DESC LIMIT 1').get() as { id: number } | undefined
    const t = now()
    const res = appDb.prepare('INSERT INTO rab (projek_id, nama, ref_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      projekId, nama, meta?.id ?? null, t, t
    )
    return appDb.prepare('SELECT * FROM rab WHERE id = ?').get(Number(res.lastInsertRowid))
  })

  ipcMain.handle('rab:remove', (_e, id: number) => {
    appDb.exec('BEGIN;')
    appDb.prepare('DELETE FROM rab_item_komponen WHERE rab_item_id IN (SELECT id FROM rab_item WHERE rab_id = ?)').run(id)
    appDb.prepare('DELETE FROM rab_volume_tulangan WHERE rab_volume_id IN (SELECT id FROM rab_volume WHERE rab_item_id IN (SELECT id FROM rab_item WHERE rab_id = ?))').run(id)
    appDb.prepare('DELETE FROM rab_volume WHERE rab_item_id IN (SELECT id FROM rab_item WHERE rab_id = ?)').run(id)
    appDb.prepare('DELETE FROM rab_profil_tulangan WHERE rab_profil_id IN (SELECT id FROM rab_profil WHERE rab_id = ?)').run(id)
    appDb.prepare('DELETE FROM rab_profil WHERE rab_id = ?').run(id)
    appDb.prepare('DELETE FROM rab_item WHERE rab_id = ?').run(id)
    appDb.prepare('DELETE FROM rab WHERE id = ?').run(id)
    appDb.exec('COMMIT;')
    return { ok: true }
  })

  ipcMain.handle('rab:items', (_e, rabId: number) => {
    const items = appDb.prepare('SELECT * FROM rab_item WHERE rab_id = ? ORDER BY pos').all(rabId) as Record<string, unknown>[]
    const komp = appDb.prepare(
      'SELECT k.* FROM rab_item_komponen k JOIN rab_item i ON i.id = k.rab_item_id WHERE i.rab_id = ? ORDER BY k.rab_item_id, k.pos'
    ).all(rabId) as Record<string, unknown>[]
    const byItem = new Map<number, Record<string, unknown>[]>()
    for (const k of komp) {
      const arr = byItem.get(Number(k.rab_item_id)) ?? []
      arr.push(k)
      byItem.set(Number(k.rab_item_id), arr)
    }
    // divisi_nama dari digit pertama kode item (hanya untuk item SE; item user ikut digit pertama)
    return items.map((i) => {
      const kode = String(i.kode ?? '')
      const no = kode.charAt(0)
      const d = refDb.prepare('SELECT nama FROM ref_divisi WHERE no = ?').get(no) as { nama: string } | undefined
      return { ...i, komponen: byItem.get(Number(i.id)) ?? [], divisi_nama: d?.nama ?? null }
    })
  })

  ipcMain.handle('rab:addItem', (_e, rabId: number, kode: string, volume = 0) => {
    const card = refDb.prepare('SELECT * FROM ref_item WHERE kode = ?').get(kode) as Record<string, unknown> | undefined
    if (!card) throw new Error(`Item referensi tidak ditemukan: ${kode}`)
    const komponen = refDb.prepare('SELECT * FROM ref_komponen WHERE item_id = ? ORDER BY pos').all(Number(card.id)) as Record<string, unknown>[]
    const last = appDb.prepare('SELECT MAX(pos) AS m FROM rab_item WHERE rab_id = ?').get(rabId) as { m: number | null }
    appDb.exec('BEGIN;')
    const res = appDb.prepare(
      'INSERT INTO rab_item (rab_id, ref_item_id, kode, uraian, satuan, volume, level, is_user, pos) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
    ).run(rabId, card.id as number, String(card.kode), String(card.uraian), card.satuan as string | null, volume, card.level as number, (last.m ?? -1) + 1)
    const itemId = Number(res.lastInsertRowid)
    const insKomp = appDb.prepare(
      'INSERT INTO rab_item_komponen (rab_item_id, jenis, uraian, kode, satuan, koefisien, harga_satuan, pos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const k of komponen) {
      const nj = normJenis(k.jenis)
      const h = nj
        ? (appDb.prepare('SELECT harga FROM harga_katalog WHERE jenis = ? AND uraian = ?').get(nj, k.uraian as string | null) as { harga: number | null } | undefined)
        : undefined
      insKomp.run(itemId, k.jenis as string | null, k.uraian as string | null, k.kode as string | null, k.satuan as string | null, k.koefisien as number | null, h?.harga ?? null, k.pos as number)
    }
    appDb.exec('COMMIT;')
    return appDb.prepare('SELECT * FROM rab_item WHERE id = ?').get(itemId)
  })

  ipcMain.handle('rab:addUserItem', (_e, rabId: number, parentId: number | null, uraian: string, satuan?: string, volume = 0) => {
    if (!uraian.trim()) throw new Error('Uraian wajib diisi')
    const last = appDb.prepare('SELECT MAX(pos) AS m FROM rab_item WHERE rab_id = ?').get(rabId) as { m: number | null }
    const parent = parentId ? (appDb.prepare('SELECT * FROM rab_item WHERE id = ?').get(parentId) as Record<string, unknown> | undefined) : undefined
    const level = parent ? Number(parent.level) + 1 : 0
    const pKode = parent ? String(parent.kode) : ''
    const n = (appDb.prepare('SELECT COUNT(*) AS c FROM rab_item WHERE rab_id = ? AND parent_id = ?').get(rabId, parentId) as { c: number }).c + 1
    const kode = `${pKode}${pKode ? '.' : ''}${n}-u`
    const res = appDb.prepare(
      'INSERT INTO rab_item (rab_id, ref_item_id, kode, uraian, satuan, volume, level, parent_id, is_user, pos) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, ?)'
    ).run(rabId, kode, uraian, satuan ?? null, volume, level, parentId, (last.m ?? -1) + 1)
    return appDb.prepare('SELECT * FROM rab_item WHERE id = ?').get(Number(res.lastInsertRowid))
  })

  ipcMain.handle('rab:updateItem', (_e, id: number, data: Partial<Pick<{ uraian: string; satuan: string; volume: number }, 'uraian' | 'satuan' | 'volume'>>) => {
    const fields = Object.keys(data)
    if (!fields.length) return appDb.prepare('SELECT * FROM rab_item WHERE id = ?').get(id)
    const set = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => (data as Record<string, string | number | null>)[f])
    appDb.prepare(`UPDATE rab_item SET ${set} WHERE id = ?`).run(...values, id)
    return appDb.prepare('SELECT * FROM rab_item WHERE id = ?').get(id)
  })

  ipcMain.handle('rab:removeItem', (_e, id: number) => {
    appDb.exec('BEGIN;')
    try {
      appDb
        .prepare(
          'DELETE FROM rab_volume_tulangan WHERE rab_volume_id IN (SELECT id FROM rab_volume WHERE rab_item_id = ?)'
        )
        .run(id)
      appDb.prepare('DELETE FROM rab_volume WHERE rab_item_id = ?').run(id)
      appDb.prepare('DELETE FROM rab_item_komponen WHERE rab_item_id = ?').run(id)
      appDb.prepare('DELETE FROM rab_item WHERE id = ?').run(id)
      appDb.exec('COMMIT;')
    } catch (err) {
      appDb.exec('ROLLBACK;')
      throw err
    }
    return { ok: true }
  })

  // --- Volume take-off ---
  // volume per baris take-off sesuai satuan item: m1=panjang×jumlah, m2=panjang×lebar×jumlah,
  // m3=panjang×lebar×tinggi×jumlah, lainnya=jumlah
  const rowVolume = (satuan: string | null, r: { panjang: number | null; lebar: number | null; tinggi: number | null; jumlah: number | null }): number => {
    const j = r.jumlah ?? 1
    const p = r.panjang ?? 0
    const l = r.lebar ?? 0
    const t = r.tinggi ?? 0
    const s = String(satuan ?? '').toLowerCase().trim()
    if (s === 'm1') return p * j
    if (s === 'm2') return p * l * j
    if (s === 'm3') return p * l * t * j
    return j
  }

  // item penulangan: kode prefix 2.2.1.1 (divisi 2.2.1.1 Pekerjaan Penulangan)
  const isPenulangan = (kode: string | null) => String(kode ?? '').startsWith('2.2.1.1')

  // kategori tulangan dari uraian item analisa: BjTP=polos, BjTS=ulir, diameter <12/≥12.
  // Kartu penulangan terpisah per kategori — volume item hanya dihitung dari baris tulangan yang cocok.
  const tulanganKategori = (uraian: string | null): { jenis: string | null; lt12: boolean | null } => {
    const u = String(uraian ?? '')
    let jenis: string | null = null
    if (u.includes('BjTP')) jenis = 'polos'
    else if (u.includes('BjTS')) jenis = 'ulir'
    let lt12: boolean | null = null
    if (/diameter\s*<\s*12/.test(u)) lt12 = true
    else if (/diameter\s*(≥|>=)\s*12/.test(u)) lt12 = false
    return { jenis, lt12 }
  }

  const cocokTulangan = (jenis: string | null, diameter: number | null, kat: { jenis: string | null; lt12: boolean | null }): boolean => {
    if (kat.jenis && (jenis ?? '') !== kat.jenis) return false
    if (kat.lt12 !== null && ((diameter ?? 0) < 12) !== kat.lt12) return false
    return true
  }

  // berat besi per profil take-off (per item — model lama): Σ atas baris tulangan — kebutuhan batang 12m dihitung dari
  // total panjang (jumlah profil × jumlah batang/profil × panjang tiap batang), berat = batang × 12 × d²/162,1.
  const beratBesiProfil = (volumeRow: { id: number; jumlah: number | null }, kat: { jenis: string | null; lt12: boolean | null }): number => {
    const rows = appDb.prepare('SELECT jenis, diameter, jumlah, panjang FROM rab_volume_tulangan WHERE rab_volume_id = ?').all(volumeRow.id) as Record<string, unknown>[]
    const nProfil = volumeRow.jumlah ?? 1
    return rows.reduce((acc, t) => {
      if (!cocokTulangan(t.jenis as string | null, t.diameter as number | null, kat)) return acc
      const d = Number(t.diameter) || 0
      const j = Number(t.jumlah) || 0
      const p = Number(t.panjang) || 0
      const totalPanjang = nProfil * j * p
      if (totalPanjang <= 0) return acc
      const batang = Math.ceil(totalPanjang / 12)
      return acc + batang * 12 * (Math.pow(d, 2) / 162.1)
    }, 0)
  }

  // hitung panjang & jumlah sengkang dari dimensi penampang (mm) + jarak (mm) + diameter (mm).
  // panjang per sengkang (m) = keliling bersih + hook 2×6d; dibagi 1000 (dimensi mm → m).
  // jumlah sengkang: daerah tumpuan L/4 tiap ujung (total L/2) + lapangan L/2; tiap batas +1.
  const hitungSengkang = (
    p: { lebar: number | null; tinggi: number | null; selimut: number | null; panjang_bentang: number | null; jarak_tumpuan: number | null; jarak_lapangan: number | null },
    d: number
  ): { panjang: number; jumlah: number } | null => {
    const b = p.lebar
    const h = p.tinggi
    const c = p.selimut
    const L = p.panjang_bentang
    const sT = p.jarak_tumpuan
    const sL = p.jarak_lapangan
    if (b == null || h == null || c == null || L == null || sT == null || sL == null || sT <= 0 || sL <= 0) return null
    if (b <= 2 * c || h <= 2 * c) return null
    const panjang = (2 * (b - 2 * c + h - 2 * c) + 2 * 6 * d) / 1000
    const Lmm = L * 1000
    const nTumpuan = 2 * (Math.ceil(Lmm / 4 / sT) + 1)
    const nLapangan = Math.ceil(Lmm / 2 / sL) + 1
    return { panjang, jumlah: nTumpuan + nLapangan }
  }

  // berat besi level RAB: Σ atas SEMUA rab_profil_tulangan dalam RAB (model baru) — kebutuhan batang 12m
  // dari total panjang (jumlah profil × jumlah batang × panjang), berat = batang × 12 × d²/162,1.
  // Untuk baris posisi sengkang, jumlah & panjang dihitung dari dimensi penampang profil (hitungSengkang).
  // Hanya baris yang cocok kategori item yang dihitung (volume = sesuai analisa).
  const beratKategoriRAB = (rabId: number, kat: { jenis: string | null; lt12: boolean | null }): number => {
    const rows = appDb.prepare(
      `SELECT pt.posisi, pt.jenis, pt.diameter, pt.jumlah, pt.panjang, p.jumlah AS n_profil,
              p.lebar, p.tinggi, p.selimut, p.panjang_bentang, p.jarak_tumpuan, p.jarak_lapangan
       FROM rab_profil_tulangan pt JOIN rab_profil p ON p.id = pt.rab_profil_id
       WHERE p.rab_id = ?`
    ).all(rabId) as Record<string, unknown>[]
    return rows.reduce((acc, t) => {
      if (!cocokTulangan(t.jenis as string | null, t.diameter as number | null, kat)) return acc
      const d = Number(t.diameter) || 0
      let j = Number(t.jumlah) || 0
      let p = Number(t.panjang) || 0
      if (t.posisi === 'sengkang') {
        const sk = hitungSengkang(t as unknown as { lebar: number | null; tinggi: number | null; selimut: number | null; panjang_bentang: number | null; jarak_tumpuan: number | null; jarak_lapangan: number | null }, d)
        if (!sk) return acc
        j = sk.jumlah
        p = sk.panjang
      } else if (t.panjang_bentang != null) {
        // tulangan utama membentang sepanjang elemen — panjang = bentang
        p = Number(t.panjang_bentang) || 0
      }
      const totalPanjang = (Number(t.n_profil) || 1) * j * p
      if (totalPanjang <= 0) return acc
      const batang = Math.ceil(totalPanjang / 12)
      return acc + batang * 12 * (Math.pow(d, 2) / 162.1)
    }, 0)
  }

  // hitung ulang semua item penulangan dalam RAB (dipakai setelah profil/tulangan berubah)
  const recalcPenulanganRAB = (rabId: number) => {
    const items = appDb.prepare('SELECT id FROM rab_item WHERE rab_id = ?').all(rabId) as { id: number }[]
    for (const it of items) recalcItemVolume(it.id)
  }

  // hitung ulang rab_item.volume = Σ volume baris take-off (0 jika tak ada baris);
  // untuk item penulangan, volume = total berat besi (kg) dari profil level RAB yang cocok kategori item
  const recalcItemVolume = (itemId: number) => {
    const item = appDb.prepare('SELECT satuan, kode, uraian, rab_id FROM rab_item WHERE id = ?').get(itemId) as { satuan: string | null; kode: string; uraian: string | null; rab_id: number } | undefined
    if (!item) return
    const rows = appDb.prepare('SELECT id, panjang, lebar, tinggi, jumlah FROM rab_volume WHERE rab_item_id = ?').all(itemId) as Record<string, unknown>[]
    let total: number
    if (isPenulangan(item.kode)) {
      const kat = tulanganKategori(item.uraian)
      total = beratKategoriRAB(item.rab_id, kat)
    } else {
      total = rows.reduce((acc, r) => acc + rowVolume(item.satuan, { panjang: r.panjang as number | null, lebar: r.lebar as number | null, tinggi: r.tinggi as number | null, jumlah: r.jumlah as number | null }), 0)
    }
    appDb.prepare('UPDATE rab_item SET volume = ? WHERE id = ?').run(total, itemId)
  }

  ipcMain.handle('rab:volumes', (_e, rabId: number) => {
    const rows = appDb.prepare(
      `SELECT v.*, i.kode AS item_kode, i.uraian AS item_uraian, i.satuan AS item_satuan
       FROM rab_volume v JOIN rab_item i ON i.id = v.rab_item_id
       WHERE i.rab_id = ? ORDER BY v.rab_item_id, v.pos`
    ).all(rabId) as Record<string, unknown>[]
    return rows.map((r) => ({
      ...r,
      volume: isPenulangan(r.item_kode as string | null)
        ? beratBesiProfil(r as { id: number; jumlah: number | null }, tulanganKategori(r.item_uraian as string | null))
        : rowVolume(r.item_satuan as string | null, { panjang: r.panjang as number | null, lebar: r.lebar as number | null, tinggi: r.tinggi as number | null, jumlah: r.jumlah as number | null })
    }))
  })

  ipcMain.handle('rab:addVolume', (_e, rabItemId: number, uraian: string | null, panjang: number | null, lebar: number | null, tinggi: number | null, jumlah: number | null) => {
    const pos = Number((appDb.prepare('SELECT MAX(pos) AS m FROM rab_volume WHERE rab_item_id = ?').get(rabItemId) as { m: number | null }).m ?? -1) + 1
    const res = appDb.prepare('INSERT INTO rab_volume (rab_item_id, uraian, panjang, lebar, tinggi, jumlah, pos) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(rabItemId, uraian, panjang, lebar, tinggi, jumlah ?? 1, pos)
    recalcItemVolume(rabItemId)
    return appDb.prepare('SELECT * FROM rab_volume WHERE id = ?').get(Number(res.lastInsertRowid))
  })

  ipcMain.handle('rab:updateVolume', (_e, id: number, data: Partial<Pick<{ uraian: string; panjang: number; lebar: number; tinggi: number; jumlah: number }, 'uraian' | 'panjang' | 'lebar' | 'tinggi' | 'jumlah'>>) => {
    const fields = Object.keys(data)
    if (!fields.length) return appDb.prepare('SELECT * FROM rab_volume WHERE id = ?').get(id)
    const set = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => (data as Record<string, unknown>)[f]) as SQLInputValue[]
    appDb.prepare(`UPDATE rab_volume SET ${set} WHERE id = ?`).run(...values, id)
    const row = appDb.prepare('SELECT rab_item_id FROM rab_volume WHERE id = ?').get(id) as { rab_item_id: number }
    recalcItemVolume(row.rab_item_id)
    return appDb.prepare('SELECT * FROM rab_volume WHERE id = ?').get(id)
  })

  ipcMain.handle('rab:removeVolume', (_e, id: number) => {
    const row = appDb.prepare('SELECT rab_item_id FROM rab_volume WHERE id = ?').get(id) as { rab_item_id: number } | undefined
    if (row) {
      appDb.prepare('DELETE FROM rab_volume_tulangan WHERE rab_volume_id = ?').run(id)
      appDb.prepare('DELETE FROM rab_volume WHERE id = ?').run(id)
      recalcItemVolume(row.rab_item_id)
    }
    return { ok: true }
  })

  // --- Tulangan (baris besi dalam profil take-off penulangan) ---
  ipcMain.handle('rab:tulangan', (_e, rabVolumeId: number) => {
    return appDb.prepare('SELECT * FROM rab_volume_tulangan WHERE rab_volume_id = ? ORDER BY pos').all(rabVolumeId)
  })

  ipcMain.handle('rab:addTulangan', (_e, rabVolumeId: number, posisi: string | null, jenis: string | null, diameter: number | null, jumlah: number | null, panjang: number | null) => {
    const pos = Number((appDb.prepare('SELECT MAX(pos) AS m FROM rab_volume_tulangan WHERE rab_volume_id = ?').get(rabVolumeId) as { m: number | null }).m ?? -1) + 1
    const res = appDb.prepare('INSERT INTO rab_volume_tulangan (rab_volume_id, posisi, jenis, diameter, jumlah, panjang, pos) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(rabVolumeId, posisi ?? null, jenis, diameter, jumlah ?? 1, panjang ?? 0, pos)
    const row = appDb.prepare('SELECT rab_item_id FROM rab_volume WHERE id = ?').get(rabVolumeId) as { rab_item_id: number }
    recalcItemVolume(row.rab_item_id)
    return appDb.prepare('SELECT * FROM rab_volume_tulangan WHERE id = ?').get(Number(res.lastInsertRowid))
  })

  ipcMain.handle('rab:updateTulangan', (_e, id: number, data: Partial<Pick<{ posisi: string; jenis: string; diameter: number; jumlah: number; panjang: number }, 'posisi' | 'jenis' | 'diameter' | 'jumlah' | 'panjang'>>) => {
    const fields = Object.keys(data)
    if (!fields.length) return appDb.prepare('SELECT * FROM rab_volume_tulangan WHERE id = ?').get(id)
    const set = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => (data as Record<string, string | number | null>)[f] ?? null)
    appDb.prepare(`UPDATE rab_volume_tulangan SET ${set} WHERE id = ?`).run(...values, id)
    const row = appDb.prepare('SELECT rab_volume_id FROM rab_volume_tulangan WHERE id = ?').get(id) as { rab_volume_id: number }
    const vr = appDb.prepare('SELECT rab_item_id FROM rab_volume WHERE id = ?').get(row.rab_volume_id) as { rab_item_id: number }
    recalcItemVolume(vr.rab_item_id)
    return appDb.prepare('SELECT * FROM rab_volume_tulangan WHERE id = ?').get(id)
  })

  ipcMain.handle('rab:removeTulangan', (_e, id: number) => {
    const row = appDb.prepare('SELECT rab_volume_id FROM rab_volume_tulangan WHERE id = ?').get(id) as { rab_volume_id: number } | undefined
    if (row) {
      appDb.prepare('DELETE FROM rab_volume_tulangan WHERE id = ?').run(id)
      const vr = appDb.prepare('SELECT rab_item_id FROM rab_volume WHERE id = ?').get(row.rab_volume_id) as { rab_item_id: number }
      recalcItemVolume(vr.rab_item_id)
    }
    return { ok: true }
  })

  // --- Profil struktur besi level RAB ---
  ipcMain.handle('rab:profiles', (_e, rabId: number) =>
    appDb.prepare('SELECT * FROM rab_profil WHERE rab_id = ? ORDER BY pos').all(rabId)
  )

  ipcMain.handle('rab:addProfile', (_e, rabId: number, data: { uraian: string | null; jumlah: number | null }) => {
    const pos = Number((appDb.prepare('SELECT MAX(pos) AS m FROM rab_profil WHERE rab_id = ?').get(rabId) as { m: number | null }).m ?? -1) + 1
    const res = appDb.prepare('INSERT INTO rab_profil (rab_id, uraian, jumlah, pos) VALUES (?, ?, ?, ?)')
      .run(rabId, data.uraian ?? null, data.jumlah ?? 1, pos)
    recalcPenulanganRAB(rabId)
    return appDb.prepare('SELECT * FROM rab_profil WHERE id = ?').get(Number(res.lastInsertRowid))
  })

  ipcMain.handle('rab:updateProfile', (_e, id: number, data: Partial<Pick<{ uraian: string; jumlah: number; lebar: number; tinggi: number; selimut: number; panjang_bentang: number; jarak_tumpuan: number; jarak_lapangan: number }, 'uraian' | 'jumlah' | 'lebar' | 'tinggi' | 'selimut' | 'panjang_bentang' | 'jarak_tumpuan' | 'jarak_lapangan'>>) => {
    const fields = Object.keys(data)
    if (!fields.length) return appDb.prepare('SELECT * FROM rab_profil WHERE id = ?').get(id)
    const set = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => (data as Record<string, unknown>)[f]) as SQLInputValue[]
    appDb.prepare(`UPDATE rab_profil SET ${set} WHERE id = ?`).run(...values, id)
    const p = appDb.prepare('SELECT rab_id FROM rab_profil WHERE id = ?').get(id) as { rab_id: number }
    recalcPenulanganRAB(p.rab_id)
    return appDb.prepare('SELECT * FROM rab_profil WHERE id = ?').get(id)
  })

  ipcMain.handle('rab:removeProfile', (_e, id: number) => {
    const p = appDb.prepare('SELECT rab_id FROM rab_profil WHERE id = ?').get(id) as { rab_id: number } | undefined
    if (p) {
      appDb.prepare('DELETE FROM rab_profil_tulangan WHERE rab_profil_id = ?').run(id)
      appDb.prepare('DELETE FROM rab_profil WHERE id = ?').run(id)
      recalcPenulanganRAB(p.rab_id)
    }
    return { ok: true }
  })

  ipcMain.handle('rab:profilTulangan', (_e, rabProfilId: number) =>
    appDb.prepare('SELECT * FROM rab_profil_tulangan WHERE rab_profil_id = ? ORDER BY pos').all(rabProfilId)
  )

  ipcMain.handle('rab:addProfilTulangan', (_e, rabProfilId: number, posisi: string | null, jenis: string | null, diameter: number | null, jumlah: number | null, panjang: number | null) => {
    const pos = Number((appDb.prepare('SELECT MAX(pos) AS m FROM rab_profil_tulangan WHERE rab_profil_id = ?').get(rabProfilId) as { m: number | null }).m ?? -1) + 1
    const res = appDb.prepare('INSERT INTO rab_profil_tulangan (rab_profil_id, posisi, jenis, diameter, jumlah, panjang, pos) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(rabProfilId, posisi ?? null, jenis, diameter, jumlah ?? 1, panjang ?? 0, pos)
    const p = appDb.prepare('SELECT rab_id FROM rab_profil WHERE id = ?').get(rabProfilId) as { rab_id: number }
    recalcPenulanganRAB(p.rab_id)
    return appDb.prepare('SELECT * FROM rab_profil_tulangan WHERE id = ?').get(Number(res.lastInsertRowid))
  })

  ipcMain.handle('rab:updateProfilTulangan', (_e, id: number, data: Partial<Pick<{ posisi: string; jenis: string; diameter: number; jumlah: number; panjang: number }, 'posisi' | 'jenis' | 'diameter' | 'jumlah' | 'panjang'>>) => {
    const fields = Object.keys(data)
    if (!fields.length) return appDb.prepare('SELECT * FROM rab_profil_tulangan WHERE id = ?').get(id)
    const set = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => (data as Record<string, string | number | null>)[f] ?? null)
    appDb.prepare(`UPDATE rab_profil_tulangan SET ${set} WHERE id = ?`).run(...values, id)
    const row = appDb.prepare('SELECT rab_profil_id FROM rab_profil_tulangan WHERE id = ?').get(id) as { rab_profil_id: number }
    const p = appDb.prepare('SELECT rab_id FROM rab_profil WHERE id = ?').get(row.rab_profil_id) as { rab_id: number }
    recalcPenulanganRAB(p.rab_id)
    return appDb.prepare('SELECT * FROM rab_profil_tulangan WHERE id = ?').get(id)
  })

  ipcMain.handle('rab:removeProfilTulangan', (_e, id: number) => {
    const row = appDb.prepare('SELECT rab_profil_id FROM rab_profil_tulangan WHERE id = ?').get(id) as { rab_profil_id: number } | undefined
    if (row) {
      appDb.prepare('DELETE FROM rab_profil_tulangan WHERE id = ?').run(id)
      const p = appDb.prepare('SELECT rab_id FROM rab_profil WHERE id = ?').get(row.rab_profil_id) as { rab_id: number }
      recalcPenulanganRAB(p.rab_id)
    }
    return { ok: true }
  })

  // --- Jadwal & WBS ---
  // jadwal: satu baris per item RAB (durasi, tanggal mulai/selesai manual opsional).
  // hitung CPM earliest start/finish dilakukan di frontend; backend hanya simpan data.
  ipcMain.handle('rab:jadwal', (_e, rabId: number) => {
    appDb.prepare(
      `INSERT INTO rab_jadwal (rab_item_id, durasi, pos)
       SELECT id, 1, pos FROM rab_item WHERE rab_id = ? AND id NOT IN (SELECT rab_item_id FROM rab_jadwal)
       ON CONFLICT(rab_item_id) DO NOTHING`
    ).run(rabId)
    return appDb.prepare(
      `SELECT j.*, i.kode AS item_kode, i.uraian AS item_uraian, i.satuan AS item_satuan, i.level AS item_level, i.parent_id AS item_parent, i.is_user AS item_is_user
       FROM rab_jadwal j JOIN rab_item i ON i.id = j.rab_item_id
       WHERE i.rab_id = ? ORDER BY i.pos`
    ).all(rabId)
  })

  ipcMain.handle('rab:jadwalUpdate', (_e, id: number, data: Partial<Pick<{ durasi: number; jumlah_pekerja: number; tanggal_mulai: string; tanggal_selesai: string }, 'durasi' | 'jumlah_pekerja' | 'tanggal_mulai' | 'tanggal_selesai'>>) => {
    const fields = Object.keys(data)
    if (!fields.length) return appDb.prepare('SELECT * FROM rab_jadwal WHERE id = ?').get(id)
    const set = fields.map((f) => `${f} = ?`).join(', ')
    const values = fields.map((f) => (data as Record<string, unknown>)[f]) as SQLInputValue[]
    appDb.prepare(`UPDATE rab_jadwal SET ${set} WHERE id = ?`).run(...values, id)
    return appDb.prepare('SELECT * FROM rab_jadwal WHERE id = ?').get(id)
  })

  ipcMain.handle('rab:dependensi', (_e, jadwalId: number) =>
    appDb.prepare('SELECT * FROM rab_dependensi WHERE jadwal_id = ? ORDER BY pos').all(jadwalId)
  )

  ipcMain.handle('rab:addDependensi', (_e, jadwalId: number, predJadwalId: number) => {
    if (jadwalId === predJadwalId) return { ok: false }
    const dup = appDb.prepare('SELECT id FROM rab_dependensi WHERE jadwal_id = ? AND pred_jadwal_id = ?').get(jadwalId, predJadwalId)
    if (dup) return { ok: false }
    const pos = Number((appDb.prepare('SELECT MAX(pos) AS m FROM rab_dependensi WHERE jadwal_id = ?').get(jadwalId) as { m: number | null }).m ?? -1) + 1
    const res = appDb.prepare('INSERT INTO rab_dependensi (jadwal_id, pred_jadwal_id, pos) VALUES (?, ?, ?)').run(jadwalId, predJadwalId, pos)
    return appDb.prepare('SELECT * FROM rab_dependensi WHERE id = ?').get(Number(res.lastInsertRowid))
  })

  ipcMain.handle('rab:removeDependensi', (_e, id: number) => {
    appDb.prepare('DELETE FROM rab_dependensi WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('rab:hitung', (_e, rabId: number) => {
    const items = appDb.prepare('SELECT * FROM rab_item WHERE rab_id = ? ORDER BY pos').all(rabId) as Record<string, unknown>[]
    const allKomp = appDb.prepare(
      'SELECT k.*, i.volume AS vol, i.kode AS item_kode, i.uraian AS item_uraian, i.level AS item_level, i.parent_id AS item_parent FROM rab_item_komponen k JOIN rab_item i ON i.id = k.rab_item_id WHERE i.rab_id = ? ORDER BY k.rab_item_id, k.pos'
    ).all(rabId) as Record<string, unknown>[]
    const byItem = new Map<number, Record<string, unknown>[]>()
    for (const k of allKomp) {
      const arr = byItem.get(Number(k.rab_item_id)) ?? []
      arr.push(k)
      byItem.set(Number(k.rab_item_id), arr)
    }
    const groupLetter = (j: unknown) => {
      const s = String(j ?? '').toLowerCase()
      if (s.includes('tenaga kerja')) return 'A'
      if (s.includes('bahan')) return 'B'
      if (s.includes('peralatan')) return 'C'
      return null
    }
    return items.map((it) => {
      const komponen: { jenis: unknown; harga_satuan: number | null; harga_jumlah: number | null; kode: unknown; uraian: unknown; satuan: unknown; koefisien: number | null }[] = (byItem.get(Number(it.id)) ?? []).map((k) => {
        const hargaSatuan = k.harga_satuan != null ? Number(k.harga_satuan) : null
        const hargaJumlah = hargaSatuan != null && k.koefisien != null ? Number(k.koefisien) * hargaSatuan : null
        return { ...k, harga_satuan: hargaSatuan, harga_jumlah: hargaJumlah } as never as { jenis: unknown; harga_satuan: number | null; harga_jumlah: number | null; kode: unknown; uraian: unknown; satuan: unknown; koefisien: number | null }
      })
      const sums = { A: 0, B: 0, C: 0 }
      for (const k of komponen) {
        const huruf = groupLetter(k.jenis)
        const hj = k.harga_jumlah
        if (huruf && hj != null) sums[huruf] += hj
      }
      const D = sums.A + sums.B + sums.C
      const volume = Number(it.volume ?? 0)
      const overheadPct = 0.1
      const E = D * overheadPct
      const F = D + E
      return {
        item: { id: it.id, kode: it.kode, uraian: it.uraian, satuan: it.satuan, volume, level: it.level, is_user: it.is_user },
        komponen,
        subtotal: { A: sums.A, B: sums.B, C: sums.C, D, E, F },
        overhead_pct: overheadPct,
        total: F * volume
      }
    })
  })

  // BOM: agregasi komponen seluruh RAB — qty = Σ(koefisien × volume) per (jenis,uraian,kode,satuan)
  ipcMain.handle('rab:bom', (_e, rabId: number) => {
    const rows = appDb.prepare(
      `SELECT k.jenis, k.uraian, k.kode, k.satuan, k.koefisien, k.harga_satuan, i.volume
       FROM rab_item_komponen k JOIN rab_item i ON i.id = k.rab_item_id
       WHERE i.rab_id = ? ORDER BY k.pos`
    ).all(rabId) as Record<string, unknown>[]
    const agg = new Map<string, { jenis: string | null; uraian: string | null; kode: string | null; satuan: string | null; qty: number; harga_satuan: number | null }>()
    const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()
    for (const r of rows) {
      const jenis = r.jenis as string | null
      const uraian = r.uraian as string | null
      const kode = r.kode as string | null
      const satuan = r.satuan as string | null
      // key dinormalisasi: jenis → bentuk baku (normJenis), uraian/satuan case-insensitive — varian casing jadi satu baris
      const nj = normJenis(jenis) ?? norm(jenis)
      const key = `${nj}|${norm(uraian)}|${norm(kode)}|${norm(satuan)}`
      const qty = (Number(r.koefisien) || 0) * (Number(r.volume) || 0)
      const cur = agg.get(key)
      if (cur) {
        cur.qty += qty
        if (cur.harga_satuan == null && r.harga_satuan != null) cur.harga_satuan = r.harga_satuan as number | null
      } else agg.set(key, { jenis, uraian, kode, satuan, qty, harga_satuan: r.harga_satuan as number | null })
    }
    const items = [...agg.values()].sort((a, b) => {
      const oa = normJenis(a.jenis) === 'tenaga_kerja' ? 0 : normJenis(a.jenis) === 'bahan' ? 1 : 2
      const ob = normJenis(b.jenis) === 'tenaga_kerja' ? 0 : normJenis(b.jenis) === 'bahan' ? 1 : 2
      if (oa !== ob) return oa - ob
      return String(a.uraian ?? '').localeCompare(String(b.uraian ?? ''))
    })
    const group = (j: string | null) => {
      const n = normJenis(j)
      return n === 'tenaga_kerja' ? 'A. Tenaga Kerja' : n === 'bahan' ? 'B. Bahan' : n === 'alat' ? 'C. Peralatan' : 'Lainnya'
    }
    return items.map((i) => ({ ...i, group: group(i.jenis), total: i.harga_satuan != null ? i.qty * i.harga_satuan : null }))
  })

  // Set harga satuan komponen di BOM → update harga_katalog + snapshot rab_item_komponen seluruh RAB
  ipcMain.handle('rab:setHargaKomponen', (_e, rabId: number, jenis: string | null, uraian: string | null, harga: number | null) => {
    const nj = normJenis(jenis)
    const v = typeof harga === 'number' && !Number.isNaN(harga) ? harga : null
    appDb.exec('BEGIN;')
    if (nj && uraian) {
      appDb.prepare(
        `INSERT INTO harga_katalog (jenis, uraian, harga, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(jenis, uraian) DO UPDATE SET harga = excluded.harga, updated_at = excluded.updated_at`
      ).run(nj, uraian, v, now())
    }
    const upd = appDb.prepare(
      `UPDATE rab_item_komponen SET harga_satuan = ?
       WHERE rab_item_id IN (SELECT id FROM rab_item WHERE rab_id = ?) AND jenis = ? AND uraian = ?`
    )
    upd.run(v, rabId, jenis, uraian)
    appDb.exec('COMMIT;')
    return { ok: true }
  })

  // Export report → PDF: load HTML di window tersembunyi, printToPDF A4, save dialog
  ipcMain.handle('report:pdf', async (_e, html: string, defaultName: string) => {
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
    try {
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      const data = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0, bottom: 0, left: 0, right: 0 } })
      const res = await dialog.showSaveDialog(win, {
        title: 'Simpan PDF Report',
        defaultPath: join(app.getPath('documents'), (defaultName || 'report') + '.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      })
      if (res.canceled || !res.filePath) return { ok: false, canceled: true }
      await writeFile(res.filePath, data)
      return { ok: true, path: res.filePath }
    } catch (err) {
      return { ok: false, error: String(err) }
    } finally {
      if (!win.isDestroyed()) win.destroy()
    }
  })

  return { appDb, refDb }
}
