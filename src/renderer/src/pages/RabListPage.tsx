import { useEffect, useState } from 'react'
import type { Rab } from '../../../shared/types'
import { fmt } from '../lib/format'

export default function RabListPage({
  projekId,
  projekNama,
  onOpen,
  onBack,
}: {
  projekId: number
  projekNama: string
  onOpen: (r: Rab) => void
  onBack: () => void
}) {
  const [list, setList] = useState<Rab[]>([])
  const [nama, setNama] = useState('')
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; s: string } | null>(null)

  const load = async () => setList(await window.api.rab.list(projekId))

  useEffect(() => {
    load()
  }, [projekId])

  const create = async () => {
    if (!nama.trim()) {
      setMsg({ t: 'err', s: 'Nama RAB wajib diisi' })
      return
    }
    const r = await window.api.rab.create(projekId, nama.trim())
    setNama('')
    setMsg({ t: 'ok', s: `RAB "${r.nama}" dibuat.` })
    load()
  }

  const remove = async (r: Rab) => {
    if (!confirm(`Hapus RAB "${r.nama}" beserta seluruh item & komponennya?`)) return
    await window.api.rab.remove(r.id)
    load()
  }

  return (
    <div>
      <button onClick={onBack}>‹ Kembali ke Projek</button>
      <h2 className="mt">RAB · {projekNama}</h2>
      <div className="row mt">
        <input placeholder="Nama RAB (mis. RAB Bangunan Utama)" value={nama} onChange={(e) => setNama(e.target.value)} />
        <button onClick={create}>+ Buat RAB</button>
      </div>
      {msg && <div className={'msg mt ' + msg.t}>{msg.s}</div>}
      <table className="mt2">
        <thead>
          <tr>
            <th>Nama</th>
            <th className="num">Overhead</th>
            <th className="num">Dibuat</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td>
                <button
                  style={{ background: 'transparent', color: 'var(--ink)', border: 'none', padding: 0 }}
                  onClick={() => onOpen(r)}
                >
                  {r.nama}
                </button>
              </td>
              <td className="num">{Math.round(r.overhead_pct * 100)}%</td>
              <td className="num">{r.created_at?.slice(0, 10)}</td>
              <td>
                <button onClick={() => onOpen(r)}>Buka</button>{' '}
                <button onClick={() => remove(r)}>Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length === 0 && <div className="empty">Belum ada RAB untuk projek ini.</div>}
    </div>
  )
}
