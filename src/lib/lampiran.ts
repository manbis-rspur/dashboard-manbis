/**
 * Ketentuan lampiran hasil pekerjaan.
 *
 * Di berkas tersendiri, bukan di dalam berkas server action, karena
 * berkas bertanda "use server" hanya boleh mengekspor fungsi async —
 * sementara angka dan daftar ini dibutuhkan juga oleh peramban, yang
 * memeriksa berkasnya sebelum mulai mengunggah.
 */

export const JENIS_LAMPIRAN = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".docx",
  ".xlsx",
  ".pptx",
] as const;

export const ACCEPT_LAMPIRAN = JENIS_LAMPIRAN.join(",");

/**
 * Batas ukuran satu lampiran.
 *
 * Sengaja jauh lebih kecil daripada batas arsip publikasi. Yang
 * ditaruh di sini hasil kerja harian yang jumlahnya banyak dan terus
 * bertambah; video dan berkas berat ditaruh di tempat lain lalu
 * cukup ditempel tautannya.
 */
export const MAKS_LAMPIRAN = 10 * 1024 * 1024;

export function jenisLampiranDiterima(nama: string): boolean {
  const n = nama.toLowerCase();
  return JENIS_LAMPIRAN.some((akhiran) => n.endsWith(akhiran));
}

export function ukuranRapi(bita: number | null | undefined): string {
  if (!bita) return "";
  if (bita < 1024 * 1024) return `${Math.round(bita / 1024)} KB`;
  return `${(bita / 1024 / 1024).toFixed(1)} MB`;
}

export type Lampiran = {
  id: number;
  tugas_id: number;
  jenis: string;
  judul: string | null;
  berkas_nama: string | null;
  berkas_ukuran: number | null;
  tautan: string | null;
  pada: string;
};
