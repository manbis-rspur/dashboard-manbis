"use client";

import { createClient } from "@/lib/supabase/client";
import { jenisDiterima, MAKS_BERKAS, ukuranRapi } from "@/lib/publikasi";
import type { IzinUnggah } from "@/lib/publikasi-actions";

/**
 * Mengunggah satu berkas dari peramban langsung ke penyimpanan,
 * memakai izin sekali-pakai yang diterbitkan peladen.
 *
 * Berkasnya tidak lewat peladen sama sekali. Itu bukan sekadar
 * hemat: sebuah server action hanya menerima kiriman 1 MB, dan di
 * Vercel batas kerasnya 4,5 MB — dokumen Word atau PDF yang
 * sebenarnya hampir selalu lebih besar dari itu, dan itulah yang
 * membuat unggahan gagal sebelum ini.
 */
export async function unggahLewatIzin(
  berkas: File,
  mintaIzin: (nama: string) => Promise<IzinUnggah>,
): Promise<{ jalur: string; pesan: null } | { jalur: null; pesan: string }> {
  if (!jenisDiterima(berkas.name)) {
    return { jalur: null, pesan: "Jenis berkas itu belum didukung." };
  }

  if (berkas.size > MAKS_BERKAS) {
    return {
      jalur: null,
      pesan: `Berkasnya ${ukuranRapi(berkas.size)} — melebihi batas ${ukuranRapi(MAKS_BERKAS)}.`,
    };
  }

  const izin = await mintaIzin(berkas.name);
  if (izin.pesan !== null) return { jalur: null, pesan: izin.pesan };

  const { error } = await createClient()
    .storage.from("dokumen")
    .uploadToSignedUrl(izin.jalur, izin.token, berkas, {
      contentType: berkas.type || "application/octet-stream",
    });

  if (error) {
    return { jalur: null, pesan: `Berkasnya gagal naik: ${error.message}` };
  }

  return { jalur: izin.jalur, pesan: null };
}
