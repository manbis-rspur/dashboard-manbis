"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Balasan } from "@/lib/hasil";

async function buangBerkas(url: string | null) {
  if (!url) return;
  const tanda = "/storage/v1/object/public/publik/";
  const potong = url.indexOf(tanda);
  if (potong === -1) return;

  const jalur = url.slice(potong + tanda.length);
  if (jalur) await createAdminClient().storage.from("publik").remove([jalur]);
}

/**
 * Menyimpan logo dan warna utama aplikasi. Hanya Admin — pemeriksaannya
 * ada di dalam database, bukan hanya di sini, supaya tidak bisa dilewati.
 */
export async function simpanIdentitas(
  logoUrl: string | null,
  warna: string | null,
): Promise<Balasan> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("simpan_identitas", {
    p_logo_url: logoUrl ?? "",
    p_warna: warna ?? "",
  });

  if (error) return { ok: false, pesan: `Gagal disimpan: ${error.message}` };

  // Logo lama dibuang hanya kalau memang diganti dengan yang lain.
  const lama = data as string | null;
  if (lama && lama !== logoUrl) await buangBerkas(lama);

  revalidatePath("/", "layout");
  return { ok: true, pesan: "Identitas aplikasi sudah diperbarui." };
}
