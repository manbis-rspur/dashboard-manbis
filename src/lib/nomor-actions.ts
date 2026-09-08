"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type HasilAmbil = {
  pesan: string | null;
  nomor: string | null;
};

/**
 * Mengambil satu nomor baru.
 *
 * Urutannya tidak dihitung di sini, melainkan oleh database dalam satu
 * transaksi terkunci — supaya dua orang yang menekan tombol pada detik
 * yang sama tetap mendapat nomor berbeda.
 */
export async function ambilNomor(
  _sebelumnya: HasilAmbil,
  formData: FormData,
): Promise<HasilAmbil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) {
    return { pesan: "Sesi Anda sudah berakhir. Muat ulang halaman lalu masuk lagi.", nomor: null };
  }

  const jenisId = Number(formData.get("jenis_id"));
  const perihal = String(formData.get("perihal") ?? "").trim();
  const tujuan = String(formData.get("ditujukan_kepada") ?? "").trim();
  const tanggal = String(formData.get("tanggal_surat") ?? "").trim();

  if (!jenisId) return { pesan: "Pilih dulu jenis dokumennya.", nomor: null };
  if (!perihal) return { pesan: "Perihal harus diisi.", nomor: null };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nomor")
    .insert({
      jenis_id: jenisId,
      perihal,
      ditujukan_kepada: tujuan || null,
      tanggal_surat: tanggal || undefined,
      diambil_oleh: pengguna.id,
    })
    .select("nomor_lengkap")
    .single();

  if (error) {
    return { pesan: `Nomor gagal diambil: ${error.message}`, nomor: null };
  }

  revalidatePath("/");
  revalidatePath("/penomoran/ambil-nomor");
  revalidatePath("/penomoran/buku-nomor");

  return { pesan: null, nomor: data.nomor_lengkap };
}
