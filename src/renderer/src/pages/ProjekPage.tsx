import { useEffect, useState } from 'react'
import type { Projek } from '../../../shared/types'
import { fmt } from '../lib/format'

export default function ProjekPage({ onOpen }: { onOpen: (p: Projek) => void }) {
  const [list, setList] = useState<Projek[]>([])
  const [nama, setNama] = useState('')
  const [klien, setKlien] = useState('')
  const [lokasi, setLokasi] = useState('')
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; s: string } | null>(null)

  const load = async () => setList(await window.api.projek.list())

  useEffect(() => {
    load()
  }, [])

  const create = async () => {
    if (!nama.trim()) {
      setMsg({ t: 'err', s: 'Nama projek wajib diisi' })
      return
    }
    await window.api.projek.create(nama.trim(), klien.trim() || undefined, lokasi.trim() || undefined)
    setNama('')
    setKlien('')
    setLokasi('')
    setMsg({ t: 'ok', s: 'Projek dibuat.' })
    load()
  }

  const remove = async (p: Projek) => {
    if (!confirm(`Hapus projek "${p.nama}" beserta seluruh RAB-nya?`)) return
    await window.api.projek.remove(p.id)
    load()
  }

  return (
    <div>
      <h2>DAFTAR PROJEK</h2>
      <div className="row mt">
        <input placeholder="Nama projek" value={nama} onChange={(e) => setNama(e.target.value)} />
        <input placeholder="Klien" value={klien} onChange={(e) => setKlien(e.target.value)} />
        <input placeholder="Lokasi" value={lokasi} onChange={(e) => setLokasi(e.target.value)} />
        <button onClick={create}>+ Buat</button>
      </div>
      {msg && <div className={'msg mt ' + msg.t}>{msg.s}</div>}
      <table className="mt2">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Klien</th>
            <th>Lokasi</th>
            <th className="num">Dibuat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td>
                <button
                  style={{ background: 'transparent', color: 'var(--ink)', border: 'none', padding: 0 }}
                  onClick={() => onOpen(p)}
                >
                  {p.nama}
                </button>
              </td>
              <td>{p.klien ?? ''}</td>
              <td>{p.lokasi ?? ''}</td>
              <td className="num">{p.created_at?.slice(0, 10)}</td>
              <td>
                <button onClick={() => onOpen(p)}>Buka RAB</button>{' '}
                <button onClick={() => remove(p)}>Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <div className="empty">Belum ada projek. Buat dulu di atas.</div>}
      <div className="stat-grid mt2">
        <div className="stat">
          <div className="lbl">Total Projek</div>
          <div className="val">{fmt(list.length, 0)}</div>
        </div>
      </div>
    </div>
  )
}
