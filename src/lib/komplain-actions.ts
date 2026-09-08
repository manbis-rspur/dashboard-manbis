"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type HasilKomplain = { pesan: string | null; kode: string | null };
export const komplainAwal: HasilKomplain = { pesan: null, kode: null };

function isi(formData: FormData, nama: string) {
  return String(formData.get(nama) ?? "").trim();
}

function isiAtauNull(formData: FormData, nama: string) {
  const nilai = isi(formData, nama);
  return nilai === "" ? null : nilai;
}

/** Mencatat komplain baru. Nomornya diberikan database, bukan aplikasi. */
export async function catatKomplain(
  _s: HasilKomplain,
  formData: FormData,
): Promise<HasilKomplain> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", kode: null };

  const wajib: Record<string, string> = {
    pelapor_nama: "Nama pelapor",
    pelapor_hp: "No. HP pelapor",
    pasien_nama: "Nama pasien",
    jalur_pelaporan: "Jalur pelaporan",
    media_pelaporan: "Media pelaporan",
    kategori_masalah: "Kategori masalah",
    sumber_pelaporan: "Sumber pelaporan",
    detail_masalah: "Detail komplain",
  };

  for (const [kolom, sebutan] of Object.entries(wajib)) {
    if (!isi(formData, kolom)) return { pesan: `${sebutan} harus diisi.`, kode: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("komplain")
    .insert({
      pelapor_nama: isi(formData, "pelapor_nama"),
      pelapor_hp: isi(formData, "pelapor_hp"),
      pelapor_alamat: isiAtauNull(formData, "pelapor_alamat"),
      pasien_nama: isi(formData, "pasien_nama"),
      pasien_tgl_lahir: isiAtauNull(formData, "pasien_tgl_lahir"),
      pasien_no_rm: isiAtauNull(formData, "pasien_no_rm"),
      pasien_hp: isiAtauNull(formData, "pasien_hp"),
      pasien_alamat: isiAtauNull(formData, "pasien_alamat"),
      jalur_pelaporan: isi(formData, "jalur_pelaporan"),
      media_pelaporan: isi(formData, "media_pelaporan"),
      kategori_masalah: isi(formData, "kategori_masalah"),
      sumber_pelaporan: isi(formData, "sumber_pelaporan"),
      detail_masalah: isi(formData, "detail_masalah"),
      kepuasan_awal: isiAtauNull(formData, "kepuasan_awal"),
      dicatat_oleh: pengguna.id,
    })
    .select("id, kode")
    .single();

  if (error) return { pesan: `Komplain gagal dicatat: ${error.message}`, kode: null };

  await supabase.from("komplain_riwayat").insert({
    komplain_id: data.id,
    aktivitas: "Laporan diterima",
    detail: `Komplain masuk melalui ${isi(formData, "media_pelaporan")}`,
    oleh: pengguna.id,
  });

  revalidatePath("/komplain");
  return { pesan: null, kode: data.kode };
}

/**
 * Menyimpan tindak lanjut.
 *
 * Waktu ditanggapi diisi sekali saja, saat pertama kali
 * ditindaklanjuti — kalau ditimpa setiap kali disunting, angka SLA
 * akan ikut berubah dan tidak lagi mencerminkan kecepatan
 * tanggapan yang sebenarnya.
 */
export async function simpanTindakLanjut(
  _s: HasilKomplain,
  formData: FormData,
): Promise<HasilKomplain> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", kode: null };

  const id = Number(formData.get("id"));
  if (!id) return { pesan: "Komplain tidak dikenali.", kode: null };

  const supabase = await createClient();

  const { data: sebelum } = await supabase
    .from("komplain")
    .select("kode, waktu_ditanggapi, status")
    .eq("id", id)
    .maybeSingle();

  if (!sebelum) return { pesan: "Komplain tidak ditemukan.", kode: null };

  const pertamaKali = !sebelum.waktu_ditanggapi;
  const eskalasi = isi(formData, "perlu_eskalasi") === "Ya";
  const status = isi(formData, "status") || "Diproses";
  const grading = isiAtauNull(formData, "grading");

  const { error } = await supabase
    .from("komplain")
    .update({
      pasien_no_rm: isiAtauNull(formData, "pasien_no_rm"),
      penerima_nama: isiAtauNull(formData, "penerima_nama"),
      penerima_unit: isiAtauNull(formData, "penerima_unit"),
      penerima_jabatan: isiAtauNull(formData, "penerima_jabatan"),
      waktu_ditanggapi: sebelum.waktu_ditanggapi ?? new Date().toISOString(),
      jawaban: isiAtauNull(formData, "jawaban"),
      hasil_penyelesaian: isiAtauNull(formData, "hasil_penyelesaian"),
      status,
      grading,
      kepuasan_penanganan: isiAtauNull(formData, "kepuasan_penanganan"),
      evaluasi: isiAtauNull(formData, "evaluasi"),
      perlu_eskalasi: eskalasi,
      jenis_komite: eskalasi ? isiAtauNull(formData, "jenis_komite") : null,
      tgl_lapor_komite: eskalasi ? isiAtauNull(formData, "tgl_lapor_komite") : null,
    })
    .eq("id", id);

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, kode: null };

  await supabase.from("komplain_riwayat").insert({
    komplain_id: id,
    aktivitas: pertamaKali ? "Tindak lanjut pertama" : "Pembaruan tindak lanjut",
    detail: `Status: ${status}; Grading: ${grading ?? "belum dinilai"}`,
    oleh: pengguna.id,
  });

  if (eskalasi) {
    await supabase.from("komplain_riwayat").insert({
      komplain_id: id,
      aktivitas: "Eskalasi komite",
      detail: `Diteruskan ke ${isi(formData, "jenis_komite") || "komite"}`,
      oleh: pengguna.id,
    });
  }

  revalidatePath("/komplain");
  revalidatePath(`/komplain/${id}`);
  return { pesan: null, kode: sebelum.kode };
}

/** Mengatur izin modul seorang anggota. Hanya Admin. */
export async function aturAkses(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna || pengguna.peran !== "Admin") return;

  const penggunaId = Number(formData.get("pengguna_id"));
  const modul = String(formData.get("modul") ?? "");
  const beri = formData.get("beri") === "true";

  const supabase = await createClient();

  if (beri) {
    await supabase.from("akses_modul").insert({ pengguna_id: penggunaId, modul });
  } else {
    await supabase
      .from("akses_modul")
      .delete()
      .eq("pengguna_id", penggunaId)
      .eq("modul", modul);
  }

  revalidatePath("/pengaturan/pengguna");
}
