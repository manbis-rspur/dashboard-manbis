/**
 * Waktu selalu dibaca dan ditulis sebagai waktu Indonesia Barat.
 *
 * Rumah sakitnya di Banda Aceh, seluruh penggunanya di zona yang
 * sama, tapi peladennya tidak: Vercel menjalankan semuanya di UTC.
 * Kalau isian "11 September 14:30" ditafsirkan apa adanya oleh
 * peladen, yang tersimpan jadi 21:30 WIB — tujuh jam meleset, dan
 * perhitungan SLA komplain ikut salah tanpa ada yang curiga.
 *
 * Jadi zonanya ditulis tegas di kedua arah, tidak pernah dibiarkan
 * mengikuti jam mesin yang kebetulan menjalankan kodenya.
 */

const ZONA = "Asia/Jakarta";
const SELISIH = "+07:00";

/**
 * Bentuk yang dipakai kotak isian tanggal-jam: YYYY-MM-DDTHH:mm.
 *
 * Memakai penanggalan sv-SE bukan kebetulan — hanya itu yang
 * menghasilkan "2026-09-11 14:30" dengan angka berimbuhan nol,
 * persis bentuk yang diminta kotak isian, tanpa perlu merangkai
 * potongannya sendiri.
 */
export function keIsianWaktu(waktu: Date | string | null | undefined): string {
  if (!waktu) return "";

  const tanggal = typeof waktu === "string" ? new Date(waktu) : waktu;
  if (Number.isNaN(tanggal.getTime())) return "";

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(tanggal)
    .replace(" ", "T");
}

/** Waktu sekarang, dalam bentuk isian tanggal-jam WIB. */
export function sekarangIsianWaktu(): string {
  return keIsianWaktu(new Date());
}

/**
 * Menafsirkan isian tanggal-jam sebagai waktu WIB, lalu mengubahnya
 * jadi bentuk yang disimpan database.
 *
 * Mengembalikan null kalau kosong atau tidak masuk akal, supaya
 * kolomnya tidak terisi tanggal ngawur karena salah ketik.
 */
export function dariIsianWaktu(nilai: string): string | null {
  const bersih = nilai.trim();
  if (bersih === "") return null;

  // Kotak isian tanggal-jam bisa menyertakan detik, bisa juga tidak.
  const lengkap = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(bersih)
    ? `${bersih}:00`
    : bersih;

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(lengkap)) return null;

  const tanggal = new Date(`${lengkap}${SELISIH}`);
  return Number.isNaN(tanggal.getTime()) ? null : tanggal.toISOString();
}
