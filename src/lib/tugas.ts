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
  /** 'Tugas' punya garis selesai; 'Berjalan' tidak. */
  jenis: string;
  /** Hari kerja tugas berulang, 1 Senin sampai 7 Minggu. */
  hari: number[] | null;
  /** Tanggal terakhir tugas berulang ditandai sudah dikerjakan. */
  terakhir_dikerjakan: string | null;
};

export const PRIORITAS = ["Rendah", "Sedang", "Tinggi"] as const;

export const SEKALI = "Sekali Jalan";
export const BERULANG = "Berulang";

export const JENIS = [SEKALI, BERULANG] as const;

/** Keterangan singkat tiap tipe, dipakai di formulir. */
export const JENIS_KETERANGAN: Record<string, string> = {
  [SEKALI]: "Dikerjakan sampai selesai, lalu turun ke rekap",
  [BERULANG]: "Kembali lagi tiap hari yang dipilih",
};

/**
 * Memisahkan pekerjaan yang punya garis selesai dari peran yang
 * berjalan terus.
 *
 * Keduanya perlu tercatat — yang tidak tercatat akan terlupa — tapi
 * hanya yang pertama yang pantas muncul di daftar harian. Daftar
 * yang selalu penuh oleh hal yang sama cepat berhenti dibaca, dan
 * yang benar-benar mendesak ikut tenggelam bersamanya.
 */
export function pisahJenis(daftar: Tugas[]) {
  return {
    tugas: daftar.filter((t) => t.jenis !== BERULANG),
    berjalan: daftar.filter((t) => t.jenis === BERULANG),
  };
}

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


/** Nama hari menurut nomor ISO: 1 Senin sampai 7 Minggu. */
export const HARI_PILIHAN = [
  { n: 1, label: "Senin", singkat: "Sen" },
  { n: 2, label: "Selasa", singkat: "Sel" },
  { n: 3, label: "Rabu", singkat: "Rab" },
  { n: 4, label: "Kamis", singkat: "Kam" },
  { n: 5, label: "Jumat", singkat: "Jum" },
  { n: 6, label: "Sabtu", singkat: "Sab" },
  { n: 7, label: "Minggu", singkat: "Min" },
] as const;

/** Nomor hari ISO untuk sebuah tanggal YYYY-MM-DD. */
export function nomorHari(tanggal: string): number {
  const d = new Date(`${tanggal}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/**
 * Apakah tugas berulang ini jatuh hari ini dan belum ditandai.
 *
 * Penanda "sudah dikerjakan" berupa tanggal, bukan status. Tugas
 * berulang tidak berubah jadi selesai tiap hari — ia cuma sudah
 * dikerjakan untuk hari ini, dan besok menunggu lagi. Menyimpannya
 * sebagai tanggal membuat satu baris cukup untuk selamanya; kalau
 * tiap hari dibuatkan barisnya sendiri, setahun saja sudah ratusan
 * baris yang tidak pernah dibaca siapa pun.
 */
export function jatuhHariIni(t: Tugas, kini = hariIni()): boolean {
  if (t.jenis !== BERULANG) return false;
  // Yang sudah ditandai selesai atau batal berhenti berulang.
  // Pekerjaan rutin pun suatu saat berpindah tangan, dan sejak saat
  // itu tidak pantas lagi menagih tiap pagi.
  if (!MASIH_TERBUKA.includes(t.status)) return false;
  if (!t.hari || t.hari.length === 0) return false;
  if (!t.hari.includes(nomorHari(kini))) return false;
  return t.terakhir_dikerjakan !== kini;
}

/** Menyebut hari kerja dengan ringkas: "Sen–Jum · Min". */
export function sebutHari(hari: number[] | null): string {
  if (!hari || hari.length === 0) return "";

  const urut = [...new Set(hari)].sort((a, b) => a - b);
  const nama = (n: number) =>
    HARI_PILIHAN.find((h) => h.n === n)?.singkat ?? String(n);

  const potongan: string[] = [];
  let mulai = urut[0];
  let akhir = urut[0];

  for (const n of urut.slice(1)) {
    if (n === akhir + 1) {
      akhir = n;
      continue;
    }
    potongan.push(mulai === akhir ? nama(mulai) : `${nama(mulai)}–${nama(akhir)}`);
    mulai = n;
    akhir = n;
  }
  potongan.push(mulai === akhir ? nama(mulai) : `${nama(mulai)}–${nama(akhir)}`);

  return potongan.join(" · ");
}
