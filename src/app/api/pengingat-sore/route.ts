import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hariKerja } from "@/lib/libur";
import { susunBerulang, susunTutupHari } from "@/lib/pengingat";
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

  // Sabtu, Minggu, dan tanggal merah dilewati. Pengingat yang datang
  // pada hari orang tidak bekerja cepat dianggap gangguan — dan yang
  // dianggap gangguan akan diabaikan juga pada hari kerja.
  const { data: barisLibur } = await db.from("hari_libur").select("tanggal");
  const libur = new Set((barisLibur ?? []).map((b) => b.tanggal as string));
  const bekerja = hariKerja(kini, libur);

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
  const hasil: { nama: string; gelembung: string[]; pesan?: string }[] = [];

  for (const p of orang ?? []) {
    if (!p.telegram_chat_id) continue;

    const miliknya = semua.filter((t) => t.untuk === p.id);

    // Dua gelembung terpisah, bukan satu pesan panjang. Pekerjaan
    // rutin dan ajakan menutup hari adalah dua hal berbeda, dan yang
    // ditumpuk jadi satu cenderung dibaca setengah.
    // Pada hari libur, ajakan menutup hari dilewati — tapi tugas
    // berulang tetap dikirim. Hari itu dipilih sendiri oleh yang
    // punya tugasnya; jadwal dokter tetap perlu diperbarui hari
    // Minggu walaupun kantornya libur.
    const bagian: [string, string | null][] = [
      ["rutin", susunBerulang(p.nama, miliknya, kini)],
      ["tutup hari", bekerja ? susunTutupHari(p.nama, miliknya, kini) : null],
    ];

    const terkirim: string[] = [];
    let galat: string | undefined;

    for (const [nama, isi] of bagian) {
      if (!isi) continue;
      const kirim = await kirimTelegram(p.telegram_chat_id, isi);
      if (kirim.ok) terkirim.push(nama);
      else galat = kirim.pesan;
    }

    hasil.push({
      nama: p.nama,
      gelembung: terkirim,
      ...(galat ? { pesan: galat } : {}),
      ...(terkirim.length === 0 && !galat ? { pesan: "tidak ada yang perlu disebut" } : {}),
    });
  }

  return NextResponse.json({ tanggal: kini, jumlah: hasil.length, hasil });
}
