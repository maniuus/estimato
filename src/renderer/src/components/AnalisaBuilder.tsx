import { Fragment, useEffect, useMemo, useState } from 'react'
import type { AnalisaUser, KomponenResult } from '../../../shared/types'
import { fmt, fmtRp, fmtRpShort } from '../lib/format'

type Jenis = 'tenaga_kerja' | 'bahan' | 'alat'

const JENIS_LABEL: Record<Jenis, string> = {
  tenaga_kerja: 'Tenaga Kerja',
  bahan: 'Bahan',
  alat: 'Alat'
}

// reverse-engineer: koefisien = hasil hitungan dari kebutuhan & durasi dibagi volume pekerjaan
// bahan: koef = total kebutuhan / V
// upah : koef (OH) = (jumlah pekerja × durasi hari) / V
// alat : koef = (jumlah alat × durasi hari) / V
type DraftKomp = {
  key: number
  jenis: Jenis
  uraian: string
  kode: string | null
  satuan: string | null
  harga: number | null
  input1: string
  input2: string
}

const koefDraft = (k: DraftKomp, vol: number): number | null => {
  if (!vol || vol <= 0) return null
  if (k.jenis === 'bahan') {
    const q = parseFloat(k.input1)
    if (!isFinite(q) || q <= 0) return null
    return q / vol
  }
  const n = parseFloat(k.input1)
  const d = parseFloat(k.input2)
  if (!isFinite(n) || n <= 0 || !isFinite(d) || d <= 0) return null
  return (n * d) / vol
}

const emptyDraft = () => ({
  id: null as number | null,
  kode: '',
  uraian: '',
  satuan: '',
  parent: '',
  volume: '',
  komp: [] as DraftKomp[]
})

let seqKey = 1

// normalisasi judul: trim, rangkap spasi digabung, tiap kata dikapital
const normalizeTitle = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)(\p{L})/gu, (_m, sp: string, c: string) => sp + c.toUpperCase())

// kode otomatis: ${parent}.u{seq} bila ada induk, else U-{n}
const nextKode = (parent: string, list: AnalisaUser[]) => {
  if (parent) {
    const seq = list.reduce((mx, a) => {
      if (a.kode.startsWith(parent + '.u')) {
        const n = Number(a.kode.slice(parent.length + 2))
        if (isFinite(n)) return Math.max(mx, n)
      }
      return mx
    }, 0)
    return `${parent}.u${seq + 1}`
  }
  const n = list.reduce((mx, a) => {
    const m = /^U-(\d+)$/.exec(a.kode)
    return m ? Math.max(mx, Number(m[1])) : mx
  }, 0)
  return 'U-' + (n + 1)
}

type ParentItem = { kode: string; uraian: string; level: number; parent_kode: string | null; divisi_no: string | null; divisi_nama: string | null }

