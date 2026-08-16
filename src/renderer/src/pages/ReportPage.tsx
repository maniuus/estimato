import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { BomRow, HitungResult, JadwalRow, ProfilTulangan, Projek, ProjekSetting, RabItem, RabProfil, VolumeRow } from '../../../shared/types'
import { fmtFixed as fmt, fmtRpFixed as fmtRp, terbilang } from '../lib/format'

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

const EMPTY: ProjekSetting = {
  projek_id: 0,
  nama_perusahaan: '',
  alamat: '',
  telepon: '',
  logo: '',
  penanggung_jawab: '',
  jabatan_pj: '',
  disiapkan_nama: '',
  disiapkan_jabatan: '',
  diperiksa_nama: '',
  diperiksa_jabatan: '',
  disetujui_nama: '',
  disetujui_jabatan: '',
  catatan: ''
}

const MM = 96 / 25.4
const PAGE_W = Math.round(210 * MM)
const PAGE_H = Math.round(297 * MM)
const M_TOP = Math.round(18 * MM)
const M_BOT = Math.round(20 * MM)
const M_SIDE = Math.round(16 * MM)
const CONTENT_W = PAGE_W - M_SIDE * 2
const CONTENT_H = PAGE_H - M_TOP - M_BOT

const REPORT_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; color: #1b1b18; margin: 0; font-size: 10.5pt; line-height: 1.45; }
.rep { max-width: 794px; margin: 0 auto; }
.page { width: ${PAGE_W}px; height: ${PAGE_H}px; position: relative; background: #fff; box-shadow: 0 2px 12px rgba(27,27,24,.18); margin: 0 auto 24px; page-break-after: always; padding: ${M_TOP}px ${M_SIDE}px ${M_BOT}px; }
.page-inner { height: 100%; overflow: hidden; }
.page-foot { position: absolute; bottom: 26px; left: 0; right: 0; text-align: center; font-size: 9pt; color: #555; }
@media print { body { margin: 0; } .page { margin: 0; box-shadow: none; } .page:last-child { page-break-after: auto; } }
.rep-head { display: flex; gap: 14px; align-items: center; margin-bottom: 10px; }
.rep-head img { width: 84px; height: 84px; object-fit: contain; }
.rep-company { font-size: 15pt; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; }
.rep-addr { font-size: 9pt; color: #444; margin-top: 2px; white-space: pre-line; }
.rep-hr { border: 0; border-top: 2px solid #1b1b18; margin: 8px 0 4px; }
.rep-hr2 { border: 0; border-top: 1px solid #1b1b18; margin: 4px 0 10px; }
.rep-title { text-align: center; font-size: 13pt; font-weight: 700; text-transform: uppercase; line-height: 1.4; margin: 10px 0 2px; }
.rep-sub { text-align: center; font-size: 11pt; font-weight: 700; margin-bottom: 8px; }
.rep-info { border-collapse: collapse; margin: 0 auto 12px; font-size: 10pt; }
.rep-info td { padding: 1px 6px 1px 0; vertical-align: top; }
.rep-info td:first-child { font-weight: 600; white-space: nowrap; }
.rep-info td:nth-child(2) { white-space: pre-line; }
.rep h3 { font-size: 12pt; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #1b1b18; padding-bottom: 2px; margin: 12px 0 6px; }
.rep-tbl { border-collapse: collapse; width: 100%; font-size: 9pt; line-height: 1.3; }
.rep-tbl th, .rep-tbl td { border: 1px solid #555; padding: 2px 5px; }
.rep-tbl th { background: #e9e6df; font-weight: 700; text-align: left; font-size: 8.5pt; text-transform: uppercase; }
.rep-tbl td.num, .rep-tbl th.num { text-align: right; white-space: nowrap; }
.rep-tbl tr.tot td { font-weight: 700; background: #f4f2ed; }
.rep-div { font-weight: 700; text-transform: uppercase; margin: 10px 0 3px; font-size: 11pt; }
.rep-item-hd { font-weight: 700; margin: 7px 0 2px; font-size: 10pt; }
.rep-item-vol { font-size: 8.5pt; color: #444; margin-bottom: 2px; }
.rep-item-tot { text-align: right; font-weight: 700; margin: 3px 0 8px; font-size: 9.5pt; }
.rep-grand { border: 2px solid #1b1b18; font-weight: 700; text-align: center; padding: 6px; margin: 14px 0; font-size: 11pt; }
.rep-terbilang { font-size: 9.5pt; color: #333; text-align: center; font-style: italic; margin-bottom: 10px; }
.rep-ttd { margin-top: 26px; }
.rep-ttd-place { font-size: 10pt; margin-bottom: 42px; }
.rep-ttd-cols { display: flex; justify-content: space-between; text-align: center; gap: 16px; }
.rep-ttd-col { width: 30%; }
.rep-ttd-col .jab { font-weight: 700; text-transform: uppercase; margin-bottom: 46px; }
.rep-ttd-col .nm { font-weight: 700; text-decoration: underline; margin-top: 2px; }
.rep-ttd-col .nip { font-size: 9pt; color: #444; }
.rep-catatan { font-size: 9.5pt; border-top: 1px solid #555; margin-top: 14px; padding-top: 6px; white-space: pre-line; }
.rep-break { page-break-before: always; }
.blk { margin: 0; }
.rep-meas { position: absolute; left: -9999px; top: 0; width: ${CONTENT_W}px; visibility: hidden; pointer-events: none; }
`

function gOf(j: string | null) {
  return /tenaga kerja/i.test(j ?? '') ? 'A' : /bahan/i.test(j ?? '') ? 'B' : /peralatan/i.test(j ?? '') ? 'C' : null
}

export default function ReportPage({
  projekId,
  projekNama,
  rabId,
  rabNama,
  onBack,
}: {
  projekId: number
  projekNama: string
  rabId: number
  rabNama: string
  onBack: () => void
}) {
  const [projek, setProjek] = useState<Projek | null>(null)
  const [form, setForm] = useState<ProjekSetting>(EMPTY)
  const [items, setItems] = useState<RabItem[]>([])
  const [hitung, setHitung] = useState<HitungResult[]>([])
  const [volumes, setVolumes] = useState<VolumeRow[]>([])
  const [bom, setBom] = useState<BomRow[]>([])
  const [profiles, setProfiles] = useState<RabProfil[]>([])
  const [ptul, setPtul] = useState<Record<number, ProfilTulangan[]>>({})
  const [jadwal, setJadwal] = useState<JadwalRow[]>([])
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; s: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const [pl, it, v, h, b, pr, jd] = await Promise.all([
      window.api.projek.list(),
      window.api.rab.items(rabId),
      window.api.rab.volumes(rabId),
      window.api.rab.hitung(rabId),
      window.api.rab.bom(rabId),
      window.api.rab.profiles(rabId),
      window.api.rab.jadwal(rabId)
    ])
    const p = pl.find((x) => x.id === projekId) ?? null
    setProjek(p)
    const s = await window.api.projek.setting(projekId)
    setForm({ ...EMPTY, ...(s ?? {}) })
    setItems(it)
    setHitung(h)
    setVolumes(v)
    setBom(b)
    setProfiles(pr)
    setJadwal(jd)
    const pt = await Promise.all(pr.map((x) => window.api.rab.profilTulangan(x.id)))
    const map: Record<number, ProfilTulangan[]> = {}
    pr.forEach((x, i) => { map[x.id] = pt[i] ?? [] })
    setPtul(map)
  }

  useEffect(() => {
    load()
  }, [rabId])

  const set = (k: keyof ProjekSetting, val: string) => setForm((prev) => ({ ...prev, [k]: val }))

  const saveSetting = async () => {
    const { projek_id: _pid, ...data } = form
    await window.api.projek.saveSetting(projekId, data)
    setMsg({ t: 'ok', s: 'Layout report disimpan untuk projek ini.' })
    setTimeout(() => setMsg(null), 2500)
  }

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => set('logo', String(reader.result ?? ''))
    reader.readAsDataURL(f)
  }

  const hByItem = useMemo(() => {
    const m = new Map<number, HitungResult>()
    for (const h of hitung) m.set(h.item.id, h)
    return m
  }, [hitung])

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

  const grandTotal = useMemo(() => grouped.reduce((s, g) => s + g.total, 0), [grouped])
  const volumeItem = useMemo(() => {
    const m = new Map<number, number>()
    for (const v of volumes) {
      const s = String(v.item_satuan ?? '').toLowerCase()
      const p = v.panjang ?? 0
      const l = v.lebar ?? 0
      const t = v.tinggi ?? 0
      const j = v.jumlah ?? 1
      const vol = s === 'm1' || s === "m'" ? p * j : s === 'm2' ? p * l * j : s === 'm3' ? p * l * t * j : j
      m.set(v.rab_item_id, (m.get(v.rab_item_id) ?? 0) + vol)
    }
    return m
  }, [volumes])

  type Block = { kind: 'html'; html: string } | { kind: 'table'; thead: string; rows: string[] }
  type Section = { title: string; blocks: Block[] }

  const rekapRows = useMemo(() => {
    const rows: string[] = grouped.map(
      (g, i) => `<tr><td class="num">${i + 1}</td><td>${g.div}${g.nama ? ' — ' + g.nama : ''}</td><td class="num">${fmtRp(g.total)}</td></tr>`
    )
    rows.push(`<tr class="tot"><td></td><td>Jumlah</td><td class="num">${fmtRp(grandTotal)}</td></tr>`)
    rows.push(`<tr><td colspan="3" style="font-style:italic;text-align:center;border-top:none">Terbilang: ${terbilang(grandTotal)}</td></tr>`)
    return rows
  }, [grouped, grandTotal])

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const analisaBlocks = (): Block[] => {
    const blocks: Block[] = [{ kind: 'html', html: '<h3>Analisa Harga Satuan</h3>' }]
    let groupNo = 0
    for (const g of grouped) {
      if (!g.list.length) continue
      groupNo += 1
      blocks.push({ kind: 'html', html: `<div class="rep-div">${groupNo}. ${g.div}${g.nama ? ' — ' + g.nama : ''}</div>` })
      for (const it of g.list) {
        const h = hByItem.get(it.id)
        if (!h) continue
        let last = null as string | null
        const rows = h.komponen.map((k, i) => {
          const gr = gOf(k.jenis)
          const header = gr !== last ? gr : null
          last = gr
          const group =
            header === 'A'
              ? `<tr><td colspan="4" style="font-weight:700">A. Tenaga Kerja</td><td class="num">${fmtRp(h.subtotal.A)}</td></tr>`
              : header === 'B'
                ? `<tr><td colspan="4" style="font-weight:700">B. Bahan</td><td class="num">${fmtRp(h.subtotal.B)}</td></tr>`
                : header === 'C'
                  ? `<tr><td colspan="4" style="font-weight:700">C. Peralatan</td><td class="num">${fmtRp(h.subtotal.C)}</td></tr>`
                  : ''
          return `${group}<tr><td class="num">${i + 1}</td><td>${k.uraian ?? ''}</td><td class="num">${k.satuan ?? ''}</td><td class="num">${k.koefisien ?? ''}</td><td class="num">${fmtRp(k.harga_jumlah)}</td></tr>`
        })
        const volTakeoff = (volumeItem.get(it.id) ?? 0) > 0 ? ` (take-off ${fmt(volumeItem.get(it.id))})` : ''
        blocks.push(
          { kind: 'html', html: `<div class="rep-item-hd">${h.item.kode} — ${h.item.uraian}</div>` },
          { kind: 'html', html: `<div class="rep-item-vol">Volume: ${fmt(h.item.volume)} ${h.item.satuan ?? ''}${volTakeoff}</div>` },
          {
            kind: 'table',
            thead: `<thead><tr><th class="num" style="width:5%">No</th><th>Komponen</th><th class="num" style="width:10%">Sat</th><th class="num" style="width:10%">Koef</th><th class="num" style="width:18%">Jumlah Harga</th></tr></thead>`,
            rows: [
              ...rows,
              `<tr><td colspan="4" style="font-weight:700">D. Jumlah Harga (A+B+C)</td><td class="num">${fmtRp(h.subtotal.D)}</td></tr>`,
              `<tr><td colspan="4" style="font-weight:700">E. Biaya Umum &amp; Keuntungan (${Math.round(h.overhead_pct * 100)}%)</td><td class="num">${fmtRp(h.subtotal.E)}</td></tr>`,
              `<tr><td colspan="4" style="font-weight:700">F. Harga Satuan Pekerjaan (D+E)</td><td class="num">${fmtRp(h.subtotal.F)}</td></tr>`
            ]
          }
        )
      }
    }
    return blocks
  }

  const rincianBlocks = (): Block[] => {
    const rows: string[] = []
    let no = 0
    for (const g of grouped) {
      if (!g.list.length) continue
      rows.push(`<tr class="tot"><td colspan="7">${g.div}${g.nama ? ' — ' + g.nama : ''}</td></tr>`)
      for (const it of g.list) {
        const h = hByItem.get(it.id)
        const volNote = h && h.item.satuan ? ` ${h.item.satuan}` : ''
        const volTakeoff = (volumeItem.get(it.id) ?? 0) > 0 ? ` (${fmt(volumeItem.get(it.id))})` : ''
        no += 1
        rows.push(`<tr><td class="num">${no}</td><td>${it.kode}</td><td>${it.uraian}</td><td class="num">${it.satuan ?? ''}</td><td class="num">${fmt(it.volume)}${volNote}</td><td class="num">${h ? fmtRp(h.subtotal.F) : ''}</td><td class="num">${h ? fmtRp(h.total) : ''}</td></tr>`)
      }
    }
    rows.push(`<tr class="tot"><td colspan="6">GRAND TOTAL</td><td class="num">${fmtRp(grandTotal)}</td></tr>`)
    return [
      { kind: 'html', html: '<h3>Rincian Pekerjaan & Item RAB</h3>' },
      {
        kind: 'table',
        thead: `<thead><tr><th class="num" style="width:4%">No</th><th style="width:12%">Kode</th><th>Uraian</th><th class="num" style="width:7%">Sat</th><th class="num" style="width:9%">Volume</th><th class="num" style="width:13%">Harga Satuan (F)</th><th class="num" style="width:16%">Total (F×Vol)</th></tr></thead>`,
        rows
      }
    ]
  }

  const bomBlocks = (): Block[] => {
    const blocks: Block[] = [{ kind: 'html', html: '<h3>Bill of Material</h3>' }]
    for (const g of ['A. Tenaga Kerja', 'B. Bahan', 'C. Peralatan', 'Lainnya']) {
      const gRows = bom.filter((r) => r.group === g)
      const rows = gRows.map(
        (r) => `<tr><td class="num">${JENIS_LABEL[r.jenis ?? ''] ?? r.jenis ?? ''}</td><td>${r.uraian ?? ''}</td><td class="num">${r.kode ?? ''}</td><td class="num">${r.satuan ?? ''}</td><td class="num">${fmt(r.qty)}</td><td class="num">${fmtRp(r.harga_satuan ?? 0)}</td><td class="num">${fmtRp(r.total ?? 0)}</td></tr>`
      )
      if (rows.length) {
        const subTotal = gRows.reduce((s, r) => s + (r.total ?? 0), 0)
        rows.push(`<tr class="tot"><td colspan="6">Subtotal ${g}</td><td class="num">${fmtRp(subTotal)}</td></tr>`)
        blocks.push({ kind: 'html', html: `<div class="rep-item-hd">${g}</div>` })
        blocks.push({
          kind: 'table',
          thead: `<thead><tr><th class="num" style="width:12%">Jenis</th><th>Komponen</th><th class="num" style="width:10%">Kode</th><th class="num" style="width:8%">Sat</th><th class="num" style="width:12%">Qty</th><th class="num" style="width:15%">Harga</th><th class="num" style="width:15%">Total</th></tr></thead>`,
          rows
        })
      }
    }
    const perItem = materialItemBlocks()
    if (perItem.length) {
      blocks.push({ kind: 'html', html: '<h3>Kebutuhan Material per Item</h3>' })
      blocks.push(...perItem)
    }
    return blocks
  }

  const materialItemBlocks = (): Block[] => {
    const blocks: Block[] = []
    for (const it of items) {
      const h = hByItem.get(it.id)
      if (!h) continue
      const bahan = h.komponen.filter((k) => gOf(k.jenis) === 'B')
      blocks.push({ kind: 'html', html: `<div class="rep-item-hd">${it.kode} — ${it.uraian}</div>` })
      if (bahan.length) {
        blocks.push({
          kind: 'table',
          thead: `<thead><tr><th class="num" style="width:5%">No</th><th>Bahan</th><th class="num" style="width:10%">Sat</th><th class="num" style="width:12%">Koef</th><th class="num" style="width:18%">Kebutuhan (Koef×Vol)</th></tr></thead>`,
          rows: bahan.map((k, i) => {
            const vol = it.volume
            const need = (k.koefisien ?? 0) * vol
            return `<tr><td class="num">${i + 1}</td><td>${k.uraian ?? ''}</td><td class="num">${k.satuan ?? ''}</td><td class="num">${k.koefisien ?? ''}</td><td class="num">${fmt(need)}</td></tr>`
          })
        })
      }
      const besiRows = besiBlocks(it)
      if (besiRows) blocks.push(...besiRows)
    }
    return blocks
  }

  const volumeBlocks = (): Block[] => {
    const rows = volumes.map((v) => {
      const it = itemById.get(v.rab_item_id)
      const s = String(it?.satuan ?? '').toLowerCase()
      const p = v.panjang ?? 0
      const l = v.lebar ?? 0
      const t = v.tinggi ?? 0
      const j = v.jumlah ?? 1
      const vol = s === 'm1' || s === "m'" ? p * j : s === 'm2' ? p * l * j : s === 'm3' ? p * l * t * j : j
      return `<tr><td>${it?.kode ?? ''}</td><td>${it?.uraian ?? ''}</td><td>${v.uraian ?? ''}</td><td class="num">${p ? fmt(p) : ''}</td><td class="num">${l ? fmt(l) : ''}</td><td class="num">${t ? fmt(t) : ''}</td><td class="num">${j}</td><td class="num">${fmt(vol)}</td></tr>`
    })
    return [
      { kind: 'html', html: '<h3>Backup Volume</h3>' },
      {
        kind: 'table',
        thead: `<thead><tr><th>Kode</th><th>Item Pekerjaan</th><th>Uraian Take-off</th><th class="num">Panjang</th><th class="num">Lebar</th><th class="num">Tinggi</th><th class="num">Jml</th><th class="num">Volume</th></tr></thead>`,
        rows
      }
    ]
  }

  const besiBlocks = (it: RabItem): Block[] => {
    const used = profiles.filter((p) => it.uraian && p.uraian && it.uraian.toLowerCase().includes(String(p.uraian).toLowerCase()))
    if (!used.length) return []
    const blocks: Block[] = []
    for (const p of used) {
      const rows = ptul[p.id] ?? []
      const dims = [p.lebar, p.tinggi].filter((x) => x != null).join('×')
      const sub = `${p.uraian ?? ''}${dims ? ` (${dims} mm)` : ''}${p.jumlah ? ` · n=${p.jumlah}` : ''}`
      if (!rows.length) continue
      blocks.push({ kind: 'html', html: `<div class="rep-item-vol">Kebutuhan Besi — ${sub}</div>` })
      blocks.push({
        kind: 'table',
        thead: `<thead><tr><th class="num" style="width:5%">No</th><th>Posisi</th><th>Jenis</th><th class="num" style="width:8%">D (mm)</th><th class="num" style="width:8%">Jumlah</th><th class="num" style="width:12%">Panjang</th></tr></thead>`,
        rows: rows.map(
          (r, i) => `<tr><td class="num">${i + 1}</td><td>${r.posisi ?? ''}</td><td>${JENIS_LABEL[r.jenis ?? ''] ?? r.jenis ?? ''}</td><td class="num">${r.diameter ?? ''}</td><td class="num">${r.jumlah ?? ''}</td><td class="num">${r.panjang ?? ''} m</td></tr>`
        )
      })
    }
    return blocks
  }

  const renderTtd = () => {
    const cols: { jab: string; nm: string; nip?: string }[] = []
    if (form.disiapkan_jabatan || form.disiapkan_nama) cols.push({ jab: form.disiapkan_jabatan ?? 'Disiapkan oleh', nm: form.disiapkan_nama ?? '' })
    if (form.diperiksa_jabatan || form.diperiksa_nama) cols.push({ jab: form.diperiksa_jabatan ?? 'Diperiksa oleh', nm: form.diperiksa_nama ?? '' })
    if (form.disetujui_jabatan || form.disetujui_nama) cols.push({ jab: form.disetujui_jabatan ?? 'Disetujui oleh', nm: form.disetujui_nama ?? '' })
    const city = form.alamat?.split('\n')[0]?.split(',')[0] ?? ''
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    return `<div class="rep-ttd">
      <div class="rep-ttd-place">${city ? city + ', ' : ''}${today}</div>
      <div class="rep-ttd-cols">
        ${cols
          .map(
            (c) => `<div class="rep-ttd-col"><div class="jab">${c.jab}</div><div class="nm">${c.nm}</div></div>`
          )
          .join('')}
      </div>
    </div>`
  }

  const sections = useMemo<Section[]>(() => {
    if (!items.length) return []
    const p = projek
    const header = `<div class="rep-head">
        ${form.logo ? `<img src="${form.logo}" alt="logo" />` : ''}
        <div>
          <div class="rep-company">${form.nama_perusahaan || 'PERUSAHAAN'}</div>
          ${(form.alamat || form.telepon) ? `<div class="rep-addr">${[form.alamat, form.telepon].filter(Boolean).join('\n')}</div>` : ''}
        </div>
      </div>
      <hr class="rep-hr" />
      <hr class="rep-hr2" />
      <div class="rep-title">Rencana Anggaran Biaya<br />(RAB)</div>
      <div class="rep-sub">${rabNama}</div>
      <table class="rep-info">
        <tr><td>Nama Projek</td><td>: ${p?.nama ?? projekNama}</td></tr>
        <tr><td>Klien</td><td>: ${p?.klien ?? ''}</td></tr>
        <tr><td>Lokasi</td><td>: ${p?.lokasi ?? ''}</td></tr>
        ${form.penanggung_jawab ? `<tr><td>Penanggung Jawab</td><td>: ${form.penanggung_jawab}${form.jabatan_pj ? ` — ${form.jabatan_pj}` : ''}</td></tr>` : ''}
      </table>`
    const grandHtml = `<div class="rep-grand">GRAND TOTAL RENCANA ANGGARAN BIAYA<br />${fmtRp(grandTotal)}</div><div class="rep-terbilang">(${terbilang(grandTotal)})</div>`
    const catatanHtml = form.catatan ? `<div class="rep-catatan">Catatan:\n${form.catatan}</div>` : ''
    const sec: Section[] = [
      {
        title: 'Rekapitulasi',
        blocks: [
          { kind: 'html', html: header },
          { kind: 'html', html: '<h3>Rekapitulasi</h3>' },
          {
            kind: 'table',
            thead: `<thead><tr><th class="num" style="width:6%">No</th><th>Uraian Pekerjaan</th><th class="num" style="width:24%">Jumlah Harga (Rp)</th></tr></thead>`,
            rows: rekapRows
          },
          { kind: 'html', html: grandHtml },
          ...(catatanHtml ? [{ kind: 'html' as const, html: catatanHtml }] : [])
        ]
      },
      { title: 'RAB & Item Pekerjaan', blocks: rincianBlocks() },
      { title: 'Analisa Harga Satuan', blocks: analisaBlocks() },
      { title: 'Bill of Material', blocks: bomBlocks() },
      { title: 'Backup Volume', blocks: volumeBlocks() },
      { title: 'Tanda Tangan', blocks: [{ kind: 'html', html: renderTtd() }] }
    ]
    return sec
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projek, form, grouped, grandTotal, items, hitung, profiles, ptul, volumes, rekapRows])

  const buildHtml = (body: string) =>
    `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8" /><title>RAB ${rabNama}</title><style>${REPORT_CSS}</style></head><body>${body}</body></html>`

  const measRef = useRef<HTMLDivElement>(null)
  const [pageHtml, setPageHtml] = useState('')

  const measHtml = useMemo(
    () =>
      sections
        .flatMap((s) => s.blocks)
        .map((b) => (b.kind === 'html' ? `<div class="blk">${b.html}</div>` : `<table class="rep-tbl">${b.thead}<tbody>${b.rows.join('')}</tbody></table>`))
        .join(''),
    [sections]
  )

  useEffect(() => {
    const cont = measRef.current
    if (!cont) {
      setPageHtml('')
      return
    }
    let canc = false
    const measure = () => {
      if (canc) return
      const blks = Array.from(cont.children) as HTMLElement[]
      const pages: string[] = []
      let cur: string[] = []
      let used = 0
      let bi = 0
      const flush = () => {
        if (cur.length) {
          pages.push(cur.join(''))
          cur = []
          used = 0
        }
      }
      for (const s of sections) {
        if (used > 0) flush()
        for (const b of s.blocks) {
          const el = blks[bi++]
          if (b.kind === 'html') {
            const h = el.offsetHeight
            if (used > 0 && used + h > CONTENT_H) flush()
            cur.push(b.html)
            used += h
          } else {
            const tbl = el as HTMLTableElement
            const theadH = tbl.tHead?.offsetHeight ?? 0
            const rowEls = Array.from(tbl.tBodies[0]?.rows ?? [])
            let open = false
            const openT = () => {
              cur.push(`<table class="rep-tbl">${b.thead}<tbody>`)
              used += theadH
              open = true
            }
            const closeT = () => {
              cur.push('</tbody></table>')
              open = false
            }
            b.rows.forEach((row, i) => {
              const rh = rowEls[i]?.offsetHeight ?? 20
              if (open && used + rh > CONTENT_H) {
                closeT()
                flush()
                open = false
              }
              if (!open) openT()
              cur.push(row)
              used += rh
            })
            if (open) closeT()
          }
        }
      }
      flush()
      const n = pages.length
      setPageHtml(
        pages
          .map((p, i) => `<div class="page"><div class="page-inner">${p}</div><div class="page-foot">Halaman ${i + 1} dari ${n}</div></div>`)
          .join('')
      )
    }
    measure()
    const imgs = Array.from(cont.querySelectorAll('img'))
    const pending = imgs.filter((im) => !im.complete)
    if (pending.length) {
      Promise.all(
        pending.map((im) => new Promise<void>((res) => {
          im.addEventListener('load', () => res(), { once: true })
          im.addEventListener('error', () => res(), { once: true })
        }))
      ).then(measure)
    }
    return () => {
      canc = true
    }
  }, [measHtml])

  const exportPdf = async () => {
    if (!items.length) {
      setMsg({ t: 'err', s: 'Belum ada item pekerjaan untuk di-export.' })
      return
    }
    setBusy(true)
    try {
      const res = await window.api.report.pdf(buildHtml(pageHtml), `RAB ${rabNama}`)
      if (res.ok) setMsg({ t: 'ok', s: `PDF tersimpan: ${res.path}` })
      else if (res.canceled) setMsg({ t: 'ok', s: 'Export PDF dibatalkan.' })
      else setMsg({ t: 'err', s: 'Gagal export PDF: ' + (res.error ?? '') })
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const exportXlsx = async () => {
    if (!items.length) {
      setMsg({ t: 'err', s: 'Belum ada item pekerjaan untuk di-export.' })
      return
    }
    const wb = XLSX.utils.book_new()

    const rekapAoa: unknown[][] = [['REKAPITULASI', 'RAB', rabNama], ['No', 'Uraian Pekerjaan', 'Jumlah Harga (Rp)']]
    grouped.forEach((g, i) => rekapAoa.push([i + 1, `${g.div}${g.nama ? ' — ' + g.nama : ''}`, Math.round(g.total)]))
    rekapAoa.push(['', 'Jumlah', Math.round(grandTotal)])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rekapAoa), 'Rekapitulasi')

    const rincianAoa: unknown[][] = [['Kode', 'Uraian', 'Satuan', 'Volume', 'Harga Satuan (F)', 'Total (F×Vol)']]
    const sorted = [...items].sort((a, b) => cmpKode(a.kode, b.kode))
    for (const it of sorted) {
      const h = hByItem.get(it.id)
      rincianAoa.push([it.kode, it.uraian, it.satuan ?? '', it.volume, h ? Math.round(h.subtotal.F) : '', h ? Math.round(h.total) : 0])
    }
    rincianAoa.push(['', 'GRAND TOTAL', '', '', '', Math.round(grandTotal)])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rincianAoa), 'Rincian RAB')

    const analisaAoa: unknown[][] = [['Kode', 'Item Pekerjaan', 'No', 'Jenis', 'Komponen', 'Satuan', 'Koefisien', 'Harga Satuan', 'Harga Jumlah']]
    for (const it of sorted) {
      const h = hByItem.get(it.id)
      if (!h) continue
      h.komponen.forEach((k, i) =>
        analisaAoa.push([it.kode, it.uraian, i + 1, JENIS_LABEL[k.jenis ?? ''] ?? k.jenis ?? '', k.uraian ?? '', k.satuan ?? '', k.koefisien ?? '', k.harga_satuan ?? '', k.harga_jumlah ?? ''])
      )
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(analisaAoa), 'Analisa')

    const volAoa: unknown[][] = [['Kode', 'Item Pekerjaan', 'Satuan', 'Volume Item', 'Uraian Take-off', 'Panjang', 'Lebar', 'Tinggi', 'Jumlah', 'Volume']]
    const itemById = new Map(items.map((i) => [i.id, i]))
    for (const v of volumes) {
      const it = itemById.get(v.rab_item_id)
      const s = String(it?.satuan ?? '').toLowerCase()
      const p = v.panjang ?? 0
      const l = v.lebar ?? 0
      const t = v.tinggi ?? 0
      const j = v.jumlah ?? 1
      const vol = s === 'm1' || s === "m'" ? p * j : s === 'm2' ? p * l * j : s === 'm3' ? p * l * t * j : j
      volAoa.push([it?.kode ?? '', it?.uraian ?? '', it?.satuan ?? '', it?.volume ?? '', v.uraian ?? '', v.panjang ?? '', v.lebar ?? '', v.tinggi ?? '', v.jumlah ?? '', vol])
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(volAoa), 'Volume')

    const bomAoa: unknown[][] = [['Grup', 'Jenis', 'Komponen', 'Kode', 'Satuan', 'Qty', 'Harga Satuan', 'Total']]
    for (const r of bom) bomAoa.push([r.group, JENIS_LABEL[r.jenis ?? ''] ?? r.jenis ?? '', r.uraian ?? '', r.kode ?? '', r.satuan ?? '', r.qty, r.harga_satuan ?? '', r.total ?? ''])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bomAoa), 'BOM')

    const besiAoa: unknown[][] = [['Profil', 'Dimensi (mm)', 'n', 'Posisi', 'Jenis', 'D (mm)', 'Jumlah', 'Panjang (m)']]
    for (const p of profiles) {
      const dims = [p.lebar, p.tinggi].filter((x) => x != null).join('×')
      const rows = ptul[p.id] ?? []
      if (!rows.length) continue
      rows.forEach((r) => besiAoa.push([p.uraian ?? '', dims, p.jumlah ?? '', r.posisi ?? '', JENIS_LABEL[r.jenis ?? ''] ?? r.jenis ?? '', r.diameter ?? '', r.jumlah ?? '', r.panjang ?? '']))
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(besiAoa), 'Besi')

    const jadwalAoa: unknown[][] = [['Kode', 'Pekerjaan', 'Durasi (hari)', 'Jumlah Pekerja', 'Mulai', 'Selesai']]
    const jItem = new Map(items.map((i) => [i.id, i]))
    for (const j of jadwal) {
      const it = jItem.get(j.rab_item_id)
      jadwalAoa.push([it?.kode ?? '', it?.uraian ?? '', j.durasi ?? '', j.jumlah_pekerja ?? '', j.tanggal_mulai ?? '', j.tanggal_selesai ?? ''])
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(jadwalAoa), 'Jadwal')

    XLSX.writeFile(wb, `RAB ${rabNama}.xlsx`)
    setMsg({ t: 'ok', s: `XLSX "${rabNama}.xlsx" diunduh.` })
    setTimeout(() => setMsg(null), 4000)
  }

  const field = (label: string, k: keyof ProjekSetting, placeholder?: string, textarea?: boolean) => (
    <label className="fld">
      <span>{label}</span>
      {textarea ? (
        <textarea rows={3} value={form[k] ?? ''} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <input value={form[k] ?? ''} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} />
      )}
    </label>
  )

  return (
    <div>
      <div className="row">
        <button onClick={onBack}>‹ Kembali ke RAB</button>
        <div style={{ flex: 1 }} />
        <button onClick={exportPdf} disabled={busy}>
          {busy ? 'Menyimpan…' : '⬇ Export PDF'}
        </button>
        <button onClick={exportXlsx}>⬇ Export XLSX</button>
        <button onClick={saveSetting}>Simpan Layout</button>
      </div>
      <h2 className="mt">Report · {rabNama}</h2>
      {msg && <div className={'msg mt ' + msg.t}>{msg.s}</div>}
      <div className="rep-grid">
        <aside className="rep-side">
          <div className="side-title">Layout Report</div>
          {field('Nama Perusahaan', 'nama_perusahaan', 'PT Contoh Konstruksi')}
          {field('Alamat / Kota', 'alamat', 'Jl. Merdeka No. 1\nJakarta', true)}
          {field('Telepon', 'telepon', '021-5550000')}
          <label className="fld">
            <span>Logo</span>
            <div className="row" style={{ alignItems: 'center' }}>
              {form.logo ? <img src={form.logo} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', border: '1px solid var(--hairline)' }} /> : <span className="muted">Tanpa logo</span>}
              <button onClick={() => logoRef.current?.click()}>Ubah Logo</button>
              {form.logo && (
                <button onClick={() => set('logo', '')}>Hapus</button>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogo} />
          </label>
          <div className="side-title">Penanggung Jawab</div>
          {field('Nama', 'penanggung_jawab', 'Ir. Nama')}
          {field('Jabatan', 'jabatan_pj', 'Project Manager')}
          <div className="side-title">Tanda Tangan</div>
          {field('Disiapkan — Jabatan', 'disiapkan_jabatan', 'Site Engineer')}
          {field('Disiapkan — Nama', 'disiapkan_nama', 'Nama')}
          {field('Diperiksa — Jabatan', 'diperiksa_jabatan', 'Pengawas')}
          {field('Diperiksa — Nama', 'diperiksa_nama', 'Nama')}
          {field('Disetujui — Jabatan', 'disetujui_jabatan', 'Direktur')}
          {field('Disetujui — Nama', 'disetujui_nama', 'Nama')}
          {field('Catatan', 'catatan', 'Catatan report…', true)}
          <button className="mt" onClick={saveSetting}>Simpan Layout</button>
        </aside>
        <div className="rep-preview">
          <style>{REPORT_CSS}</style>
          <div className="rep-meas" ref={measRef} dangerouslySetInnerHTML={{ __html: measHtml }} />
          {pageHtml ? (
            <div className="rep-paper" dangerouslySetInnerHTML={{ __html: pageHtml }} />
          ) : (
            <div className="muted">Memuat preview…</div>
          )}
        </div>
      </div>
    </div>
  )
}