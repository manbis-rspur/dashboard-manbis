import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aman, kirimTelegram } from "@/lib/telegram";
import { bacaTugasDariTeks } from "@/lib/ai-tugas";
import { hariIni, sebutHari, sebutTanggalBulan, sebutTenggat, BERULANG } from "@/lib/tugas";
import { simpanTugas } from "@/lib/tugas-simpan";

/**
 * Menerima pesan yang dikirim ke bot Telegram, lalu menjadikannya
 * tugas.
 *
 * Instruksi mendadak dari atasan datang lewat WhatsApp, sering di
 * luar jam kerja. Menyalinnya ke chat bot adalah satu langkah;
 * membuka peramban, masuk, mencari menu, mengisi formulir, dan
 * menyimpan adalah lima. Di lima langkah itulah pekerjaan hilang.
 *
 * Telegram yang memanggil alamat ini begitu ada pesan masuk — kita
 * tidak memeriksa berkala. Jadi datangnya seketika dan tidak
 * memakan jatah penjadwal, yang di Vercel memang sudah habis
 * terpakai pengingat pagi dan sore.
 *
 * Dua lapis penjaga:
 *   1. Kunci rahasia yang hanya diketahui Telegram dan peladen ini.
 *   2. Nomor percakapan harus sudah terdaftar pada seorang
 *      pengguna. Tugasnya dibuat UNTUK pemilik nomor itu, tidak
 *      pernah untuk orang lain — jadi tugas tidak mungkin nyasar.
 */

const ALAMAT_SITUS =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://dashboard-manbis.vercel.app");

/** Sejauh mana ke belakang /batal boleh menjangkau. */
const BATAS_BATAL_JAM = 24;

type Pesan = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { first_name?: string };
  };
};

async function balas(chatId: string, teks: string) {
  await kirimTelegram(chatId, teks);
}

function bantuan(): string {
  return [
    "<b>Cara memakai</b>",
    "",
    "Kirim saja instruksinya apa adanya — boleh disalin langsung dari WhatsApp. Contoh:",
    "<i>Bu Nanda minta banner hero website diganti buat Hari Kesehatan, paling lambat Jumat</i>",
    "",
    "Saya rapikan jadi tugas, lengkap dengan tenggatnya, lalu masuk ke daftar tugas Anda.",
    "",
    "/batal — membatalkan tugas terakhir yang saya buat",
    "/bantuan — pesan ini",
  ].join("\n");
}

