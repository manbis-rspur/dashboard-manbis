import "server-only";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createAdminClient } from "@/lib/supabase/admin";

/** Tempat template resmi disimpan di wadah 'dokumen'. */
export const JALUR_TEMPLATE = "komplain/template.docx";

const zonaWaktu = "Asia/Jakarta";

const tanggalDMY = new Intl.DateTimeFormat("id-ID", {
  timeZone: zonaWaktu,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const jamHM = new Intl.DateTimeFormat("id-ID", {
  timeZone: zonaWaktu,
  hour: "2-digit",
  minute: "2-digit",
});

/** Kotak centang seperti pada formulir cetak. */
function centang(benar: boolean) {
  return benar ? "☒" : "☐";
}

function samaDengan(nilai: string | null, dibandingkan: string) {
  return (nilai ?? "").trim().toLowerCase() === dibandingkan.toLowerCase();
}

type BarisKomplain = Record<string, unknown>;

/**
 * Mengisi formulir resmi RSPUR dari satu komplain.
 *
 * Nama penanda pada template — <<NamaPelapor>>, <<Kat_Medis>>, dan
 * seterusnya — diambil persis dari sistem E-Komplain yang lama,
 * sehingga berkas templatenya bisa dipakai apa adanya tanpa diedit.
 *
 * Penanda yang ada di template tapi tidak dikenali di sini akan
 * dikosongkan, bukan membuat seluruh proses gagal.
 */
export async function isiFormulirKomplain(k: BarisKomplain): Promise<Buffer> {
  const db = createAdminClient();
  const { data, error } = await db.storage.from("dokumen").download(JALUR_TEMPLATE);

  if (error || !data) {
    throw new Error(
      "Template formulir resmi belum diunggah. Buka Pengaturan → Template Dokumen.",
    );
  }

  const zip = new PizZip(Buffer.from(await data.arrayBuffer()));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "<<", end: ">>" },
    nullGetter: () => "",
  });

  const teks = (nama: string) => {
    const nilai = k[nama];
    return nilai === null || nilai === undefined || String(nilai).trim() === ""
      ? "-"
      : String(nilai);
  };

  const lapor = k.waktu_pelaporan ? new Date(String(k.waktu_pelaporan)) : null;
  const tanggap = k.waktu_ditanggapi ? new Date(String(k.waktu_ditanggapi)) : null;
  const komite = k.tgl_lapor_komite ? new Date(String(k.tgl_lapor_komite)) : null;

  const kategori = (k.kategori_masalah as string | null) ?? "";
  const sumber = (k.sumber_pelaporan as string | null) ?? "";
  const grading = (k.grading as string | null) ?? "";
  const hasil = (k.hasil_penyelesaian as string | null) ?? "";
  const kepuasan = (k.kepuasan_penanganan as string | null) ?? "";
  const eskalasi = k.perlu_eskalasi === true;
  const jenisKomite = (k.jenis_komite as string | null) ?? "";

  doc.render({
    NoKomplain: teks("kode"),

    NamaPelapor: teks("pelapor_nama"),
    AlamatPelapor: teks("pelapor_alamat"),
    NoHpPelapor: teks("pelapor_hp"),

    Kat_Medis: centang(samaDengan(kategori, "Medis")),
    Kat_Keperawatan: centang(samaDengan(kategori, "Keperawatan")),
    Kat_Administrasi: centang(samaDengan(kategori, "Administrasi")),
    Kat_Fasilitas: centang(samaDengan(kategori, "Fasilitas")),
    Kat_Pelayanan: centang(samaDengan(kategori, "Pelayanan")),
    Kat_Lainnya: centang(samaDengan(kategori, "Lainnya")),

    NamaPasien: teks("pasien_nama"),
    TglLahir: k.pasien_tgl_lahir
      ? tanggalDMY.format(new Date(String(k.pasien_tgl_lahir)))
      : "-",
    NoRM: teks("pasien_no_rm"),
    AlamatPasien: teks("pasien_alamat"),
    NoHpPasien: teks("pasien_hp"),

    Sum_Pasien: centang(samaDengan(sumber, "Pasien")),
    Sum_Keluarga: centang(samaDengan(sumber, "Keluarga Pasien")),
    Sum_Sejawat: centang(samaDengan(sumber, "Sejawat")),
    Sum_Paramedis: centang(samaDengan(sumber, "Paramedis")),
    Sum_Pengunjung: centang(samaDengan(sumber, "Pengunjung")),

    NamaPenerima: teks("penerima_nama"),
    UnitKerja: teks("penerima_unit"),
    Jabatan: teks("penerima_jabatan"),

    TglLapor: lapor ? tanggalDMY.format(lapor) : "-",
    JamLapor: lapor ? jamHM.format(lapor) : "-",
    TglTanggap: tanggap ? tanggalDMY.format(tanggap) : "-",
    JamTanggap: tanggap ? jamHM.format(tanggap) : "-",

    Masalah: teks("detail_masalah"),
    G_Hijau: centang(samaDengan(grading, "Hijau")),
    G_Kuning: centang(samaDengan(grading, "Kuning")),
    G_Merah: centang(samaDengan(grading, "Merah")),
    Jawaban: teks("jawaban"),

    Hasil_Teratasi: centang(samaDengan(hasil, "Teratasi")),
    Hasil_Belum: centang(samaDengan(hasil, "Belum teratasi")),
    Hasil_Komite: centang(hasil.toLowerCase().includes("komite")),

    Kepuasan_SangatPuas: centang(samaDengan(kepuasan, "Sangat Puas")),
    Kepuasan_Puas: centang(samaDengan(kepuasan, "Puas")),
    Kepuasan_TidakPuas: centang(samaDengan(kepuasan, "Tidak Puas")),

    // Bagian eskalasi. Pada template lama bagian ini belum memakai
    // penanda, sehingga sistem sebelumnya menimpa teksnya langsung.
    // Penanda di bawah disediakan supaya bisa dipakai begitu
    // ditambahkan ke template; kalau belum ada, tidak berpengaruh.
    Esk_Medik: centang(eskalasi && samaDengan(jenisKomite, "Komite Medik")),
    Esk_Keperawatan: centang(eskalasi && samaDengan(jenisKomite, "Komite Keperawatan")),
    Esk_ProfesiLain: centang(eskalasi && samaDengan(jenisKomite, "Komite Profesi Lain")),
    Esk_Etik: centang(eskalasi && samaDengan(jenisKomite, "Komplain Kasus Etik")),
    Esk_Hukum: centang(eskalasi && samaDengan(jenisKomite, "Komplain Kasus Hukum")),
    Esk_Administrasi: centang(
      eskalasi && samaDengan(jenisKomite, "Komplain Masalah Administrasi"),
    ),
    TglKomite: komite ? tanggalDMY.format(komite) : "-",
  });

  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}
