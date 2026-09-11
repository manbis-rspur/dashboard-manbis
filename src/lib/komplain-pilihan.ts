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
export function gabungKategori(pilihan: string[]): string {
  const bersih = pilihan.map((k) => k.trim()).filter((k) => k !== "");
  return [...new Set(bersih)].join(", ");
}

export function pecahKategori(nilai: string | null | undefined): string[] {
  return (nilai ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k !== "");
}
