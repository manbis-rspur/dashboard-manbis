"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { bolehAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DITERIMA, jenisDiterima } from "@/lib/publikasi";
import type { Hasil } from "@/lib/hasil";


/**
 * Menyiapkan tempat untuk satu berkas, lalu menyerahkan izin
 * sekali-pakai supaya peramban mengunggahnya langsung.
 *
 * Dulu berkasnya dititipkan lewat server action, dan itulah yang
 * membuat unggahan gagal: sebuah server action hanya menerima
 * kiriman 1 MB, dan di Vercel batas kerasnya 4,5 MB — jauh di bawah
 * ukuran dokumen Word atau PDF yang sebenarnya. Dengan izin
 * sekali-pakai, berkasnya berjalan dari peramban langsung ke
 * penyimpanan tanpa melewati server sama sekali, jadi batas itu
 * tidak berlaku, dan wadah 'dokumen' tetap tertutup rapat karena
 * izinnya hanya berlaku untuk satu jalur dan satu kali pakai.
 */
export type IzinUnggah =
  | { jalur: string; token: string; pesan: null }
  | { jalur: null; token: null; pesan: string };

export async function siapkanUnggahan(
  namaBerkas: string,
  untuk: "arsip" | "revisi" = "arsip",
): Promise<IzinUnggah> {
  const tolak = (pesan: string): IzinUnggah => ({ jalur: null, token: null, pesan });

  const pengguna = await getPenggunaAktif();
  if (!pengguna) return tolak("Sesi Anda sudah berakhir. Masuk lagi.");

  // Mengunggah dokumen baru adalah pekerjaan Humas dan Digital
  // Marketing. Mengunggah perbaikan juga hak Koordinator — memang
  // dialah yang mengoreksi.
  const berhak =
    untuk === "revisi"
      ? (await bolehAkses("publikasi")) || (await bolehAkses("humas"))
      : await bolehAkses("humas");

  if (!berhak) return tolak("Anda tidak berhak mengunggah berkas ke sini.");

  if (!jenisDiterima(namaBerkas)) {
    return tolak(`Jenis berkas belum didukung. Yang diterima: ${DITERIMA.join(", ")}.`);
  }

  // Nama berkas dibersihkan sebelum jadi bagian jalur: spasi dan
  // tanda baca asing membuat alamat berkasnya sulit dipakai lagi.
  const bersih = namaBerkas.replace(/[^\w.\-]+/g, "-").slice(-80);
  const jalur = `publikasi/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${bersih}`;

  const { data, error } = await createAdminClient()
    .storage.from("dokumen")
    .createSignedUploadUrl(jalur);

  if (error || !data) {
    return tolak(`Gagal menyiapkan unggahan: ${error?.message ?? "tidak diketahui"}`);
  }

  return { jalur: data.path, token: data.token, pesan: null };
}

/**
 * Mencatat satu dokumen ke arsip.
 *
 * Berkasnya — kalau ada — sudah lebih dulu naik ke penyimpanan lewat
 * izin sekali-pakai di atas. Yang lewat sini cuma keterangannya, jadi
 * ringan dan tidak pernah menabrak batas ukuran kiriman.
 *
 * Boleh tanpa berkas asalkan ada tautan Google Docs atau Drive:
 * sebagian dokumen memang lebih masuk akal tinggal di Drive.
 */
export async function catatPublikasi(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };
  if (!(await bolehAkses("humas"))) {
    return { pesan: "Anda tidak berhak mengunggah ke arsip ini.", berhasil: null };
  }

  const judul = String(formData.get("judul") ?? "").trim();
  if (!judul) return { pesan: "Judul dokumen harus diisi.", berhasil: null };

  const jalur = String(formData.get("jalur") ?? "").trim();
  const berkasNama = String(formData.get("berkas_nama") ?? "").trim();
  const tautan = String(formData.get("tautan_docs") ?? "").trim();

  if (!jalur && !tautan) {
    return {
      pesan: "Pilih berkasnya, atau tempel tautan Google Docs/Drive-nya.",
      berhasil: null,
    };
  }

  if (tautan !== "" && !tautan.startsWith("https://")) {
    return {
      pesan: "Tautannya harus dimulai dengan https:// — salin apa adanya dari bilah alamat.",
      berhasil: null,
    };
  }

  const ukuran = Number(formData.get("berkas_ukuran"));
  const tenggat = String(formData.get("tenggat") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("publikasi").insert({
    judul,
    keterangan: String(formData.get("keterangan") ?? "").trim() || null,
    jenis: String(formData.get("jenis") ?? "Lainnya"),
    berkas_jalur: jalur || null,
    berkas_nama: jalur ? berkasNama || "dokumen" : null,
    berkas_ukuran: Number.isFinite(ukuran) && ukuran > 0 ? ukuran : null,
    tautan_docs: tautan || null,
    tenggat: tenggat || null,
    diunggah_oleh: pengguna.id,
  });

  if (error) {
    // Berkasnya sudah terlanjur naik tapi catatannya gagal —
    // dibuang lagi supaya tidak ada berkas yatim di penyimpanan.
    if (jalur) await createAdminClient().storage.from("dokumen").remove([jalur]);
    return { pesan: `Gagal dicatat: ${error.message}`, berhasil: null };
  }

  revalidatePath("/publikasi");
  return { pesan: null, berhasil: `"${judul}" masuk ke arsip.` };
}

