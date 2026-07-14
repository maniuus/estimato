export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Aktif',
  completed: 'Selesai',
  archived: 'Diarsipkan'
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[#FDEBEC] text-[#9F2F2D] border border-[#FDEBEC]',
  active: 'bg-[#E1F3FE] text-[#1F6C9F] border border-[#E1F3FE]',
  completed: 'bg-[#EDF3EC] text-[#346538] border border-[#EDF3EC]',
  archived: 'bg-[#FBFBFA] text-[#787774] border border-[#EAEAEA]'
}

function terbilang(nominal: number): string {
  const bil = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas"
  ];
  
  const num = Math.floor(nominal);
  if (num < 12) {
    return bil[num];
  } else if (num < 20) {
    return bil[num - 10] + " Belas";
  } else if (num < 100) {
    return bil[Math.floor(num / 10)] + " Puluh " + terbilang(num % 10);
  } else if (num < 200) {
    return "Seratus " + terbilang(num - 100);
  } else if (num < 1000) {
    return terbilang(Math.floor(num / 100)) + " Ratus " + terbilang(num % 100);
  } else if (num < 2000) {
    return "Seribu " + terbilang(num - 1000);
  } else if (num < 1000000) {
    return terbilang(Math.floor(num / 1000)) + " Ribu " + terbilang(num % 1000);
  } else if (num < 1000000000) {
    return terbilang(Math.floor(num / 1000000)) + " Juta " + terbilang(num % 1000000);
  } else if (num < 1000000000000) {
    return terbilang(Math.floor(num / 1000000000)) + " Milyar " + terbilang(num % 1000000000);
  } else if (num < 1000000000000000) {
    return terbilang(Math.floor(num / 1000000000000)) + " Triliun " + terbilang(num % 1000000000000);
  }
  return "";
}

export function getTerbilang(amount: number): string {
  if (amount === 0) return "Nol Rupiah";
  const hasil = terbilang(amount).trim().replace(/\s+/g, " ");
  return hasil + " Rupiah";
}

