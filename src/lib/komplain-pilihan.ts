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