/** Menghapus satu dokumen beserta berkasnya. */
export async function hapusPublikasi(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { data } = await supabase
    .from("publikasi")
    .select("berkas_jalur")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("publikasi").delete().eq("id", id);
  if (error || !data) return;

  await createAdminClient().storage.from("dokumen").remove([data.berkas_jalur]);
  revalidatePath("/publikasi");
}

/**
 * Menyimpan suntingan isi dokumen.
 *
 * Tiap penyimpanan dicatat sebagai revisi tersendiri, bukan menimpa
 * yang lama. Yang disunting adalah dokumen yang akan terbit atas
 * nama rumah sakit — riwayat koreksinya harus bisa ditelusuri.
 */
export async function simpanSuntingan(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  const berhak =
    (await bolehAkses("publikasi")) || (await bolehAkses("humas"));
  if (!berhak) return { pesan: "Anda tidak berhak menyunting dokumen ini.", berhasil: null };

  const id = Number(formData.get("id"));
  const isi = String(formData.get("isi") ?? "");
  if (isi.trim() === "") return { pesan: "Isi dokumen tidak boleh kosong.", berhasil: null };

  const supabase = await createClient();

  const { data: sebelum } = await supabase
    .from("publikasi")
    .select("isi")
    .eq("id", id)
    .maybeSingle();

  if (!sebelum) return { pesan: "Dokumen tidak ditemukan.", berhasil: null };
  if (sebelum.isi === isi) {
    return { pesan: null, berhasil: "Tidak ada yang berubah." };
  }

  const { data: tersentuh, error } = await supabase
    .from("publikasi")
    .update({
      isi,
      diubah_oleh: pengguna.id,
      diubah_pada: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };
  if (!tersentuh || tersentuh.length === 0) {
    return { pesan: "Tidak ada yang tersimpan — akun Anda mungkin belum berhak.", berhasil: null };
  }

  const { error: galatRevisi } = await supabase.from("publikasi_revisi").insert({
    publikasi_id: id,
    isi,
    catatan: String(formData.get("catatan") ?? "").trim() || null,
    oleh: pengguna.id,
  });

  if (galatRevisi) {
    return {
      pesan: `Tersimpan, tetapi revisinya gagal dicatat: ${galatRevisi.message}`,
      berhasil: null,
    };
  }

  revalidatePath("/publikasi");
  revalidatePath(`/publikasi/${id}`);
  return { pesan: null, berhasil: "Suntingan tersimpan." };
}

/**
 * Menyimpan tautan Google Docs sebuah dokumen arsip.
 *
 * Hanya tautan yang disimpan, bukan berkasnya — dokumennya sendiri
 * tetap tinggal di Drive milik yang mengunggah. Perlu diingat:
 * suntingan yang dilakukan di Google Docs TIDAK tercatat di riwayat
 * revisi sini, karena terjadi di luar sistem ini.
 */
export async function simpanTautanDocs(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  const berhak = (await bolehAkses("publikasi")) || (await bolehAkses("humas"));
  if (!berhak) return { pesan: "Anda tidak berhak mengubah dokumen ini.", berhasil: null };

  const id = Number(formData.get("id"));
  const tautan = String(formData.get("tautan_docs") ?? "").trim();

  if (tautan !== "" && !tautan.startsWith("https://")) {
    return {
      pesan: "Tautannya harus dimulai dengan https:// — salin apa adanya dari bilah alamat Google Docs.",
      berhasil: null,
    };
  }

  const supabase = await createClient();
  const { data: tersentuh, error } = await supabase
    .from("publikasi")
    .update({ tautan_docs: tautan === "" ? null : tautan })
    .eq("id", id)
    .select("id");

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };
  if (!tersentuh || tersentuh.length === 0) {
    return { pesan: "Tidak ada yang tersimpan — akun Anda mungkin belum berhak.", berhasil: null };
  }

  revalidatePath("/publikasi");
  revalidatePath(`/publikasi/${id}`);
  return {
    pesan: null,
    berhasil: tautan === "" ? "Tautan dihapus." : "Tautan Google Docs tersimpan.",
  };
}

/**
 * Mencatat revisi berupa berkas.
 *
 * Berkas lama TIDAK ditimpa: yang baru disimpan sebagai versi
 * tersendiri, dan barisan dokumen diarahkan ke versi terakhir.
 * Dengan begitu naskah asli tetap bisa dibuka, dan terlihat apa
 * yang berubah di tiap langkah.
 *
 * Berkasnya sendiri sudah naik lebih dulu dari peramban lewat izin
 * sekali-pakai; yang lewat sini hanya keterangannya.
 */
