"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import type { Balasan } from "@/lib/hasil";

export type { Balasan };

/** Membuang berkas lama dari penyimpanan supaya tidak menumpuk. */
async function buangBerkas(url: string | null) {
  if (!url) return;
  const tanda = "/storage/v1/object/public/publik/";
  const potong = url.indexOf(tanda);
  if (potong === -1) return;

  const jalur = url.slice(potong + tanda.length);
  if (jalur) await createAdminClient().storage.from("publik").remove([jalur]);
}

/** Menyimpan alamat foto profil milik sendiri. */
export async function simpanFotoProfil(url: string): Promise<Balasan> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("simpan_foto_profil", { p_url: url });

  if (error) return { ok: false, pesan: `Foto gagal disimpan: ${error.message}` };

  await buangBerkas(data as string | null);
  revalidatePath("/", "layout");
  return { ok: true, pesan: "Foto profil sudah diperbarui." };
}

/** Menghapus foto profil, kembali ke huruf awal nama. */
export async function hapusFotoProfil(): Promise<Balasan> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("simpan_foto_profil", { p_url: "" });

  if (error) return { ok: false, pesan: `Foto gagal dihapus: ${error.message}` };

  await buangBerkas(data as string | null);
  revalidatePath("/", "layout");
  return { ok: true, pesan: "Foto profil sudah dihapus." };
}

/**
 * Mengganti kata sandi sendiri.
 *
 * Sandi lama diperiksa ulang lebih dulu — tanpa itu, komputer yang
 * ditinggal terbuka bisa dipakai orang lain untuk mengunci
 * pemiliknya sendiri di luar.
 */
export async function gantiSandi(_s: Balasan, formData: FormData): Promise<Balasan> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { ok: false, pesan: "Sesi Anda sudah berakhir. Masuk lagi." };

  const lama = String(formData.get("sandi_lama") ?? "");
  const baru = String(formData.get("sandi_baru") ?? "");
  const ulang = String(formData.get("sandi_ulang") ?? "");

  if (baru.length < 8) return { ok: false, pesan: "Kata sandi baru minimal 8 karakter." };
  if (baru !== ulang) return { ok: false, pesan: "Ketikan ulang kata sandinya belum sama." };
  if (baru === lama) return { ok: false, pesan: "Kata sandi barunya masih sama dengan yang lama." };

  const supabase = await createClient();

  const { error: galatLama } = await supabase.auth.signInWithPassword({
    email: pengguna.email,
    password: lama,
  });
  if (galatLama) return { ok: false, pesan: "Kata sandi lama tidak cocok." };

  const { error } = await supabase.auth.updateUser({ password: baru });
  if (error) return { ok: false, pesan: `Gagal mengganti: ${error.message}` };

  return { ok: true, pesan: "Kata sandi sudah diganti." };
}
