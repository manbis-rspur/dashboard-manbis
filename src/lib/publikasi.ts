/**
 * Ketentuan berkas arsip publikasi.
 *
 * Ditaruh di berkas tersendiri, bukan di dalam berkas server action,
 * karena berkas bertanda "use server" hanya boleh mengekspor fungsi
 * async — sementara angka dan daftar ini dibutuhkan juga oleh
 * peramban, yang memeriksa berkasnya sebelum mulai mengunggah.
 */

/** Jenis berkas yang diterima — dokumen jadi, bukan berkas kerja. */
export const DITERIMA = [
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

export const ACCEPT = DITERIMA.join(",");

/** Batas ukuran satu berkas. */
export const MAKS_BERKAS = 20 * 1024 * 1024;

export function jenisDiterima(namaBerkas: string): boolean {
  const nama = namaBerkas.toLowerCase();
  return DITERIMA.some((akhiran) => nama.endsWith(akhiran));
}

export function ukuranRapi(bita: number): string {
  if (bita < 1024 * 1024) return `${Math.round(bita / 1024)} KB`;
  return `${(bita / 1024 / 1024).toFixed(1)} MB`;
}
