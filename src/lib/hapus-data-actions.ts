"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Hasil } from "@/lib/hasil";

/**
 * Kumpulan data yang boleh dikosongkan Admin dari aplikasi.
 *
 * Penghapusannya memakai kunci penuh, karena aturan keamanan
 * database sengaja TIDAK mengizinkan siapa pun menghapus baris-
 * baris ini lewat jalur biasa — termasuk Admin. Jadi pintu ini
 * satu-satunya, dan penjaganya ada di sini: pemeriksaan peran,
 * penegasan yang harus diketik, dan pencatatan setelahnya.
 *
 * Penawaran MCU tidak ada di sini lagi: modulnya pindah ke Dashboard
 * Humas & Pemasaran, dan alat pembersihnya ikut pindah supaya
 * penghapusan dilakukan dari tempat datanya dipakai.
 */
const KUMPULAN = {
  nomor: {
    nama: "Buku nomor surat",
    penegasan: "HAPUS BUKU NOMOR",
    keterangan:
      "Seluruh nomor surat dan PKRS yang pernah diambil, beserta hitungannya. Penomoran mulai lagi dari 001.",
    tabel: [
      { nama: "nomor", saring: "id=gt.0" },
      { nama: "nomor_urut", saring: "tahun=not.is.null" },
    ],
  },
  komplain: {
    nama: "Komplain pasien",
    penegasan: "HAPUS KOMPLAIN",
    keterangan:
      "Seluruh komplain beserta riwayat penanganannya. Penomoran komplain mulai lagi dari 0001.",
    tabel: [
      { nama: "komplain_riwayat", saring: "id=gt.0" },
      { nama: "komplain", saring: "id=gt.0" },
      { nama: "nomor_urut_komplain", saring: "tanggal=not.is.null" },
    ],
  },
  publikasi: {
    nama: "Arsip publikasi",
    penegasan: "HAPUS ARSIP",
    keterangan:
      "Seluruh dokumen arsip beserta revisinya, termasuk berkas yang tersimpan.",
    tabel: [
      { nama: "publikasi_revisi", saring: "id=gt.0" },
      { nama: "publikasi", saring: "id=gt.0" },
    ],
  },
  obrolan: {
    nama: "Pesan obrolan",
    penegasan: "HAPUS OBROLAN",
    keterangan: "Seluruh isi ruang obrolan unit.",
    tabel: [{ nama: "obrolan", saring: "id=gt.0" }],
  },
} as const;

export type JenisHapus = keyof typeof KUMPULAN;

export async function daftarKumpulan() {
  return Object.entries(KUMPULAN).map(([kunci, k]) => ({
    kunci: kunci as JenisHapus,
    nama: k.nama,
    penegasan: k.penegasan,
    keterangan: k.keterangan,
  }));
}

export async function hapusData(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };
  if (pengguna.peran !== "Admin") {
    return { pesan: "Hanya Admin yang boleh menghapus data.", berhasil: null };
  }

  const jenis = String(formData.get("jenis") ?? "") as JenisHapus;
  const kumpulan = KUMPULAN[jenis];
  if (!kumpulan) return { pesan: "Kumpulan data tidak dikenali.", berhasil: null };

  const diketik = String(formData.get("penegasan") ?? "").trim();
  if (diketik !== kumpulan.penegasan) {
    return {
      pesan: `Penegasannya belum cocok. Ketik persis: ${kumpulan.penegasan}`,
      berhasil: null,
    };
  }

  const db = createAdminClient();

  // Berkas arsip dibuang lebih dulu, selagi catatan jalurnya masih
  // ada — kalau barisnya dihapus duluan, jalurnya ikut hilang dan
  // berkasnya tertinggal selamanya di penyimpanan.
  if (jenis === "publikasi") {
    const jalur = new Set<string>();
    const { data: dokumen } = await db.from("publikasi").select("berkas_jalur");
    const { data: revisi } = await db.from("publikasi_revisi").select("berkas_jalur");
    for (const b of [...(dokumen ?? []), ...(revisi ?? [])]) {
      if (b.berkas_jalur) jalur.add(b.berkas_jalur);
    }
    if (jalur.size > 0) await db.storage.from("dokumen").remove([...jalur]);
  }

  let jumlah = 0;
  for (const t of kumpulan.tabel) {
    const { count } = await db
      .from(t.nama)
      .select("*", { count: "exact", head: true });

    const [kolom, sisa] = t.saring.split("=");
    const [operator, nilai] = sisa.split(/\.(.*)/);

    let hapus = db.from(t.nama).delete();
    hapus =
      operator === "gt"
        ? hapus.gt(kolom, Number(nilai))
        : hapus.not(kolom, "is", null);

    const { error } = await hapus;
    if (error) return { pesan: `Gagal menghapus ${t.nama}: ${error.message}`, berhasil: null };

    jumlah += count ?? 0;
  }

  // Dicatat setelah penghapusan berhasil, memakai kunci penuh —
  // catatan ini tidak bisa ditulis maupun dihapus lewat jalur biasa.
  await db.from("log_hapus_data").insert({
    jenis,
    keterangan: kumpulan.nama,
    jumlah,
    oleh: pengguna.id,
    nama_oleh: pengguna.nama,
  });

  revalidatePath("/pengaturan/hapus-data");
  revalidatePath("/");

  return { pesan: null, berhasil: `${kumpulan.nama} dikosongkan — ${jumlah} baris terhapus.` };
}
