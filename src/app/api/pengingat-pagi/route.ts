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

  /**
   * Perubahan jadwal dokter yang sudah dicatat tapi belum terbit
   * di rspur.co.id.
   *
   * Kegagalan yang sesungguhnya bukan salah mengubah, melainkan
   * lupa mengubah sama sekali setelah niatnya lewat semalam. Jadi
   * ia ikut ditagih tiap pagi sampai benar-benar terpasang.
   *
   * Hanya kepada yang memang mengurusnya — pemegang izin 'humas'.
   * Yang lain tidak bisa membukanya, dan pengingat yang tidak bisa
   * ditindaklanjuti cuma melatih orang mengabaikan pesan.
   */
  const { data: tertunda } = await db
    .from("perubahan_jadwal")
    .select("dokter_nama, aksi, hari, jam_lama, jam_baru, dicatat_pada")
    .eq("status", "Menunggu")
    .order("dicatat_pada")
    .limit(10);

  const { data: pengurus } = await db
    .from("akses_modul")
    .select("pengguna_id")
    .eq("modul", "humas");

  const idPengurus = new Set((pengurus ?? []).map((a) => a.pengguna_id as number));

  const NAMA_HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  const ekorJadwal =
    (tertunda ?? []).length === 0
      ? ""
      : `\n<b>Jadwal dokter yang belum diubah di situs (${tertunda!.length})</b>\n` +
        tertunda!
          .map((t) => {
            const hari = t.hari ? NAMA_HARI[t.hari as number] : "";
            const ke =
              t.aksi === "hapus"
                ? `${t.jam_lama ?? ""} dihapus`
                : t.aksi === "tambah"
                  ? `${t.jam_baru ?? ""} ditambah`
                  : t.aksi === "ubah"
                    ? `${t.jam_lama ?? "?"} jadi ${t.jam_baru ?? "?"}`
                    : "perlu diperiksa sendiri";
            return `• ${t.dokter_nama} — ${hari} ${ke}`.replace(/\s+/g, " ").trim();
          })
          .join("\n") +
        "\n\nSesudah diubah, balas /cek di bot Humas.\n";

  for (const p of orang ?? []) {
    if (!p.telegram_chat_id) continue;

    const miliknya = semua.filter((t) => t.untuk === p.id);
    const kirim = await kirimTelegram(
      p.telegram_chat_id,
      susunPengingat(p.nama, miliknya, kini) +
        (idPengurus.has(p.id) ? ekorJadwal : ""),
    );

    hasil.push(
      kirim.ok
        ? { nama: p.nama, terkirim: true }
        : { nama: p.nama, terkirim: false, pesan: kirim.pesan },
    );
  }

  return NextResponse.json({ tanggal: kini, jumlah: hasil.length, hasil });
}
