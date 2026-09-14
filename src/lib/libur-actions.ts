"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JENIS_LIBUR } from "@/lib/libur";
import type { Hasil } from "@/lib/hasil";

/** Menambah satu hari libur ke kalender unit. */
export async function tambahLibur(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  const tanggal = String(formData.get("tanggal") ?? "").trim();
  const keterangan = String(formData.get("keterangan") ?? "").trim();
  const jenisDiminta = String(formData.get("jenis") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return { pesan: "Pilih dulu tanggalnya.", berhasil: null };
  }
  if (keterangan === "") {
    return { pesan: "Tulis keterangannya — misalnya Maulid Nabi.", berhasil: null };
  }

  const jenis = (JENIS_LIBUR as readonly string[]).includes(jenisDiminta)
    ? jenisDiminta
    : "Nasional";

  const supabase = await createClient();
  const { data: tersentuh, error } = await supabase
    .from("hari_libur")
    .upsert(
      { tanggal, keterangan, jenis, dibuat_oleh: pengguna.id },
      { onConflict: "tanggal" },
    )
    .select("tanggal");

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  // Perubahan yang ditolak aturan keamanan tidak menghasilkan galat,
  // hanya nol baris tersentuh.
  if (!tersentuh || tersentuh.length === 0) {
    return {
      pesan: "Tidak ada yang tersimpan — hanya Koordinator yang bisa mengatur hari libur.",
      berhasil: null,
    };
  }

  revalidatePath("/pengaturan/hari-libur");
  return { pesan: null, berhasil: `${keterangan} tercatat.` };
}

/** Menghapus satu hari libur. */
export async function hapusLibur(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return;

  const tanggal = String(formData.get("tanggal") ?? "").trim();
  if (!tanggal) return;

  const supabase = await createClient();
  await supabase.from("hari_libur").delete().eq("tanggal", tanggal);

  revalidatePath("/pengaturan/hari-libur");
}