export async function catatRevisi(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  const berhak = (await bolehAkses("publikasi")) || (await bolehAkses("humas"));
  if (!berhak) return { pesan: "Anda tidak berhak mengunggah revisi.", berhasil: null };

  const id = Number(formData.get("id"));
  const jalur = String(formData.get("jalur") ?? "").trim();
  const berkasNama = String(formData.get("berkas_nama") ?? "").trim() || "dokumen";
  const ukuran = Number(formData.get("berkas_ukuran"));
  const besar = Number.isFinite(ukuran) && ukuran > 0 ? ukuran : null;

  if (!jalur) return { pesan: "Pilih dulu berkas revisinya.", berhasil: null };

  const db = createAdminClient();
  const supabase = await createClient();

  const { data: revisi, error: galatRevisi } = await supabase
    .from("publikasi_revisi")
    .insert({
      publikasi_id: id,
      berkas_jalur: jalur,
      berkas_nama: berkasNama,
      berkas_ukuran: besar,
      catatan: String(formData.get("catatan") ?? "").trim() || null,
      oleh: pengguna.id,
    })
    .select("versi")
    .single();

  if (galatRevisi) {
    await db.storage.from("dokumen").remove([jalur]);
    return { pesan: `Revisi gagal dicatat: ${galatRevisi.message}`, berhasil: null };
  }

  // Barisan dokumen diarahkan ke versi terakhir, supaya yang
  // terunduh dari daftar selalu yang terbaru.
  const { error } = await supabase
    .from("publikasi")
    .update({
      berkas_jalur: jalur,
      berkas_nama: berkasNama,
      berkas_ukuran: besar,
      diubah_oleh: pengguna.id,
      diubah_pada: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return {
      pesan: `Revisi tersimpan sebagai versi ${revisi.versi}, tetapi dokumen utamanya gagal diperbarui: ${error.message}`,
      berhasil: null,
    };
  }

  revalidatePath("/publikasi");
  revalidatePath(`/publikasi/${id}`);
  return { pesan: null, berhasil: `Tersimpan sebagai versi ${revisi.versi}.` };
}


/**
 * Menuliskan hasil bacaan Koordinator atas sebuah dokumen.
 *
 * Ini yang selama ini hilang: dokumen masuk arsip lalu berhenti,
 * dan yang mengunggah tidak pernah tahu apakah sudah dipakai, masih
 * ditunggu, atau perlu diperbaiki. Putusannya sengaja disimpan di
 * barisan dokumennya sendiri, bukan di percakapan, supaya masih ada
 * bulan depan saat ditanya lagi.
 *
 * Hanya pemegang izin 'publikasi' — Koordinator — yang boleh
 * memutuskan. Yang mengunggah tidak menilai pekerjaannya sendiri.
 */
export async function simpanTinjauan(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  if (!(await bolehAkses("publikasi"))) {
    return { pesan: "Hanya Koordinator yang bisa memberi tindak lanjut.", berhasil: null };
  }

  const id = Number(formData.get("id"));
  const status = String(formData.get("status_tinjauan") ?? "").trim();

  if (!["Menunggu", "Perlu revisi", "Disetujui"].includes(status)) {
    return { pesan: "Pilih dulu putusannya.", berhasil: null };
  }

  const catatan = String(formData.get("catatan_tinjauan") ?? "").trim();

  // Dikembalikan tanpa alasan tidak bisa ditindaklanjuti siapa pun.
  if (status === "Perlu revisi" && catatan === "") {
    return {
      pesan: "Tulis dulu apa yang perlu diperbaiki — tanpa itu yang mengunggah tidak tahu harus mengubah apa.",
      berhasil: null,
    };
  }

  const tenggat = String(formData.get("tenggat") ?? "").trim();

  const supabase = await createClient();
  const { data: tersentuh, error } = await supabase
    .from("publikasi")
    .update({
      status_tinjauan: status,
      catatan_tinjauan: catatan || null,
      tenggat: tenggat || null,
      ditinjau_oleh: pengguna.id,
      ditinjau_pada: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (error) return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };
  if (!tersentuh || tersentuh.length === 0) {
    return { pesan: "Tidak ada yang tersimpan — akun Anda mungkin belum berhak.", berhasil: null };
  }

  revalidatePath("/publikasi");
  revalidatePath(`/publikasi/${id}`);
  revalidatePath("/");

  return {
    pesan: null,
    berhasil:
      status === "Perlu revisi"
        ? "Dikembalikan dengan catatan. Yang mengunggah akan melihatnya."
        : status === "Disetujui"
          ? "Dokumen disetujui."
          : "Dikembalikan ke status menunggu.",
  };
}
