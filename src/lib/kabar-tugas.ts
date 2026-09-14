import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { aman, kirimTelegram, tokenTelegramAda } from "@/lib/telegram";
import { sebutTenggat } from "@/lib/tugas";

/**
 * Mengabari seseorang bahwa ada tugas baru untuknya.
 *
 * Dikirim saat itu juga, bukan menunggu pengingat pagi. Tugas
 * dadakan yang baru terdengar besok pagi sudah kehilangan gunanya
 * — apalagi kalau diberikan menjelang hari libur, yang berarti
 * baru terbaca tiga hari kemudian.
 *
 * Nomor percakapannya dibaca dengan kunci layanan: yang menitipkan
 * tugas belum tentu berhak membaca baris pengguna orang lain, dan
 * memberi hak itu hanya demi mengirim pesan berarti membuka lebih
 * banyak daripada yang dibutuhkan.
 */

const ALAMAT_SITUS =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://dashboard-manbis.vercel.app");

export type KabarTugas = {
  untuk: number;
  judul: string;
  tenggat: string | null;
  prioritas: string;
  dari: string;
};

export async function kabariTugasBaru(kabar: KabarTugas): Promise<void> {
  if (!tokenTelegramAda()) return;

  const { data } = await createAdminClient()
    .from("pengguna")
    .select("telegram_chat_id")
    .eq("id", kabar.untuk)
    .maybeSingle();

  const chatId = data?.telegram_chat_id;
  if (!chatId) return;

  const baris = [
    `📌 <b>Tugas baru dari ${aman(kabar.dari)}</b>`,
    "",
    aman(kabar.judul),
    kabar.tenggat
      ? `Tenggat: <b>${aman(sebutTenggat(kabar.tenggat))}</b>`
      : "Tanpa tenggat.",
  ];

  if (kabar.prioritas === "Tinggi") baris.push("Prioritas: <b>Tinggi</b>");

  baris.push("", `Buka daftar tugas: ${ALAMAT_SITUS}/tugas`);

  // Gagal mengirim tidak boleh menggagalkan penyimpanan tugasnya.
  // Tugas yang tersimpan tanpa pemberitahuan masih jauh lebih baik
  // daripada tugas yang batal tersimpan karena Telegram sedang
  // bermasalah.
  await kirimTelegram(chatId, baris.join("\n"));
}
