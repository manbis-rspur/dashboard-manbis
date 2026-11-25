import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { wajibAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { keIsianWaktu, sekarangIsianWaktu } from "@/lib/waktu";
import { FormKomplain, type AwalKomplain } from "../../baru/form-komplain";

/**
 * Perapian bahasa dengan AI berjalan sebagai server action dari
 * halaman ini, dan Gemini kerap butuh belasan detik -- apalagi
 * bila model utama sedang penuh dan harus diulang. Batas bawaan
 * Vercel memutusnya di tengah jalan, dan petugas cuma melihat
 * tombol yang menggantung tanpa sebab.
 */
export const maxDuration = 60;

export const dynamic = "force-dynamic";
export const metadata = { title: "Ubah Data Komplain" };

/** Nilai kosong jadi string kosong — isian HTML tidak mengerti null. */
const teks = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default async function HalamanUbahKomplain({
  params,
}: PageProps<"/komplain/[id]/ubah">) {
  const pengguna = await wajibAkses("komplain");
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("komplain")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();

  if (!data) notFound();

  /**
   * Komplain yang sudah selesai atau sudah dieskalasi tidak boleh
   * disunting selain oleh Admin.
   *
   * Diperiksa di sini supaya orang tidak dibiarkan mengisi
   * formulir panjang dulu baru ditolak saat menyimpan. Aksinya
   * memeriksa hal yang sama — pemeriksaan di halaman cuma
   * kesopanan, yang mengikat ada di sana.
   */
  const terkunci = data.status === "Selesai" || data.perlu_eskalasi === true;
  if (terkunci && pengguna.peran !== "Admin") redirect(`/komplain/${id}`);

  const awal: AwalKomplain = {
    id: Number(data.id),
    kode: teks(data.kode),
    // keIsianWaktu sudah mengubahnya ke waktu Jakarta. Dibiarkan
    // UTC, komplain yang diterima pukul 08.00 akan terbaca pukul
    // 01.00 saat formulirnya dibuka — dan petugas yang menyimpan
    // ulang tanpa sadar memundurkannya tujuh jam.
    waktu_pelaporan: keIsianWaktu(data.waktu_pelaporan as string),
    pelapor_nama: teks(data.pelapor_nama),
    pelapor_hp: teks(data.pelapor_hp),
    pelapor_alamat: teks(data.pelapor_alamat),
    pasien_nama: teks(data.pasien_nama),
    pasien_tgl_lahir: teks(data.pasien_tgl_lahir),
    pasien_no_rm: teks(data.pasien_no_rm),
    pasien_hp: teks(data.pasien_hp),
    pasien_alamat: teks(data.pasien_alamat),
    jalur_pelaporan: teks(data.jalur_pelaporan),
    media_pelaporan: teks(data.media_pelaporan),
    kategori_masalah: teks(data.kategori_masalah),
    sumber_pelaporan: teks(data.sumber_pelaporan),
    kepuasan_awal: teks(data.kepuasan_awal),
    detail_masalah: teks(data.detail_masalah),
    // Dibawa supaya kata asli pelapor tidak lenyap hanya karena
    // komplainnya pernah disunting lagi.
    detail_masalah_asli: data.detail_masalah_asli ?? null,
  };

  return (
    <div className="max-w-3xl">
      <Link
        prefetch={false}
        href={`/komplain/${id}`}
        className="text-sm text-tinta-3 hover:text-tinta"
      >
        &larr; Kembali ke komplain
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Ubah Data Komplain
      </h1>
      <p className="mt-1 text-tinta-2">
        <span className="font-mono">{awal.kode}</span> &middot; untuk membetulkan
        yang keliru dicatat, bukan mengubah isi laporan.
      </p>

      <div className="mt-4 mb-8 rounded-lg border-l-4 border-oker bg-[#f6efe2] px-4 py-3 text-sm">
        Setiap perubahan tercatat di riwayat komplain ini berikut nilai lamanya,
        dan nama Anda tertera di sana. Itu disengaja &mdash; berkas ini dicetak,
        ditandatangani, dan bisa diteruskan ke komite.
        {terkunci && (
          <span className="mt-1 block font-semibold">
            Komplain ini sebenarnya sudah terkunci; Anda bisa mengubahnya karena
            berperan Admin.
          </span>
        )}
      </div>

      <FormKomplain waktuSekarang={sekarangIsianWaktu()} awal={awal} />
    </div>
  );
}
