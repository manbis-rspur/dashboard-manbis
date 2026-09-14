/**
 * Hari kerja dan hari libur.
 *
 * Sabtu dan Minggu dianggap libur tanpa perlu didaftarkan. Tanggal
 * merah dan cuti bersama diisi sendiri lewat menu Hari Libur —
 * bukan diambil dari layanan kalender di luar, yang bisa mati
 * diam-diam dan membuat pengingatnya salah tanpa ada yang tahu.
 */

import { nomorHari } from "@/lib/tugas";

export const JENIS_LIBUR = ["Nasional", "Cuti Bersama", "Khusus RSPUR"] as const;

export type HariLibur = {
  tanggal: string;
  keterangan: string;
  jenis: string;
};

/** Sabtu (6) dan Minggu (7) menurut penomoran ISO. */
export function akhirPekan(tanggal: string): boolean {
  const n = nomorHari(tanggal);
  return n === 6 || n === 7;
}

export function hariKerja(tanggal: string, libur: Set<string>): boolean {
  return !akhirPekan(tanggal) && !libur.has(tanggal);
}

/** Menyebut alasan sebuah tanggal bukan hari kerja. */
export function sebabLibur(
  tanggal: string,
  libur: Map<string, string>,
): string | null {
  const dicatat = libur.get(tanggal);
  if (dicatat) return dicatat;
  if (akhirPekan(tanggal)) return nomorHari(tanggal) === 6 ? "Sabtu" : "Minggu";
  return null;
}
