import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { susunTutupHari } from "@/lib/pengingat";
import { kirimTelegram } from "@/lib/telegram";
import { MASIH_TERBUKA, geser, hariIni as hitungHariIni, type Tugas } from "@/lib/tugas";

/**
 * Pengingat sore — ajakan menutup hari sebelum pulang.
 *
 * Tidak dikirim kalau memang tidak ada yang perlu ditutup. Pengingat
 * yang tetap datang walaupun tidak ada kerjaan melatih orang
 * mengabaikannya, dan begitu terbiasa diabaikan ia juga akan
 * terlewat pada hari yang benar-benar penting.
 *
 * Jadwalnya ada di vercel.json: pukul 09.30 UTC, yaitu 16.30 WIB.
 * Paket gratis Vercel mengizinkan dua jadwal per proyek, masing-
 * masing sekali sehari — pagi dan sore muat, tanpa layanan luar.
 * Waktunya perkiraan, bisa meleset beberapa menit.
 *
 * Dijaga kata sandi penjadwal, sama seperti pengingat pagi.
 */
export async function GET(permintaan: Request) {
  const rahasia = process.env.CRON_SECRET;

  if (!rahasia) {
    return NextResponse.json(
      { pesan: "CRON_SECRET belum dipasang di pengaturan Vercel." },
      { status: 500 },
    );
  }

  if (permintaan.headers.get("authorization") !== `Bearer ${rahasia}`) {
    return NextResponse.json({ pesan: "Tidak berhak." }, { status: 401 });
  }

  const db = createAdminClient();
  const kini = hitungHariIni();
  const kemarin = geser(kini, -1);

  const { data: orang, error: galatOrang } = await db
    .from("pengguna")
    .select("id, nama, telegram_chat_id")
    .eq("aktif", true)
    .not("telegram_chat_id", "is", null);

  if (galatOrang) {
    return NextResponse.json({ pesan: galatOrang.message }, { status: 500 });
  }

  // Tugas yang masih terbuka, ditambah yang selesai kemarin. Yang
  // selesai lebih lama tidak dibaca sama sekali — pengingat pagi
  // bukan tempat menelusuri riwayat.
  const { data: tugas } = await db
    .from("tugas")
    .select(
      "id, untuk, judul, keterangan, tanggal_mulai, tenggat, prioritas, status, catatan_hasil, selesai_pada, jenis, hari, tanggal_bulan, terakhir_dikerjakan",
    )
    .or(`status.in.(${MASIH_TERBUKA.join(",")}),selesai_pada.gte.${kemarin}`);

  const semua = (tugas ?? []) as Tugas[];
  const hasil: { nama: string; terkirim: boolean; pesan?: string }[] = [];

  for (const p of orang ?? []) {
    if (!p.telegram_chat_id) continue;

    const miliknya = semua.filter((t) => t.untuk === p.id);
    const pesan = susunTutupHari(p.nama, miliknya, kini);

    if (!pesan) {
      hasil.push({ nama: p.nama, terkirim: false, pesan: "tidak ada yang perlu ditutup" });
      continue;
    }

    const kirim = await kirimTelegram(p.telegram_chat_id, pesan);

    hasil.push(
      kirim.ok
        ? { nama: p.nama, terkirim: true }
        : { nama: p.nama, terkirim: false, pesan: kirim.pesan },
    );
  }

  return NextResponse.json({ tanggal: kini, jumlah: hasil.length, hasil });
}
