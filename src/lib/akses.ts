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
 * Seberapa jauh seseorang boleh memakai modul Humas & Digital
 * Marketing.
 *
 *   penuh     — memakai semua modul dan merakit modul baru
 *   pelanggan — hanya modul berkategori Layanan Pelanggan, tetapi
 *               tetap menerima seluruh hasil yang disusun tim
 *   tidak     — tidak berhak sama sekali
 */
export type IzinHumas = "penuh" | "pelanggan" | "tidak";

/** Kategori yang boleh dibuka pemegang izin terbatas. */
export const KATEGORI_PELANGGAN = "Layanan Pelanggan";

export async function izinHumas(): Promise<IzinHumas> {
  if (await bolehAkses("humas")) return "penuh";
  if (await bolehAkses("humas_pelanggan")) return "pelanggan";
  return "tidak";
}

/** Versi yang menutup halaman bagi yang tidak berhak sama sekali. */
export async function wajibHumas(): Promise<IzinHumas> {
  const izin = await izinHumas();
  if (izin === "tidak") redirect("/tanpa-akses");
  return izin;
}

/** Halaman yang hanya untuk pemegang izin penuh — merakit modul. */
export async function wajibHumasPenuh(): Promise<void> {
  if ((await izinHumas()) !== "penuh") redirect("/tanpa-akses");
}
