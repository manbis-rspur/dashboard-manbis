import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hariKerja } from "@/lib/libur";
import { susunPengingat } from "@/lib/pengingat";
import { kirimTelegram } from "@/lib/telegram";
import { MASIH_TERBUKA, geser, hariIni as hitungHariIni, type Tugas } from "@/lib/tugas";

/**
 * Pengingat pagi — dipanggil penjadwal Vercel sekali sehari.
 *
 * Dashboard hanya mengingatkan orang yang membukanya, sedangkan yang
 * lupa justru tidak membuka; itu bentuk lupanya. Jadi pengingatnya
 * harus datang sendiri ke tempat yang memang dilihat tiap pagi.
 *
 * Dijaga satu kata sandi yang hanya diketahui penjadwal. Alamat ini
 * terbuka tanpa login — kalau tidak dijaga, siapa pun yang
 * menemukannya bisa membanjiri Telegram seluruh anggota unit.
 *
 * Jadwalnya ada di vercel.json: pukul 01.00 UTC, yaitu 08.00 WIB.
 * Keterangannya ditulis di sini karena berkas vercel.json menolak
 * kunci apa pun di luar yang dikenalnya — komentar sekalipun, dan
 * penolakannya menggagalkan seluruh penaikan.
 *
 * Pada paket gratis Vercel, waktunya rentang satu jam, bukan jam
 * persis: yang dijadwalkan 08.00 WIB bisa datang antara pukul
 * 08.00 dan 09.00.
 *
 * Paket gratis Vercel mengizinkan dua jadwal per proyek, masing-
 * masing sekali sehari — jadi ada pasangannya di sore hari. Waktunya
 * perkiraan, bisa meleset beberapa menit.
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

  // Sabtu, Minggu, dan tanggal merah dilewati. Pengingat yang datang
  // pada hari orang tidak bekerja cepat dianggap gangguan — dan yang
  // dianggap gangguan akan diabaikan juga pada hari kerja.
  const { data: barisLibur } = await db.from("hari_libur").select("tanggal");
  const libur = new Set((barisLibur ?? []).map((b) => b.tanggal as string));
  const bekerja = hariKerja(kini, libur);

  if (!bekerja) {
    return NextResponse.json({ tanggal: kini, libur: true, jumlah: 0, hasil: [] });
  }

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
    const kirim = await kirimTelegram(
      p.telegram_chat_id,
      susunPengingat(p.nama, miliknya, kini),
    );

    hasil.push(
      kirim.ok
        ? { nama: p.nama, terkirim: true }
        : { nama: p.nama, terkirim: false, pesan: kirim.pesan },
    );
  }

  return NextResponse.json({ tanggal: kini, jumlah: hasil.length, hasil });
}
