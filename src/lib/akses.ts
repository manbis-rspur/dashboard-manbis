import { redirect } from "next/navigation";
import { getPenggunaAktif, type PenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Memeriksa apakah orang yang sedang masuk berhak membuka sebuah
 * modul. Admin selalu berhak; selain itu harus diberi izin oleh
 * Koordinator lewat menu Pengguna.
 *
 * Jawabannya diambil dari database, bukan disimpulkan di aplikasi,
 * supaya sama persis dengan aturan yang menjaga tabelnya.
 */
export async function bolehAkses(modul: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("boleh_akses", { p_modul: modul });
  return data === true;
}

/** Versi yang menutup halaman bagi yang tidak berhak. */
export async function wajibAkses(modul: string): Promise<PenggunaAktif> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await bolehAkses(modul))) redirect("/tanpa-akses");
  return pengguna;
}


/**
 * Izin yang benar-benar diberikan, bukan yang ditembus.
 *
 * bolehAkses() mengizinkan Admin menembus semua modul — disengaja,
 * supaya ada jalan pemulihan saat ada yang keliru. Untuk hal yang
 * memang tidak boleh ditembus siapa pun, dipakai pemeriksaan ini:
 * daftar pekerjaan seseorang bukan data yang pantas terbuka hanya
 * karena seseorang memegang kunci teknis.
 */
export async function punyaIzin(modul: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("punya_izin", { p_modul: modul });
  return data === true;
}