export default function AnalisaBuilder({ rabId, onAddedToRab }: { rabId: number; onAddedToRab?: () => void }) {
  const [list, setList] = useState<AnalisaUser[]>([])
  const [parents, setParents] = useState<ParentItem[]>([])
  const [draft, setDraft] = useState(emptyDraft)
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; s: string } | null>(null)
  const [selDivisi, setSelDivisi] = useState<string>('')

  const load = async () => {
    try {
      setList(await window.api.analisa.list())
    } catch (e) {
      setMsg({ t: 'err', s: 'Gagal memuat pustaka analisa: ' + String(e) })
    }
  }

  useEffect(() => {
    load()
    window.api.ref.parents().then(setParents).catch(() => setParents([]))
  }, [])

  const vol = parseFloat(draft.volume) || 0

  const preview = useMemo(() => {
    let A = 0
    let B = 0
    let C = 0
    const rows = draft.komp.map((k) => {
      const koef = koefDraft(k, vol)
      const hj = koef != null && k.harga != null ? koef * k.harga : null
      if (k.jenis === 'tenaga_kerja' && hj != null) A += hj
      else if (k.jenis === 'bahan' && hj != null) B += hj
      else if (k.jenis === 'alat' && hj != null) C += hj
      return { ...k, koef, hj }
    })
    const D = A + B + C
    const E = D * 0.1
    const F = D + E
    return { rows, A, B, C, D, E, F, total: F * vol }
  }, [draft, vol])

  const patch = (p: Partial<ReturnType<typeof emptyDraft>>) => setDraft((d) => ({ ...d, ...p }))

  const patchKomp = (key: number, p: Partial<DraftKomp>) =>
    setDraft((d) => ({ ...d, komp: d.komp.map((k) => (k.key === key ? { ...k, ...p } : k)) }))

  const addKomp = (jenis: Jenis) =>
    setDraft((d) => ({
      ...d,
      komp: [...d.komp, { key: seqKey++, jenis, uraian: '', kode: null, satuan: null, harga: null, input1: '', input2: '' }]
    }))

  const removeKomp = (key: number) => setDraft((d) => ({ ...d, komp: d.komp.filter((k) => k.key !== key) }))

  const buatBaru = () => {
    setDraft({ ...emptyDraft(), kode: nextKode('', list) })
    setSelDivisi('')
    setEditing(true)
    setMsg(null)
  }

  // pilih divisi → tampilkan sub-level grup; pilih induk → kode otomatis mengikuti
  const divisiList = useMemo(() => {
    const m = new Map<string, string>()
    parents.forEach((p) => {
      const key = p.divisi_no || ''
      if (key && !m.has(key)) m.set(key, p.divisi_nama || key)
    })
    return Array.from(m.entries()).sort((a, b) => Number(a[0]) - Number(b[0]))
  }, [parents])

  const setDivisi = (d: string) => {
    setSelDivisi(d)
    const kode = nextKode('', list)
    setDraft((s) => ({ ...s, parent: '', kode }))
  }

  const setParent = (parent: string) => {
    const kode = parent ? nextKode(parent, list) : nextKode('', list)
    setDraft((s) => ({ ...s, parent, kode }))
  }

  const divisiParents = useMemo(() => {
    if (!selDivisi) return []
    const items = parents.filter((p) => (p.divisi_no || '') === selDivisi)
    // urut natural per segmen numerik: 3.2 sebelum 3.10
    const num = (s: string) => (s.match(/\d+/g) || []).map(Number)
    return items
      .slice()
      .sort((a, b) => {
        const na = num(a.kode)
        const nb = num(b.kode)
        const len = Math.max(na.length, nb.length)
        for (let i = 0; i < len; i++) {
          const va = i < na.length ? na[i] : 0
          const vb = i < nb.length ? nb[i] : 0
          if (va !== vb) return va - vb
        }
        return a.kode.localeCompare(b.kode)
      })
  }, [parents, selDivisi])

  const buka = async (id: number) => {
    try {
      const res = await window.api.analisa.get(id)
      if (!res) return
      const parent = res.analisa.parent_kode ?? ''
      setSelDivisi(parent ? parent.charAt(0) : '')
      setDraft({
        id: res.analisa.id,
        kode: res.analisa.kode,
        uraian: res.analisa.uraian,
        satuan: res.analisa.satuan ?? '',
        parent,
        volume: res.analisa.vol_ref != null ? String(res.analisa.vol_ref) : '',
        komp: res.komponen.map((k) => ({
          key: seqKey++,
          jenis: (k.jenis === 'tenaga_kerja' || k.jenis === 'bahan' || k.jenis === 'alat' ? k.jenis : 'bahan') as Jenis,
          uraian: k.uraian ?? '',
          kode: k.kode,
          satuan: k.satuan,
          harga: k.harga_satuan,
          input1: k.ref_input1 != null ? String(k.ref_input1) : '',
          input2: k.ref_input2 != null ? String(k.ref_input2) : ''
        }))
      })
      setEditing(true)
      setMsg(null)
    } catch (e) {
      setMsg({ t: 'err', s: 'Gagal membuka analisa: ' + String(e) })
    }
  }

  const simpan = async () => {
    const uraian = normalizeTitle(draft.uraian)
    if (!uraian) return setMsg({ t: 'err', s: 'Uraian analisa wajib diisi.' })
    if (!draft.parent) return setMsg({ t: 'err', s: 'Pilih divisi + sub-level grup dulu (analisa wajib masuk hirarki).' })
    const volRef = vol > 0 ? vol : null
    const komponen = preview.rows
      .filter((r) => r.uraian.trim() && r.koef != null)
      .map((r) => ({
        jenis: r.jenis,
        uraian: r.uraian.trim(),
        kode: r.kode,
        satuan: r.satuan,
        koefisien: r.koef as number,
        harga_satuan: r.harga,
        ref_input1: r.input1 !== '' ? parseFloat(r.input1) || null : null,
        ref_input2: r.input2 !== '' ? parseFloat(r.input2) || null : null
      }))
    if (komponen.length === 0) return setMsg({ t: 'err', s: 'Tambahkan minimal satu komponen dengan koefisien valid (isi volume & kebutuhan/durasi).' })
    try {
      const kode = draft.id != null ? draft.kode : nextKode(draft.parent, list)
      await window.api.analisa.save({
        id: draft.id ?? undefined,
        kode,
        uraian,
        satuan: draft.satuan.trim() || null,
        parent_kode: draft.parent || null,
        vol_ref: volRef,
        komponen
      })
      setDraft((d) => ({ ...d, kode, uraian }))
      setMsg({ t: 'ok', s: 'Analisa disimpan ke pustaka.' })
      await load()
    } catch (e) {
      setMsg({ t: 'err', s: 'Gagal menyimpan: ' + String(e) })
    }
  }

  const hapus = async (id: number) => {
    if (!confirm('Hapus analisa ini dari pustaka?')) return
    try {
      await window.api.analisa.remove(id)
      setEditing(false)
      setDraft(emptyDraft())
      setMsg({ t: 'ok', s: 'Analisa dihapus.' })
      await load()
    } catch (e) {
      setMsg({ t: 'err', s: 'Gagal menghapus: ' + String(e) })
    }
  }

  const tambahKeRab = async (id: number) => {
    try {
      await window.api.analisa.addToRab(rabId, id)
      setMsg({ t: 'ok', s: 'Analisa ditambahkan ke RAB. Cek tab RAB.' })
      onAddedToRab?.()
    } catch (e) {
      setMsg({ t: 'err', s: 'Gagal menambahkan ke RAB: ' + String(e) })
    }
  }

  const groupRow = (label: string, v: number | null, cls?: string) => (
    <tr className={cls || ''}>
      <td colSpan={3}>{label}</td>
      <td className="num">{v != null ? fmtRp(v) : ''}</td>
    </tr>
  )

  return (
    <div className="builder">
      <div className="builder-main">
        <div className="card">
          <div className="row" style={{ alignItems: 'center', marginBottom: 10 }}>
            <div className="kicker" style={{ flex: 1 }}>
              PUSTAKA ANALISA USER — {list.length} item
            </div>
            <button className="mini" onClick={buatBaru}>+ Analisa Baru</button>
          </div>
          {list.length === 0 ? (
            <div className="empty">
              Belum ada analisa. Buat analisa baru untuk item pekerjaan yang belum ada di referensi (Cipta Karya).
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="th-c">Kode</th>
                  <th>Uraian</th>
                  <th className="th-c">Sat</th>
                  <th className="th-c">Komponen</th>
                  <th className="th-c">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td className="num" data-click onClick={() => buka(a.id)}>{a.kode}</td>
                    <td data-click onClick={() => buka(a.id)} style={{ whiteSpace: 'normal' }}>{a.uraian}</td>
                    <td className="num">{a.satuan ?? ''}</td>
                    <td className="num">{a.komponen_count ?? 0}</td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      <button className="mini" onClick={() => tambahKeRab(a.id)}>+ ke RAB</button>{' '}
                      <button className="mini" onClick={() => hapus(a.id)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="empty mt">
          Analisa Builder = laboratorium untuk menghitung harga item pekerjaan yang belum ada di referensi.
          Entry volume pekerjaan + kebutuhan material & upah/alat, koefisien dihitung otomatis, lalu simpan ke pustaka.
        </div>
      </div>

      <div className="builder-tools">
        <div className="tools-card anim" key="analisa-editor">
          <div className="row" style={{ alignItems: 'center' }}>
            <div className="kicker" style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)' }}>
              Analisa Builder — input
            </div>
            {editing && <button className="mini" onClick={() => { setEditing(false); setDraft(emptyDraft()) }}>Tutup</button>}
          </div>

          {!editing ? (
            <div className="empty mt">Klik item di pustaka untuk mengedit, atau buat analisa baru.</div>
          ) : (
            <div className="mt" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div className="kicker" style={{ fontSize: 10 }}>VOLUME PEKERJAAN (V) — acuan hitung koefisien</div>
                <input
                  style={{ width: '100%', padding: '8px 10px', fontSize: 14, fontWeight: 700 }}
                  placeholder="0"
                  value={draft.volume}
                  onChange={(e) => patch({ volume: e.target.value })}
                />
              </div>

              <div>
                <div className="kicker" style={{ fontSize: 10 }}>DIVISI</div>
                <select style={{ width: '100%' }} value={selDivisi} onChange={(e) => setDivisi(e.target.value)}>
                  <option value="">— tanpa induk (kode U-n) —</option>
                  {divisiList.map(([no, nama]) => (
                    <option key={no} value={no}>DIVISI {no} — {nama}</option>
                  ))}
                </select>
              </div>
              {selDivisi && (
                <div>
                  <div className="kicker" style={{ fontSize: 10 }}>SUB-LEVEL GRUP DI DIVISI {selDivisi}</div>
                  <select style={{ width: '100%' }} value={draft.parent} onChange={(e) => setParent(e.target.value)}>
                    <option value="">— pilih grup —</option>
                    {divisiParents.map((p) => (
                      <option key={p.kode} value={p.kode}>
                        {p.kode}{p.level === 2 ? '  — ' : '    · '}{p.uraian}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="kicker" style={{ fontSize: 10 }}>KODE (otomatis)</div>
                <input style={{ width: '100%', fontFamily: "'JetBrains Mono',monospace", color: 'var(--muted)', background: 'var(--paper2)' }} value={draft.kode} readOnly />
              </div>

              <div>
                <div className="kicker" style={{ fontSize: 10 }}>URAIAN ITEM PEKERJAAN</div>
                <input style={{ width: '100%' }} placeholder="mis. Pemasangan 1 m2 lantai keramik 40x40" value={draft.uraian} onChange={(e) => patch({ uraian: e.target.value })} />
              </div>
              <div>
                <div className="kicker" style={{ fontSize: 10 }}>SATUAN</div>
                <input style={{ width: 120 }} placeholder="mis. m2" value={draft.satuan} onChange={(e) => patch({ satuan: e.target.value })} />
              </div>

              <div className="row" style={{ alignItems: 'center', marginTop: 6 }}>
                <div className="kicker" style={{ flex: 1 }}>KOMPONEN</div>
                <button className="mini" onClick={() => addKomp('tenaga_kerja')}>+ Upah</button>
                <button className="mini" onClick={() => addKomp('bahan')}>+ Bahan</button>
                <button className="mini" onClick={() => addKomp('alat')}>+ Alat</button>
              </div>
              {draft.komp.length === 0 && <div className="empty">Belum ada komponen. Tambah upah / bahan / alat.</div>}
              {draft.komp.map((k) => (
                <KompRow
                  key={k.key}
                  komp={k}
                  vol={vol}
                  onChange={(p) => patchKomp(k.key, p)}
                  onRemove={() => removeKomp(k.key)}
                  onMsg={(s, t) => setMsg({ s, t: t ?? 'err' })}
                />
              ))}
              {draft.komp.length > 0 && (
                <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                  <div className="kicker" style={{ flex: 1 }}>TAMBAH KOMPONEN</div>
                  <button className="mini" onClick={() => addKomp('tenaga_kerja')}>+ Upah</button>
                  <button className="mini" onClick={() => addKomp('bahan')}>+ Bahan</button>
                  <button className="mini" onClick={() => addKomp('alat')}>+ Alat</button>
                </div>
              )}

              <div className="card mt2" style={{ padding: '10px 12px' }}>
                <div className="kicker">PREVIEW — harga per unit ({draft.satuan || '?'})</div>
                {preview.rows.length > 0 && (
                  <table className="mt">
                    <thead>
                      <tr><th>Komponen</th><th className="num">Koef</th><th className="num">Harga</th><th className="num">Jml Harga</th></tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((r) => (
                        <tr key={r.key}>
                          <td style={{ whiteSpace: 'normal' }}>
                            {JENIS_LABEL[r.jenis][0]}. {r.uraian || <em className="muted">(belum diisi)</em>}
                          </td>
                          <td className="num">{r.koef != null ? fmt(r.koef, 4) : '-'}</td>
                          <td className="num">{r.harga != null ? fmtRpShort(r.harga) : '-'}</td>
                          <td className="num">{r.hj != null ? fmtRpShort(r.hj) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <table className="mt">
                  <thead>
                    <tr><th>Grup</th><th>Subtotal</th><th className="num">Jumlah Harga</th></tr>
                  </thead>
                  <tbody>
                    {groupRow('A. Tenaga Kerja', preview.A)}
                    {groupRow('B. Bahan', preview.B)}
                    {groupRow('C. Peralatan', preview.C)}
                    {groupRow('D = A + B + C', preview.D)}
                    {groupRow('E = 10% × D', preview.E)}
                    <tr className="tot"><td colSpan={2}>F = D + E (Harga Satuan)</td><td className="num">{fmtRp(preview.F)}</td></tr>
                    <tr className="tot"><td colSpan={2}>Total = F × Volume</td><td className="num">{fmtRp(preview.total)}</td></tr>
                  </tbody>
                </table>
                {!vol && <div className="muted mt">Isi volume untuk menghitung koefisien komponen.</div>}
              </div>

              <div className="row" style={{ gap: 6, marginTop: 4 }}>
                <button style={{ flex: 1 }} onClick={simpan}>Simpan ke Pustaka</button>
                {draft.id != null && <button className="mini" onClick={() => tambahKeRab(draft.id as number)}>+ ke RAB</button>}
                {draft.id != null && <button className="mini" onClick={() => hapus(draft.id as number)}>Hapus</button>}
              </div>
            </div>
          )}
        </div>
        {msg && <div className={'msg ' + msg.t}>{msg.s}</div>}
      </div>
    </div>
  )
}

// ── satu baris komponen: pilih jenis, cari komponen di DB, atau buat baru ──
function KompRow({ komp, vol, onChange, onRemove, onMsg }: {
  komp: DraftKomp
  vol: number
  onChange: (p: Partial<DraftKomp>) => void
  onRemove: () => void
  onMsg: (s: string, t?: 'err' | 'ok') => void
}) {
  const [q, setQ] = useState(komp.uraian)
  const [results, setResults] = useState<KomponenResult[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [satuanBaru, setSatuanBaru] = useState('')
  const [hargaBaru, setHargaBaru] = useState('')

  useEffect(() => {
    setQ(komp.uraian)
  }, [komp.uraian])

  useEffect(() => {
    if (!open || !q.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const r = await window.api.komponen.search(q.trim(), komp.jenis, 20)
        setResults(r)
      } catch (e) {
        setResults([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, open, komp.jenis])

  const koef = koefDraft(komp, vol)
  const pick = (r: KomponenResult) => {
    onChange({ uraian: r.uraian, kode: r.kode, satuan: r.satuan, harga: r.harga_satuan })
    setOpen(false)
    setQ(r.uraian)
  }

  const buatKomponen = async () => {
    const uraian = q.trim()
    if (!uraian) return
    try {
      const r = await window.api.komponen.create({
        jenis: komp.jenis,
        uraian,
        satuan: satuanBaru.trim() || null,
        kode: null,
        harga: parseFloat(hargaBaru.replace('.', '').replace(',', '.')) || null
      })
      onChange({ uraian: r.uraian, kode: r.kode, satuan: r.satuan, harga: r.harga_satuan })
      setCreating(false)
      setOpen(false)
      onMsg('Komponen baru dibuat: ' + r.uraian, 'ok')
    } catch (e) {
      onMsg('Gagal membuat komponen: ' + String(e))
    }
  }

  return (
    <div className="card" style={{ padding: '10px 12px', position: 'relative' }}>
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        <select
          value={komp.jenis}
          onChange={(e) => onChange({ jenis: e.target.value as Jenis })}
          style={{ width: 130 }}
        >
          <option value="tenaga_kerja">Tenaga Kerja</option>
          <option value="bahan">Bahan</option>
          <option value="alat">Alat</option>
        </select>
        <input
          style={{ flex: 1 }}
          placeholder={'Cari ' + JENIS_LABEL[komp.jenis].toLowerCase() + '…'}
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="mini" onClick={onRemove}>×</button>
      </div>

      {open && (
        <div className="card mt2" style={{ padding: 8, maxHeight: 220, overflowY: 'auto' }}>
          {results.length > 0 && (
            <table>
              <thead>
                <tr><th>Komponen</th><th>Sat</th><th className="num">Harga</th></tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.src + ':' + r.id} onClick={() => pick(r)}>
                    <td data-click style={{ whiteSpace: 'normal' }}>{r.uraian}</td>
                    <td className="num">{r.satuan ?? ''}</td>
                    <td className="num">{r.harga_satuan != null ? fmtRpShort(r.harga_satuan) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {results.length === 0 && q.trim() && (
            <div className="mt" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!creating ? (
                <button onClick={() => setCreating(true)}>+ Buat Komponen &quot;{q.trim()}&quot;</button>
              ) : (
                <>
                  <input placeholder="Satuan (mis. m3, kg, OH)" value={satuanBaru} onChange={(e) => setSatuanBaru(e.target.value)} />
                  <input placeholder="Harga satuan (Rp)" value={hargaBaru} onChange={(e) => setHargaBaru(e.target.value)} />
                  <div className="row" style={{ gap: 6 }}>
                    <button style={{ flex: 1 }} onClick={buatKomponen}>Simpan Komponen</button>
                    <button className="mini" onClick={() => setCreating(false)}>Batal</button>
                  </div>
                </>
              )}
            </div>
          )}
          {!q.trim() && <div className="muted">Ketik untuk mencari di database (referensi + buatan user).</div>}
        </div>
      )}

      <div className="mt" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {komp.uraian && (
            <div className="muted" style={{ flex: 1, fontSize: 12 }}>
              {komp.uraian}
              {komp.kode ? ' · ' + komp.kode : ''}
              {komp.satuan ? ' · ' + komp.satuan : ''}
            </div>
          )}
        </div>
        {komp.jenis === 'bahan' ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              style={{ flex: 1 }}
              placeholder="Total kebutuhan untuk seluruh volume (mis. 12 m3 semen)"
              value={komp.input1}
              onChange={(e) => onChange({ input1: e.target.value })}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              style={{ flex: 1 }}
              placeholder={komp.jenis === 'tenaga_kerja' ? 'Jumlah pekerja' : 'Jumlah alat'}
              value={komp.input1}
              onChange={(e) => onChange({ input1: e.target.value })}
            />
            <input
              style={{ flex: 1 }}
              placeholder="Durasi (hari)"
              value={komp.input2}
              onChange={(e) => onChange({ input2: e.target.value })}
            />
          </div>
        )}
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <div className="kicker" style={{ fontSize: 10 }}>Harga Satuan</div>
          <input
            style={{ width: 130 }}
            value={komp.harga != null ? fmt(komp.harga) : ''}
            placeholder="Rp"
            onChange={(e) => {
              const v = parseFloat(e.target.value.replace(/[.]/g, '').replace(/,/g, '.'))
              onChange({ harga: isFinite(v) ? v : null })
            }}
          />
          <div className="kicker" style={{ fontSize: 10, marginLeft: 'auto' }}>
            {koef != null ? 'Koef = ' + fmt(koef, 4) : 'isi volume'}
          </div>
        </div>
      </div>
    </div>
  )
}