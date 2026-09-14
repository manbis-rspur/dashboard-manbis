import "server-only";
import { aman } from "@/lib/telegram";
import {
  MASIH_TERBUKA,
  geser,
  hariIni as hitungHariIni,
  jatuhHariIni,
  sebutIrama,
  sebutTenggat,
  tingkatDesakan,
  type Tugas,
} from "@/lib/tugas";

/**
 * Menyusun pesan pengingat pagi.
 *
 * Isinya persis tiga pertanyaan yang ditanyakan orang tiap pagi:
 * apa yang kemarin selesai, apa yang belum tersentuh, dan apa yang
 * sedang digarap. Yang lewat tenggat diangkat ke paling atas,
 * karena itulah satu-satunya bagian yang tidak boleh dilewati mata.
 *
 * Disusun di sini, bukan di rute pengirimnya, supaya bisa diuji
 * sendiri dan supaya tombol "kirim uji" di halaman profil membaca
 * pesan yang sama persis dengan yang dikirim tiap pagi.
 */

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Berapa banyak tugas yang disebut per kelompok sebelum diringkas. */
const BATAS = 8;

function daftar(judul: string, baris: string[]): string {
  if (baris.length === 0) return "";

  const tampil = baris.slice(0, BATAS);
  const sisa = baris.length - tampil.length;

  return (
    `\n<b>${aman(judul)} (${baris.length})</b>\n` +
    tampil.map((b) => `• ${b}`).join("\n") +
    (sisa > 0 ? `\n… dan ${sisa} lagi` : "") +
    "\n"
  );
}

export function susunPengingat(
  nama: string,
  semua: Tugas[],
  kini = hitungHariIni(),
): string {
  const kemarin = geser(kini, -1);
  const terbuka = semua.filter((t) => MASIH_TERBUKA.includes(t.status));

  const lewat = terbuka.filter((t) => tingkatDesakan(t, kini) === "lewat");
  const hariIni = terbuka.filter((t) => tingkatDesakan(t, kini) === "hari-ini");
  const sudahDisebut = new Set([...lewat, ...hariIni].map((t) => t.id));

  const belum = terbuka.filter(
    (t) => !sudahDisebut.has(t.id) && t.status === "Belum",
  );
  const sedang = terbuka.filter(
    (t) => !sudahDisebut.has(t.id) && t.status !== "Belum",
  );

  const selesaiKemarin = semua.filter(
    (t) => t.status === "Selesai" && (t.selesai_pada ?? "").slice(0, 10) === kemarin,
  );

  const sebut = (t: Tugas) =>
    `${aman(t.judul)} — <i>${aman(
      jatuhHariIni(t, kini) ? sebutIrama(t) || "berulang" : sebutTenggat(t.tenggat, kini),
    )}</i>`;

  const isi =
    daftar("Lewat tenggat", lewat.map(sebut)) +
    daftar("Jatuh hari ini", hariIni.map(sebut)) +
    daftar("Belum dikerjakan", belum.map(sebut)) +
    daftar("Sedang dikerjakan", sedang.map(sebut)) +
    daftar("Selesai kemarin", selesaiKemarin.map((t) => aman(t.judul)));

  const kepala =
    `<b>Selamat pagi, ${aman(nama.split(",")[0])}.</b>\n` +
    `${aman(tanggalPanjang.format(new Date(`${kini}T03:00:00Z`)))}\n`;

  if (isi.trim() === "") {
    return (
      kepala +
      "\nTidak ada tugas yang menunggu hari ini, dan tidak ada yang lewat tenggat.\n" +
      "\nKalau ada yang mengganjal pikiran, tulis sekarang selagi ingat."
    );
  }

  return `${kepala}${isi}\nBuka daftar lengkapnya di dashboard Manajemen Bisnis.`;
}
