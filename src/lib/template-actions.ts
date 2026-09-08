"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { JALUR_TEMPLATE } from "@/lib/komplain-dokumen";
import type { Balasan } from "@/lib/hasil";

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Menyimpan template formulir komplain.
 *
 * Berkasnya lewat server, bukan diunggah langsung dari peramban,
 * supaya wadah 'dokumen' tetap tertutup rapat — tidak perlu ada
 * satu pun izin unggah yang terbuka di sana.
 */
export async function simpanTemplate(_s: Balasan, formData: FormData): Promise<Balasan> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { ok: false, pesan: "Sesi Anda sudah berakhir. Masuk lagi." };
  if (pengguna.peran !== "Admin") {
    return { ok: false, pesan: "Hanya Admin yang boleh mengganti template." };
  }

  const berkas = formData.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { ok: false, pesan: "Pilih dulu berkas templatenya." };
  }

  if (!berkas.name.toLowerCase().endsWith(".docx")) {
    return {
      ok: false,
      pesan:
        "Template harus berupa .docx. Kalau aslinya Google Docs, unduh lewat " +
        "Berkas → Download → Microsoft Word (.docx).",
    };
  }

  if (berkas.size > 10 * 1024 * 1024) {
    return { ok: false, pesan: "Berkasnya terlalu besar. Maksimal 10 MB." };
  }

  const db = createAdminClient();
  const { error } = await db.storage
    .from("dokumen")
    .upload(JALUR_TEMPLATE, await berkas.arrayBuffer(), {
      contentType: DOCX,
      upsert: true,
    });

  if (error) return { ok: false, pesan: `Gagal disimpan: ${error.message}` };

  revalidatePath("/pengaturan/template");
  return {
    ok: true,
    pesan: `Template "${berkas.name}" tersimpan. Coba unduh satu formulir untuk memastikan hasilnya benar.`,
  };
}
