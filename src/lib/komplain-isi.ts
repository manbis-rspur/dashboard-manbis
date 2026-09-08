/**
 * Menyiapkan isi formulir komplain resmi.
 *
 * Dipakai bersama oleh dua keluaran — berkas Word dan halaman cetak
 * PDF — supaya keduanya tidak pernah berbeda isi. Kalau perhitungan
 * ini ditulis dua kali, cepat atau lambat yang satu akan tertinggal.
 *
 * Nama penandanya diambil langsung dari template resmi RSPUR:
 * <<Pelapor_Nama>>, <<Cek_Hijau>>, dan seterusnya.
 */

const zonaWaktu = "Asia/Jakarta";

const tanggalJam = new Intl.DateTimeFormat("id-ID", {
  timeZone: zonaWaktu,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const tanggalSaja = new Intl.DateTimeFormat("id-ID", {
  timeZone: zonaWaktu,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export type BarisKomplain = Record<string, unknown>;

function teks(nilai: unknown) {
  return nilai === null || nilai === undefined || String(nilai).trim() === ""
    ? "-"
    : String(nilai);
}

function centang(benar: boolean) {
  return benar ? "☒" : "☐";
}

export type IsiFormulir = Record<string, string>;

export function susunIsiFormulir(k: BarisKomplain): IsiFormulir {
  const lapor = k.waktu_pelaporan ? new Date(String(k.waktu_pelaporan)) : null;
  const tanggap = k.waktu_ditanggapi ? new Date(String(k.waktu_ditanggapi)) : null;
  const komite = k.tgl_lapor_komite ? new Date(String(k.tgl_lapor_komite)) : null;

  const grading = String(k.grading ?? "");
  const eskalasi = k.perlu_eskalasi === true;

  return {
    Pelapor_Nama: teks(k.pelapor_nama),
    Pelapor_Alamat: teks(k.pelapor_alamat),
    Pelapor_NoHp: teks(k.pelapor_hp),

    Kategori_Masalah: teks(k.kategori_masalah),

    Pasien_Nama: teks(k.pasien_nama),
    Pasien_TglLahir: k.pasien_tgl_lahir
      ? tanggalSaja.format(new Date(String(k.pasien_tgl_lahir)))
      : "-",
    Pasien_NoRM: teks(k.pasien_no_rm),
    Pasien_Alamat: teks(k.pasien_alamat),
    Pasien_NoHp: teks(k.pasien_hp),

    Sumber_Pelaporan: teks(k.sumber_pelaporan),

    Penerima_Nama: teks(k.penerima_nama),
    Penerima_Unit: teks(k.penerima_unit),
    Penerima_Jabatan: teks(k.penerima_jabatan),

    Waktu_Pelaporan: lapor ? tanggalJam.format(lapor) : "-",
    Waktu_Ditanggapi: tanggap ? tanggalJam.format(tanggap) : "-",

    Detail_Masalah: teks(k.detail_masalah),

    Cek_Hijau: centang(grading === "Hijau"),
    Cek_Kuning: centang(grading === "Kuning"),
    Cek_Merah: centang(grading === "Merah"),

    Jawaban_Komplain: teks(k.jawaban),
    Hasil_Penyelesaian: teks(k.hasil_penyelesaian),
    Tingkat_Kepuasan: teks(k.kepuasan_penanganan),

    // Bagian eskalasi hanya terisi bila komplainnya memang
    // diteruskan; kalau tidak, dibiarkan bergaris supaya jelas
    // bahwa memang tidak dipakai, bukan terlewat diisi.
    Jenis_Eskalasi: eskalasi ? teks(k.jenis_komite) : "-",
    Waktu_Eskalasi: eskalasi && komite ? tanggalSaja.format(komite) : "-",
    Eskalasi_Penerima_Nama: eskalasi ? teks(k.penerima_nama) : "-",
    Eskalasi_Penerima_Unit: eskalasi ? teks(k.penerima_unit) : "-",
    Eskalasi_Penerima_Jabatan: eskalasi ? teks(k.penerima_jabatan) : "-",
  };
}
