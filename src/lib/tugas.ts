/**
 * Aturan main daftar tugas.
 *
 * Pengelompokan ditulis di sini, bukan di halamannya, supaya panel
 * di Beranda dan halaman Tugas Saya tidak pernah berbeda pendapat
 * tentang apa yang disebut "hari ini".
 */

export type Tugas = {
  id: number;
  untuk: number;
  judul: string;
  keterangan: string | null;
  tanggal_mulai: string;
  tenggat: string | null;
  prioritas: string;
  status: string;
  catatan_hasil: string | null;
  selesai_pada: string | null;
};

export const PRIORITAS = ["Rendah", "Sedang", "Tinggi"] as const;

export const STATUS = ["Belum", "Dikerjakan", "Selesai", "Ditunda", "Batal"] as const;

/** Status yang berarti pekerjaannya masih menunggu dikerjakan. */
export const MASIH_TERBUKA = ["Belum", "Dikerjakan", "Ditunda"];

export type Kelompok = "lewat" | "hari-ini" | "minggu-ini" | "nanti";

/** Tanggal hari ini menurut WIB, dalam bentuk YYYY-MM-DD. */
export function hariIni(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Menambah sekian hari pada tanggal YYYY-MM-DD. */
export function geser(tanggal: string, hari: number): string {
  const d = new Date(`${tanggal}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

/**
 * Menentukan sebuah tugas masuk kelompok yang mana.
 *
 * Tugas tanpa tenggat tidak dibiarkan mengambang: begitu tanggal
 * mulainya tiba, ia dianggap sedang berjalan dan ikut muncul hari
 * ini. Kalau tidak, tugas tanpa tenggat tidak pernah terlihat sampai
 * seseorang sengaja mencarinya — persis nasib yang mau dihindari.
 */
export function kelompokTugas(t: Tugas, kini = hariIni()): Kelompok {
  if (t.tenggat && t.tenggat < kini) return "lewat";
  if (t.tenggat === kini) return "hari-ini";
  if (!t.tenggat) return t.tanggal_mulai <= kini ? "hari-ini" : "nanti";
  return t.tenggat <= geser(kini, 7) ? "minggu-ini" : "nanti";
}

/** Berapa hari lewat tenggat. Dipakai untuk menyebut keterlambatan. */
export function selisihHari(dari: string, sampai: string): number {
  const a = new Date(`${dari}T00:00:00Z`).getTime();
  const b = new Date(`${sampai}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Menyebut tenggat dengan bahasa yang biasa dipakai orang. */
export function sebutTenggat(tenggat: string | null, kini = hariIni()): string {
  if (!tenggat) return "tanpa tenggat";

  const beda = selisihHari(kini, tenggat);
  if (beda === 0) return "tenggat hari ini";
  if (beda === 1) return "tenggat besok";
  if (beda === -1) return "lewat 1 hari";
  if (beda < 0) return `lewat ${-beda} hari`;

  const tanggal = new Date(`${tenggat}T00:00:00Z`);
  const hari = HARI[tanggal.getUTCDay()];
  if (beda <= 6) return `tenggat ${hari}`;

  return `tenggat ${tanggal.toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  })}`;
}

export function warnaPrioritas(prioritas: string): string {
  if (prioritas === "Tinggi") return "border-merah text-merah";
  if (prioritas === "Rendah") return "border-garis text-tinta-3";
  return "border-garis text-tinta-2";
}

export function warnaStatus(status: string): string {
  if (status === "Selesai") return "bg-hijau-muda text-hijau";
  if (status === "Dikerjakan") return "bg-[#dce4ec] text-[#2f4e6b]";
  if (status === "Ditunda") return "bg-[#f6efe2] text-oker";
  if (status === "Batal") return "bg-permukaan-2 text-tinta-3";
  return "bg-permukaan-2 text-tinta-2";
}
