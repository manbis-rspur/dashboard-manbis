"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { bolehAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Hasil } from "@/lib/hasil";

/** Jenis berkas yang diterima — dokumen jadi, bukan berkas kerja. */
const DITERIMA = [".pdf", ".docx", ".doc", ".xlsx", ".png", ".jpg", ".jpeg"];
const MAKS = 20 * 1024 * 1024;

/**
 * Mengunggah satu berkas hasil ke arsip.
 *
 * Berkasnya lewat server memakai kunci penuh, bukan diunggah
 * langsung dari peramban — dengan begitu wadah 'dokumen' tetap
 * tertutup rapat dan tidak perlu ada izin unggah terbuka di sana.
 */
export async function unggahPublikasi(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };
  if (!(await bolehAkses("humas"))) {
    return { pesan: "Anda tidak berhak mengunggah ke arsip ini.", berhasil: null };
  }

  const judul = String(formData.get("judul") ?? "").trim();
  if (!judul) return { pesan: "Judul dokumen harus diisi.", berhasil: null };

  const berkas = formData.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { pesan: "Pilih dulu berkasnya.", berhasil: null };
  }

  const nama = berkas.name.toLowerCase();
  if (!DITERIMA.some((akhiran) => nama.endsWith(akhiran))) {
    return {
      pesan: `Jenis berkas belum didukung. Yang diterima: ${DITERIMA.join(", ")}.`,
      berhasil: null,
    };
  }

  if (berkas.size > MAKS) {
    return { pesan: "Berkasnya terlalu besar. Maksimal 20 MB.", berhasil: null };
  }

  const db = createAdminClient();
  const jalur = `publikasi/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${berkas.name}`;

  const { error: galatUnggah } = await db.storage
    .from("dokumen")
    .upload(jalur, await berkas.arrayBuffer(), {
      contentType: berkas.type || "application/octet-stream",
      upsert: false,
    });

  if (galatUnggah) {
    return { pesan: `Gagal mengunggah: ${galatUnggah.message}`, berhasil: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("publikasi").insert({
    judul,
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
    jenis: String(formData.get("jenis") ?? "Lainnya"),
    berkas_jalur: jalur,
    berkas_nama: berkas.name,
    berkas_ukuran: berkas.size,
    diunggah_oleh: pengguna.id,
  });

  if (error) {
    // Berkasnya sudah terlanjur naik tapi catatannya gagal —
    // dibuang lagi supaya tidak ada berkas yatim di penyimpanan.
    await db.storage.from("dokumen").remove([jalur]);
    return { pesan: `Gagal dicatat: ${error.message}`, berhasil: null };
  }

  revalidatePath("/publikasi");
  return { pesan: null, berhasil: `"${judul}" masuk ke arsip.` };
}

/** Menghapus satu dokumen beserta berkasnya. */
export async function hapusPublikasi(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { data } = await supabase
    .from("publikasi")
    .select("berkas_jalur")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("publikasi").delete().eq("id", id);
  if (error || !data) return;

  await createAdminClient().storage.from("dokumen").remove([data.berkas_jalur]);
  revalidatePath("/publikasi");
}
