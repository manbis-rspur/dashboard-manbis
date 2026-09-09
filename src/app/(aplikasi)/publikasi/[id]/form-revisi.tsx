"use client";

import { useState, useTransition } from "react";
import { catatRevisi, siapkanUnggahan } from "@/lib/publikasi-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import { ACCEPT, ukuranRapi } from "@/lib/publikasi";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Mengunggah berkas revisi.
 *
 * Berkas lama tidak ditimpa — yang baru jadi versi berikutnya, dan
 * versi lama tetap bisa diunduh dari riwayat di bawah.
 *
 * Sama seperti unggahan dokumen baru, berkasnya naik dari peramban
 * langsung ke penyimpanan supaya tidak terhalang batas ukuran
 * kiriman server action.
 */
export function FormRevisi({ id }: { id: number }) {
  const [pesan, setPesan] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  async function kirim(formData: FormData) {
    setPesan(null);
    setBerhasil(null);

    const berkas = formData.get("berkas");
    if (!(berkas instanceof File) || berkas.size === 0) {
      setPesan("Pilih dulu berkas revisinya.");
      return;
    }

    setTahap(`Mengunggah ${ukuranRapi(berkas.size)}…`);
    const naik = await unggahLewatIzin(berkas, (nama) =>
      siapkanUnggahan(nama, "revisi"),
    );
    setTahap(null);

    if (naik.jalur === null) {
      setPesan(naik.pesan);
      return;
    }

    formData.delete("berkas");
    formData.set("jalur", naik.jalur);
    formData.set("berkas_nama", berkas.name);
    formData.set("berkas_ukuran", String(berkas.size));

    setTahap("Mencatat revisi…");
    const hasil = await catatRevisi({ pesan: null, berhasil: null }, formData);
    setTahap(null);

    setPesan(hasil.pesan);
    setBerhasil(hasil.berhasil);
  }

  return (
    <form
      action={(formData) => mulai(() => kirim(formData))}
      className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <input type="hidden" name="id" value={id} />

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Unggah revisi
        </h2>
        <p className="mt-1 text-sm text-tinta-2">
          Unduh berkasnya, perbaiki di Word, lalu unggah kembali di sini. Versi
          lama tidak tertimpa — semuanya tetap bisa dibuka dari riwayat.
        </p>
      </div>

      <input
        type="file"
        name="berkas"
        required
        accept={ACCEPT}
        className={`${gaya} file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
      />

      <input
        name="catatan"
        placeholder="Catatan perubahan — misalnya: tanggal pekan ketiga diperbaiki"
        className={gaya}
      />

      {pesan && <p className="text-sm text-merah">{pesan}</p>}
      {berhasil && <p className="text-sm text-hijau">{berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? (tahap ?? "Menyimpan…") : "Unggah revisi"}
      </button>
    </form>
  );
}
