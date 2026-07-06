export function formatRupiah(value: number): string {
  if (isNaN(value)) return 'Rp 0';
  const intVal = Math.round(value);
  return 'Rp ' + intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
