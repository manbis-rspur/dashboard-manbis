"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { bolehAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { PRIORITAS, STATUS } from "@/lib/tugas";
import type { Hasil } from "@/lib/hasil";

function isi(formData: FormData, nama: string) {
  return String(formData.get(nama) ?? "").trim();
}

function isiAtauNull(formData: FormData, nama: string) {
  const nilai = isi(formData, nama);
  return nilai === "" ? null : nilai;
}

function segarkan(id?: number) {
  revalidatePath("/tugas");
  revalidatePath("/tugas/unit");
  revalidatePath("/");
  if (id) revalidatePath(`/tugas/${id}`);
}

/** Menambah satu tugas ke daftar sendiri. */
export async function tambahTugas(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  const judul = isi(formData, "judul");
  if (judul === "") return { pesan: "Judul tugas harus diisi.", berhasil: null };

  const mulai = isi(formData, "tanggal_mulai");
  const tenggat = isiAtauNull(formData, "tenggat");

  if (tenggat && mulai !== "" && tenggat < mulai) {
    return {
      pesan: "Tenggatnya lebih awal daripada tanggal mulai — kemungkinan salah ketik.",
      berhasil: null,
    };
  }

  const prioritas = isi(formData, "prioritas");

  // Koordinator boleh menitipkan tugas kepada anggota. Ini menutup
  // jalur WhatsApp yang selama ini jadi sumber lupa: tugas titipan
  // yang hanya ada di pesan akan tenggelam di bawah pesan lain,
  // sedangkan yang masuk ke daftar akan berteriak sendiri begitu
  // lewat tenggat.
  const diminta = Number(formData.get("untuk"));
  const untuk =
    diminta && diminta !== pengguna.id && (await bolehAkses("tugas_unit"))
      ? diminta
      : pengguna.id;

  const supabase = await createClient();
  const { error } = await supabase.from("tugas").insert({
    untuk,
    judul,
    keterangan: isiAtauNull(formData, "keterangan"),
    ...(mulai !== "" ? { tanggal_mulai: mulai } : {}),
    tenggat,
    prioritas: (PRIORITAS as readonly string[]).includes(prioritas) ? prioritas : "Sedang",
    dibuat_oleh: pengguna.id,
  });

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  segarkan();
  revalidatePath("/tugas/unit");

  return {
    pesan: null,
    berhasil:
      untuk === pengguna.id
        ? `"${judul}" masuk daftar.`
        : `"${judul}" dititipkan. Muncul di lonceng dan daftar tugasnya.`,
  };
}

/**
 * Mengubah status satu tugas.
 *
 * Dipakai tombol cepat di daftar, jadi tanpa formulir dan tanpa
 * pesan — yang berubah langsung terlihat di barisnya sendiri.
 */
export async function ubahStatusTugas(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  const status = isi(formData, "status");
  if (!id || !(STATUS as readonly string[]).includes(status)) return;

  const supabase = await createClient();
  await supabase.from("tugas").update({ status }).eq("id", id);

  segarkan(id);
}

/** Menyunting isi sebuah tugas. */
export async function ubahTugas(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  const id = Number(formData.get("id"));
  if (!id) return { pesan: "Tugas tidak dikenali.", berhasil: null };

  const judul = isi(formData, "judul");
  if (judul === "") return { pesan: "Judul tugas harus diisi.", berhasil: null };

  const mulai = isi(formData, "tanggal_mulai");
  const tenggat = isiAtauNull(formData, "tenggat");

  if (tenggat && mulai !== "" && tenggat < mulai) {
    return {
      pesan: "Tenggatnya lebih awal daripada tanggal mulai — kemungkinan salah ketik.",
      berhasil: null,
    };
  }

  const supabase = await createClient();
  const { data: tersentuh, error } = await supabase
    .from("tugas")
    .update({
      judul,
      keterangan: isiAtauNull(formData, "keterangan"),
      ...(mulai !== "" ? { tanggal_mulai: mulai } : {}),
      tenggat,
      prioritas: isi(formData, "prioritas") || "Sedang",
      status: isi(formData, "status") || "Belum",
      catatan_hasil: isiAtauNull(formData, "catatan_hasil"),
    })
    .eq("id", id)
    .select("id");

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };

  // Perubahan yang ditolak aturan keamanan tidak menghasilkan galat,
  // hanya nol baris tersentuh. Tanpa pemeriksaan ini halaman akan
  // berkata "tersimpan" padahal tidak ada yang berubah.
  if (!tersentuh || tersentuh.length === 0) {
    return { pesan: "Tidak ada yang tersimpan — tugas ini mungkin bukan milik Anda.", berhasil: null };
  }

  segarkan(id);
  return { pesan: null, berhasil: "Tersimpan." };
}

/** Menghapus tugas yang salah tulis. */
export async function hapusTugas(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("tugas").delete().eq("id", id);

  segarkan();
}

/**
 * Menutup hari: memberi status dan catatan pada seluruh tugas yang
 * hari ini terbuka, sekaligus.
 *
 * Satu layar, satu tombol. Kalau tiap tugas harus dibuka sendiri
 * untuk diberi status, ritual sore hari ini tidak akan bertahan
 * seminggu — dan yang hilang bukan cuma catatannya, melainkan
 * kebiasaan memeriksanya.
 */
export async function tutupHari(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  const supabase = await createClient();

  // Nama isiannya berbentuk status_<id> dan catatan_<id>; dari situ
  // daftar tugas yang ikut ditutup dibaca, bukan dari daftar
  // tersembunyi yang bisa saja sudah basi saat tombolnya ditekan.
  const perubahan: { id: number; status: string; catatan: string | null }[] = [];

  for (const [nama, nilai] of formData.entries()) {
    if (!nama.startsWith("status_")) continue;

    const id = Number(nama.slice("status_".length));
    const status = String(nilai).trim();
    if (!id || !(STATUS as readonly string[]).includes(status)) continue;

    perubahan.push({
      id,
      status,
      catatan: isiAtauNull(formData, `catatan_${id}`),
    });
  }

  if (perubahan.length === 0) {
    return { pesan: "Tidak ada tugas yang perlu ditutup hari ini.", berhasil: null };
  }

  let gagal = 0;
  for (const p of perubahan) {
    const { error } = await supabase
      .from("tugas")
      .update({ status: p.status, catatan_hasil: p.catatan })
      .eq("id", p.id);
    if (error) gagal += 1;
  }

  segarkan();

  if (gagal > 0) {
    return {
      pesan: `${gagal} dari ${perubahan.length} tugas gagal disimpan. Coba lagi.`,
      berhasil: null,
    };
  }

  const selesai = perubahan.filter((p) => p.status === "Selesai").length;
  const sisa = perubahan.length - selesai;

  return {
    pesan: null,
    berhasil:
      sisa === 0
        ? `Hari ditutup. Semua ${selesai} tugas selesai.`
        : `Hari ditutup. ${selesai} selesai, ${sisa} lanjut besok.`,
  };
}
