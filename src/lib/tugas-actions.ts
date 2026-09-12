"use server";

import { revalidatePath } from "next/cache";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { JENIS_LAMPIRAN, jenisLampiranDiterima } from "@/lib/lampiran";
import { BERULANG, JENIS, PRIORITAS, STATUS, hariIni } from "@/lib/tugas";
import type { Hasil } from "@/lib/hasil";

function isi(formData: FormData, nama: string) {
  return String(formData.get(nama) ?? "").trim();
}

function isiAtauNull(formData: FormData, nama: string) {
  const nilai = isi(formData, nama);
  return nilai === "" ? null : nilai;
}

/**
 * Hari kerja yang dicentang, hanya untuk yang berulang.
 *
 * Tugas yang punya garis selesai sudah punya tenggat; memberinya
 * hari kerja berulang cuma membingungkan, dan database menolaknya.
 */
function hariTerpilih(formData: FormData, jenis: string): number[] | null {
  if (jenis !== BERULANG) return null;

  const angka = formData
    .getAll("hari")
    .map((h) => Number(h))
    .filter((h) => Number.isInteger(h) && h >= 1 && h <= 7);

  const unik = [...new Set(angka)].sort((a, b) => a - b);
  return unik.length > 0 ? unik : null;
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
  const jenisDiminta = isi(formData, "jenis");
  const jenis = (JENIS as readonly string[]).includes(jenisDiminta)
    ? jenisDiminta
    : "Tugas";

  // Yang berulang tidak punya tenggat, dan memberinya tenggat
  // justru menyesatkan — seolah ada hari ia berhenti.
  const tenggat = jenis === BERULANG ? null : isiAtauNull(formData, "tenggat");

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
    diminta && diminta !== pengguna.id && (await punyaIzin("tugas_unit"))
      ? diminta
      : pengguna.id;

  const supabase = await createClient();
  const { error } = await supabase.from("tugas").insert({
    untuk,
    judul,
    keterangan: isiAtauNull(formData, "keterangan"),
    ...(mulai !== "" ? { tanggal_mulai: mulai } : {}),
    tenggat,
    jenis,
    hari: hariTerpilih(formData, jenis),
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

/**
 * Menandai tugas berulang sudah dikerjakan untuk hari ini.
 *
 * Yang disimpan tanggalnya, bukan statusnya. Tugas berulang
 * tidak pernah berubah jadi selesai — ia cuma sudah dikerjakan hari
 * ini, dan besok menunggu lagi.
 */
export async function tandaiHariIni(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  if (!id) return;

  const batal = isi(formData, "batal") === "ya";

  const supabase = await createClient();
  await supabase
    .from("tugas")
    .update({ terakhir_dikerjakan: batal ? null : hariIni() })
    .eq("id", id);

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
  const jenisDiminta = isi(formData, "jenis");
  const jenis = (JENIS as readonly string[]).includes(jenisDiminta)
    ? jenisDiminta
    : "Tugas";
  const tenggat = jenis === BERULANG ? null : isiAtauNull(formData, "tenggat");

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
      jenis,
      hari: hariTerpilih(formData, jenis),
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


/**
 * Izin sekali-pakai untuk menaruh satu lampiran di penyimpanan.
 *
 * Berkasnya naik dari peramban langsung ke penyimpanan, tidak lewat
 * server action — batas kiriman server action 1 MB, dan di Vercel
 * batas kerasnya 4,5 MB. Desain spanduk beresolusi cetak gampang
 * melewatinya.
 */
export type IzinLampiran =
  | { jalur: string; token: string; pesan: null }
  | { jalur: null; token: null; pesan: string };

export async function siapkanLampiran(
  tugasId: number,
  namaBerkas: string,
): Promise<IzinLampiran> {
  const tolak = (pesan: string): IzinLampiran => ({ jalur: null, token: null, pesan });

  const pengguna = await getPenggunaAktif();
  if (!pengguna) return tolak("Sesi Anda sudah berakhir. Masuk lagi.");

  // Hak melampirkan mengikuti hak membaca tugasnya — ditanyakan ke
  // database, bukan disimpulkan di sini.
  const supabase = await createClient();
  const { data: boleh } = await supabase.rpc("boleh_lihat_tugas", { p_tugas_id: tugasId });
  if (boleh !== true) return tolak("Anda tidak berhak melampirkan berkas ke tugas ini.");

  if (!jenisLampiranDiterima(namaBerkas)) {
    return tolak(
      `Jenis berkas belum didukung. Yang diterima: ${JENIS_LAMPIRAN.join(", ")}. Video cukup ditempel tautannya.`,
    );
  }

  const bersih = namaBerkas.replace(/[^\w.\-]+/g, "-").slice(-80);
  const jalur = `tugas/${tugasId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${bersih}`;

  const { data, error } = await createAdminClient()
    .storage.from("dokumen")
    .createSignedUploadUrl(jalur);

  if (error || !data) {
    return tolak(`Gagal menyiapkan unggahan: ${error?.message ?? "tidak diketahui"}`);
  }

  return { jalur: data.path, token: data.token, pesan: null };
}

/** Mencatat satu lampiran — berkas yang sudah naik, atau tautan. */
export async function catatLampiran(_s: Hasil, formData: FormData): Promise<Hasil> {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return { pesan: "Sesi Anda sudah berakhir. Masuk lagi.", berhasil: null };

  const tugasId = Number(formData.get("tugas_id"));
  if (!tugasId) return { pesan: "Tugas tidak dikenali.", berhasil: null };

  const jalur = isi(formData, "jalur");
  const tautan = isi(formData, "tautan");

  if (!jalur && !tautan) {
    return { pesan: "Pilih berkasnya, atau tempel tautannya.", berhasil: null };
  }

  if (tautan && !tautan.startsWith("https://")) {
    return {
      pesan: "Tautannya harus dimulai dengan https:// — salin apa adanya dari bilah alamat.",
      berhasil: null,
    };
  }

  const ukuran = Number(formData.get("berkas_ukuran"));
  const supabase = await createClient();

  const { error } = await supabase.from("tugas_lampiran").insert(
    jalur
      ? {
          tugas_id: tugasId,
          jenis: "Berkas",
          judul: isiAtauNull(formData, "judul"),
          berkas_jalur: jalur,
          berkas_nama: isi(formData, "berkas_nama") || "lampiran",
          berkas_ukuran: Number.isFinite(ukuran) && ukuran > 0 ? ukuran : null,
          oleh: pengguna.id,
        }
      : {
          tugas_id: tugasId,
          jenis: "Tautan",
          judul: isiAtauNull(formData, "judul"),
          tautan,
          oleh: pengguna.id,
        },
  );

  if (error) {
    // Berkasnya sudah terlanjur naik tapi catatannya gagal — dibuang
    // lagi supaya tidak ada berkas yatim di penyimpanan.
    if (jalur) await createAdminClient().storage.from("dokumen").remove([jalur]);
    return { pesan: `Gagal disimpan: ${error.message}`, berhasil: null };
  }

  segarkan(tugasId);
  return { pesan: null, berhasil: jalur ? "Berkas terlampir." : "Tautan tersimpan." };
}

/** Menghapus satu lampiran beserta berkasnya. */
export async function hapusLampiran(formData: FormData) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) return;

  const id = Number(formData.get("id"));
  if (!id) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("tugas_lampiran")
    .select("berkas_jalur")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("tugas_lampiran").delete().eq("id", id);
  if (error) return;

  if (data?.berkas_jalur) {
    await createAdminClient().storage.from("dokumen").remove([data.berkas_jalur]);
  }

  segarkan();
}
