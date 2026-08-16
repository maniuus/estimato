export function fmt(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  return n.toLocaleString('id-ID', { maximumFractionDigits: dp })
}

// format angka dengan desimal FIXED (selalu persis dp digit) — utk report agar konsisten
export function fmtFixed(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  return n.toLocaleString('id-ID', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

export function fmtRp(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'Rp 0'
  return 'Rp ' + fmt(n, dp)
}

export function fmtRpFixed(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'Rp 0'
  return 'Rp ' + fmtFixed(n, dp)
}

// format angka mentah (string) jadi pemisah ribuan titik saat diketik — mis. '1234567' → '1.234.567'
export function fmtInputNum(raw: string): string {
  const clean = raw.replace(/[^\d.,-]/g, '').replace(/[.]/g, '')
  const neg = clean.startsWith('-')
  const rest = clean.replace('-', '')
  const m = rest.match(/^(\d*)([.,])(\d*)$/)
  if (m) {
    const int = m[1] ? Number(m[1]).toLocaleString('id-ID') : ''
    return (neg ? '-' : '') + int + ',' + m[3]
  }
  const int = rest ? Number(rest).toLocaleString('id-ID') : ''
  return (neg ? '-' : '') + int
}

// ubah teks ber-format ke angka mentah (untuk disimpan)
export function parseInputNum(v: string): string {
  return v.replace(/[.]/g, '').replace(/,/g, '.')
}

// nominal ringkas untuk cell sempit: 50 rb, 7,35 jt, 1,2 m
export function fmtRpShort(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'Rp 0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return 'Rp ' + fmt(n / 1_000_000_000, 2) + ' m'
  if (abs >= 1_000_000) return 'Rp ' + fmt(n / 1_000_000, 2) + ' jt'
  if (abs >= 1_000) return 'Rp ' + fmt(n / 1_000, 1) + ' rb'
  return fmtRp(n)
}

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']
const TINGKAT = ['', 'ribu', 'juta', 'miliar', 'triliun']

function tiga(n: number): string {
  const ratus = Math.floor(n / 100)
  const sisa = n % 100
  const puluh = Math.floor(sisa / 10)
  const satu = sisa % 10
  let out = ''
  if (ratus === 1) out += 'seratus '
  else if (ratus > 1) out += SATUAN[ratus] + ' ratus '
  if (puluh === 1) {
    if (satu === 0) out += 'sepuluh '
    else if (satu === 1) out += 'sebelas '
    else out += SATUAN[satu] + ' belas '
  } else {
    if (puluh > 1) out += SATUAN[puluh] + ' puluh '
    if (satu > 0) out += SATUAN[satu] + ' '
  }
  return out
}

export function terbilang(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n) || n === 0) return 'nol rupiah'
  let angka = Math.abs(Math.round(n))
  const parts: string[] = []
  let tingkat = 0
  while (angka > 0) {
    const chunk = angka % 1000
    if (chunk > 0) {
      let kata = tiga(chunk)
      if (chunk === 1 && tingkat === 1) kata = 'seribu '
      parts.unshift((kata.trim() + ' ' + TINGKAT[tingkat]).trim())
    }
    angka = Math.floor(angka / 1000)
    tingkat += 1
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim() + ' rupiah'
}
