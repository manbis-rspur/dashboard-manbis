import "server-only";
import { aman } from "@/lib/telegram";
import {
  BERULANG,
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

  // Tugas berulang punya pesannya sendiri di sore hari. Dicampur ke
  // sini, ia muncul dua kali sehari untuk pekerjaan yang sebenarnya
  // dikerjakan sekali — dan yang diulang-ulang cepat diabaikan.
  const sekali = terbuka.filter((t) => t.jenis !== BERULANG);

  const lewat = sekali.filter((t) => tingkatDesakan(t, kini) === "lewat");
  const hariIni = sekali.filter((t) => tingkatDesakan(t, kini) === "hari-ini");
  const sudahDisebut = new Set([...lewat, ...hariIni].map((t) => t.id));

  const belum = sekali.filter(
    (t) => !sudahDisebut.has(t.id) && t.status === "Belum",
  );
  const sedang = sekali.filter(
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


/**
 * Menyusun pengingat sore: ajakan menutup hari.
 *
 * Mengembalikan null kalau memang tidak ada yang perlu ditutup.
 * Pengingat yang tetap datang walaupun tidak ada kerjaan melatih
 * orang mengabaikannya — dan begitu terbiasa diabaikan, ia juga akan
 * terlewat pada hari yang benar-benar penting.
 *
 * Isinya sengaja berbeda dari pesan pagi. Pagi menjawab "hari ini
 * saya harus apa"; sore menjawab "apa yang belum saya tandai".
 * Kalau keduanya sama, yang sore cuma jadi salinan yang tidak
 * dibaca.
 */
export function susunTutupHari(
  nama: string,
  semua: Tugas[],
  kini = hitungHariIni(),
): string | null {
  const terbuka = semua.filter((t) => MASIH_TERBUKA.includes(t.status));

  const perluDitutup = terbuka.filter((t) => {
    if (t.jenis === BERULANG) return false;
    const desakan = tingkatDesakan(t, kini);
    return desakan === "lewat" || desakan === "hari-ini";
  });

  if (perluDitutup.length === 0) return null;

  const belumDisentuh = perluDitutup.filter((t) => t.status === "Belum");
  const sedang = perluDitutup.filter((t) => t.status !== "Belum");

  const sebut = (t: Tugas) =>
    `${aman(t.judul)} — <i>${aman(
      jatuhHariIni(t, kini) ? sebutIrama(t) || "berulang" : sebutTenggat(t.tenggat, kini),
    )}</i>`;

  return (
    `<b>Sebelum pulang, ${aman(nama.split(",")[0])}.</b>\n` +
    `Ada ${perluDitutup.length} pekerjaan hari ini yang belum ditandai.\n` +
    daftar("Belum tersentuh", belumDisentuh.map(sebut)) +
    daftar("Sedang dikerjakan", sedang.map(sebut)) +
    `\nBuka <b>Tugas Saya</b> di dashboard Manajemen Bisnis, lalu tekan ` +
    `<b>Tutup hari</b> — beri status dan catatan singkat tiap baris sekaligus.\n` +
    `\nYang belum selesai tidak hilang; besok masih di daftar, dan yang lewat ` +
    `tenggat naik ke paling atas.`
  );
}


/**
 * Gelembung tersendiri untuk tugas berulang yang jatuh hari ini.
 *
 * Dipisah dari pesan lain atas permintaan yang memakainya, dan
 * alasannya masuk akal: pekerjaan rutin seperti memperbarui jadwal
 * dokter dikerjakan menjelang pulang, bukan direncanakan pagi-pagi.
 * Ditumpuk bersama daftar tugas lain, ia tenggelam di antara hal
 * yang tidak berhubungan.
 *
 * Mengembalikan null kalau hari ini memang bukan harinya, atau
 * semuanya sudah ditandai.
 */
export function susunBerulang(
  nama: string,
  semua: Tugas[],
  kini = hitungHariIni(),
): string | null {
  const jatuh = semua.filter((t) => jatuhHariIni(t, kini));
  if (jatuh.length === 0) return null;

  const baris = jatuh
    .map((t) => {
      const catatan = t.keterangan ? `\n   <i>${aman(t.keterangan.split("\n")[0])}</i>` : "";
      return `${aman(t.judul)}${catatan}`;
    })
    .map((b) => `• ${b}`)
    .join("\n");

  return (
    `<b>Pekerjaan rutin hari ini</b>\n` +
    `${aman(nama.split(",")[0])}, ${jatuh.length === 1 ? "ada satu" : `ada ${jatuh.length}`} ` +
    `yang jatuh hari ini:\n\n` +
    baris +
    `\n\nSesudah dikerjakan, tekan <b>Sudah hari ini</b> di daftar tugas — ` +
    `besok ia menunggu lagi.`
  );
}
