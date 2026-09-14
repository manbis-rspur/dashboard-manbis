import "server-only";

/**
 * Menyimpan tugas dengan penanda baru, tanpa ikut gagal bila
 * kolomnya belum ada.
 *
 * Kolom 'sumber' dan 'dadakan' baru muncul setelah berkas SQL 45
 * dijalankan. Di sela antara aplikasinya naik dan SQL-nya
 * dijalankan, kode yang menyebut kolom itu akan menolak menyimpan
 * APA PUN — dan yang gagal bukan penandanya, melainkan seluruh
 * tugasnya.
 *
 * Jadi penandanya dianggap tambahan: kalau ditolak karena kolomnya
 * belum ada, tugasnya tetap disimpan tanpa penanda. Kehilangan
 * keterangan "dadakan" jauh lebih ringan daripada kehilangan
 * instruksi atasan.
 */

/** Kode Postgres untuk kolom yang tidak dikenal. */
const KOLOM_TIDAK_ADA = "42703";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Klien = { from: (tabel: string) => any };

export type HasilSimpanTugas = {
  id: number | null;
  pesan: string | null;
};

export async function simpanTugas(
  supabase: Klien,
  inti: Record<string, unknown>,
  penanda: Record<string, unknown>,
): Promise<HasilSimpanTugas> {
  const coba = async (isi: Record<string, unknown>) =>
    supabase.from("tugas").insert(isi).select("id").single();

  let { data, error } = await coba({ ...inti, ...penanda });

  if (error?.code === KOLOM_TIDAK_ADA) {
    ({ data, error } = await coba(inti));
  }

  if (error) return { id: null, pesan: error.message as string };
  return { id: (data?.id as number) ?? null, pesan: null };
}
