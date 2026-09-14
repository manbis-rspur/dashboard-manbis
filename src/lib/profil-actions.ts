"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { kirimTelegram } from "@/lib/telegram";
import { susunPengingat } from "@/lib/pengingat";
import type { Tugas } from "@/lib/tugas";
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


/**
 * Menyambungkan Telegram sendiri.
 *
 * Nomor percakapannya diperiksa database — yang bukan angka ditolak
 * di sana, supaya salah tempel ketahuan saat disimpan, bukan besok
 * pagi saat pengingatnya tidak kunjung datang.
 */
export async function simpanTelegram(_s: Balasan, formData: FormData): Promise<Balasan> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { ok: false, pesan: "Sesi Anda sudah berakhir. Masuk lagi." };

  const chatId = String(formData.get("telegram_chat_id") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("simpan_telegram", { p_chat_id: chatId });

  if (error) {
    return {
      ok: false,
      pesan: error.message.includes("harus berupa angka")
        ? "Nomor percakapannya harus berupa angka. Salin apa adanya dari @userinfobot."
        : `Gagal disimpan: ${error.message}`,
    };
  }

  revalidatePath("/profil");
  return {
    ok: true,
    pesan: chatId === "" ? "Telegram diputus." : "Telegram tersambung.",
  };
}

/**
 * Mengirim satu pesan percobaan ke Telegram sendiri.
 *
 * Isinya persis pesan pagi yang sebenarnya, bukan tulisan "tes" —
 * supaya yang mencobanya sekalian melihat bentuk yang akan ia terima
 * tiap pagi, dan bisa bilang kalau ada yang kurang.
 */
export async function kirimUjiTelegram(): Promise<Balasan> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { ok: false, pesan: "Sesi Anda sudah berakhir. Masuk lagi." };

  const supabase = await createClient();

  const { data: baris } = await supabase
    .from("pengguna")
    .select("telegram_chat_id")
    .eq("id", pengguna.id)
    .maybeSingle();

  const chatId = baris?.telegram_chat_id;
  if (!chatId) {
    return { ok: false, pesan: "Simpan dulu nomor percakapan Telegram Anda." };
  }

  const { data: tugas } = await supabase
    .from("tugas")
    .select(
      "id, untuk, judul, keterangan, tanggal_mulai, tenggat, prioritas, status, catatan_hasil, selesai_pada, jenis, hari, tanggal_bulan, terakhir_dikerjakan",
    )
    .eq("untuk", pengguna.id);

  const kirim = await kirimTelegram(
    chatId,
    susunPengingat(pengguna.nama, (tugas ?? []) as Tugas[]),
  );

  return kirim.ok
    ? { ok: true, pesan: "Terkirim. Periksa Telegram Anda." }
    : { ok: false, pesan: kirim.pesan };
}