export async function POST(permintaan: Request) {
  const rahasia = process.env.TELEGRAM_WEBHOOK_SECRET;

  // Tanpa kunci, alamat ini terbuka untuk siapa saja yang
  // menemukannya. Lebih baik diam sama sekali.
  if (!rahasia) return NextResponse.json({ ok: true });

  if (permintaan.headers.get("x-telegram-bot-api-secret-token") !== rahasia) {
    return new NextResponse("Tidak berhak.", { status: 401 });
  }

  let isi: Pesan;
  try {
    isi = (await permintaan.json()) as Pesan;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = isi.message?.chat?.id;
  const teks = (isi.message?.text ?? "").trim();

  // Bukan pesan tulisan — stiker, foto, orang masuk grup. Diabaikan
  // tanpa suara.
  if (chatId === undefined || teks === "") return NextResponse.json({ ok: true });

  const chat = String(chatId);
  const db = createAdminClient();

  const { data: pengguna } = await db
    .from("pengguna")
    .select("id, nama")
    .eq("telegram_chat_id", chat)
    .maybeSingle();

  // Belum tersambung. Nomornya disebutkan supaya tinggal ditempel
  // di halaman Profil — sebelumnya nomor ini harus dicari sendiri
  // lewat bot pihak ketiga.
  if (!pengguna) {
    await balas(
      chat,
      [
        "Nomor percakapan ini belum tersambung ke Dashboard Manajemen Bisnis.",
        "",
        `Nomor percakapan Anda: <b>${chat}</b>`,
        "",
        `Buka ${ALAMAT_SITUS}/profil, tempelkan nomor itu, lalu tekan Sambungkan.`,
      ].join("\n"),
    );
    return NextResponse.json({ ok: true });
  }

  const perintah = teks.toLowerCase().split(/[\s@]/)[0];

  if (perintah === "/start") {
    await balas(
      chat,
      [
        `Halo ${aman(pengguna.nama.split(",")[0])}. Telegram Anda sudah tersambung.`,
        "",
        bantuan(),
      ].join("\n"),
    );
    return NextResponse.json({ ok: true });
  }

  if (perintah === "/bantuan" || perintah === "/help") {
    await balas(chat, bantuan());
    return NextResponse.json({ ok: true });
  }

  if (perintah === "/batal") {
    const batas = new Date(Date.now() - BATAS_BATAL_JAM * 3600_000).toISOString();

    // Yang boleh dibatalkan hanya tugas yang memang dibuat bot ini,
    // bukan yang diketik sendiri di web atau dititipkan Koordinator.
    const { data: terakhir } = await db
      .from("tugas")
      .select("id, judul")
      .eq("untuk", pengguna.id)
      .eq("sumber", "telegram")
      .gte("dibuat_pada", batas)
      .order("dibuat_pada", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!terakhir) {
      await balas(chat, "Tidak ada tugas dari sini yang bisa dibatalkan.");
      return NextResponse.json({ ok: true });
    }

    await db.from("tugas").delete().eq("id", terakhir.id);
    await balas(chat, `Dibatalkan: ${aman(terakhir.judul)}`);
    return NextResponse.json({ ok: true });
  }

  // Perintah lain yang belum dikenal — jangan dijadikan tugas,
  // karena "/selesai" yang salah ketik bukan pekerjaan.
  if (perintah.startsWith("/")) {
    await balas(chat, `Perintah ${aman(perintah)} belum ada.\n\n${bantuan()}`);
    return NextResponse.json({ ok: true });
  }

  const kini = hariIni();
  const baca = await bacaTugasDariTeks(teks, kini);

  const simpan = await simpanTugas(
    db,
    {
      untuk: pengguna.id,
      dibuat_oleh: pengguna.id,
      judul: baca.judul,
      keterangan: baca.keterangan,
      tanggal_mulai: kini,
      tenggat: baca.tenggat,
      jenis: baca.jenis,
      hari: baca.hari,
      tanggal_bulan: baca.tanggal_bulan,
      prioritas: baca.prioritas,
    },
    { sumber: "telegram", dadakan: true },
  );

  if (simpan.pesan) {
    await balas(
      chat,
      `Gagal disimpan: ${aman(simpan.pesan)}\n\nCoba lagi, atau tulis langsung di ${ALAMAT_SITUS}/tugas`,
    );
    return NextResponse.json({ ok: true });
  }

  const baris = [
    "✅ <b>Tersimpan</b>",
    "",
    aman(baca.judul),
    `${aman(baca.jenis)} · ${
      baca.jenis === BERULANG
        ? `<b>${aman(sebutHari(baca.hari) || sebutTanggalBulan(baca.tanggal_bulan) || "belum ada irama")}</b>`
        : baca.tenggat
          ? `Tenggat <b>${aman(sebutTenggat(baca.tenggat, kini))}</b>`
          : "tanpa tenggat"
    }${baca.prioritas === "Tinggi" ? " · Prioritas tinggi" : ""}`,
    "",
  ];

  if (baca.catatan) baris.push(`⚠️ ${aman(baca.catatan)}`, "");

  baris.push(
    `Betulkan: ${ALAMAT_SITUS}/tugas`,
    "Bukan tugas? Kirim /batal",
  );

  await balas(chat, baris.join("\n"));
  return NextResponse.json({ ok: true });
}
