import { createClient } from "@/lib/supabase/server";

export type Identitas = {
  logoUrl: string | null;
  warnaUtama: string | null;
  namaUnit: string;
};

/**
 * Membaca identitas aplikasi: logo dan warna utamanya.
 *
 * Dipakai tata letak untuk menampilkan logo dan mewarnai seluruh
 * halaman. Kalau belum diatur, dikembalikan nilai kosong dan
 * aplikasi memakai warna bawaannya.
 */
export async function bacaIdentitas(): Promise<Identitas> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pengaturan_sistem")
    .select("logo_url, warna_utama, nama_unit")
    .eq("id", 1)
    .maybeSingle();

  return {
    logoUrl: data?.logo_url ?? null,
    warnaUtama: data?.warna_utama ?? null,
    namaUnit: data?.nama_unit ?? "Manajemen Bisnis",
  };
}
