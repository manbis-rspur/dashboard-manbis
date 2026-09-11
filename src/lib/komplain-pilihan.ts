/**
 * Pilihan pada formulir komplain.
 *
 * Diambil persis dari sistem E-Komplain yang lama, supaya petugas
 * tidak perlu belajar ulang dan data lama tetap sebanding kalau
 * suatu saat dibandingkan.
 */

export const JALUR = ["Langsung", "Tidak Langsung"] as const;

export const MEDIA = [
  "Complain Center",
  "Kotak Saran",
  "Telepon/WA",
  "Sehatbot RSPUR",
  "Media Sosial",
  "Lainnya",
] as const;

export const KATEGORI = [
  "Medis",
  "Keperawatan",
  "Administrasi",
  "Fasilitas",
  "Pelayanan",
  "Lainnya",
] as const;

export const SUMBER = [
  "Pasien",
  "Keluarga Pasien",
  "Sejawat",
  "Paramedis",
  "Pengunjung",
  "Lainnya",
] as const;

export const KEPUASAN = ["Sangat Puas", "Puas", "Tidak Puas"] as const;

export const HASIL = [
  "Teratasi",
  "Belum teratasi",
  "Dilaporkan Komite Etik RS",
] as const;

export const STATUS = ["Baru", "Diproses", "Selesai"] as const;

export const GRADING = ["Hijau", "Kuning", "Merah"] as const;

export const KOMITE = [
  "Komite Medik",
  "Komite Keperawatan",
  "Komite Profesi Lain",
  "Komplain Kasus Etik",
  "Komplain Kasus Hukum",
  "Komplain Masalah Administrasi",
] as const;

/** Ambang tanggapan yang dipakai untuk menilai SLA. */
export const SLA_JAM = 24;


/**
 * Kategori masalah boleh lebih dari satu.
 *
 * Disimpan tetap sebagai satu tulisan yang dipisah koma, bukan
 * kolom larik tersendiri. Alasannya bukan malas: kolomnya sudah
 * berisi ratusan komplain lama yang bernilai tunggal, dan bentuk
 * ini membacanya apa adanya — satu kategori lama terbaca sebagai
 * daftar berisi satu. Tidak ada yang perlu dipindahkan, tidak ada
 * yang bisa tertinggal setengah jalan.
 *
 * Kedua fungsi ini satu-satunya tempat aturannya ditulis, supaya
 * yang menyimpan dan yang membaca tidak pernah berbeda tafsir.
 */
/** Nama pilihan terakhir pada daftar kategori. */
export const LAINNYA = "Lainnya";

/** Penanda antara "Lainnya" dan keterangan yang diketik sendiri. */
const PEMISAH_LAIN = ": ";

/**
 * Menggabung kategori terpilih jadi satu tulisan.
 *
 * "Lainnya" yang disertai keterangan disimpan sebagai
 * "Lainnya: parkir penuh" — bukan keterangannya saja. Dengan begitu
 * dua hal terjaga sekaligus: keterangannya tidak hilang, dan seluruh
 * komplain semacam itu tetap bisa dihitung sebagai satu kelompok di
 * rekap. Kalau yang disimpan hanya keterangannya, rekap bulanan
 * berisi puluhan kategori sekali-pakai yang tidak bisa dibandingkan
 * dari bulan ke bulan.
 */
export function gabungKategori(pilihan: string[], keteranganLain = ""): string {
  // Koma adalah pemisah antar kategori, jadi tidak boleh ada di dalam
  // keterangan — kalau dibiarkan, "parkir penuh, satpam kasar"
  // terbaca sebagai dua kategori dan yang kedua kehilangan
  // penanda "Lainnya". Diganti titik koma, bukan dibuang, supaya
  // yang ditulis petugas tetap utuh terbaca.
  const lain = keteranganLain.replace(/,/g, ";").replace(/\s+/g, " ").trim();

  const bersih = pilihan
    .map((k) => k.trim())
    .filter((k) => k !== "")
    .map((k) => (k === LAINNYA && lain !== "" ? `${LAINNYA}${PEMISAH_LAIN}${lain}` : k));

  return [...new Set(bersih)].join(", ");
}

/**
 * Nama pokok sebuah kategori — dipakai saat menghitung.
 *
 * "Lainnya: parkir penuh" dihitung sebagai "Lainnya".
 */
export function pokokKategori(nilai: string): string {
  return nilai.startsWith(`${LAINNYA}${PEMISAH_LAIN}`) ? LAINNYA : nilai;
}

/**
 * Tulisan yang ditampilkan — dipakai saat membaca.
 *
 * "Lainnya: parkir penuh" ditampilkan sebagai "parkir penuh", karena
 * di layar dan di formulir cetak yang berguna keterangannya, bukan
 * kata "Lainnya" yang tidak menjelaskan apa pun.
 */
export function labelKategori(nilai: string): string {
  return nilai.startsWith(`${LAINNYA}${PEMISAH_LAIN}`)
    ? nilai.slice(LAINNYA.length + PEMISAH_LAIN.length)
    : nilai;
}

export function pecahKategori(nilai: string | null | undefined): string[] {
  return (nilai ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k !== "");
}
