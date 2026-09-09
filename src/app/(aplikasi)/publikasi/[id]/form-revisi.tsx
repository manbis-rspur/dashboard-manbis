"use client";

import { useActionState } from "react";
import { unggahRevisi } from "@/lib/publikasi-actions";
import { hasilAwal } from "@/lib/hasil";

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Mengunggah berkas revisi.
 *
 * Berkas lama tidak ditimpa — yang baru jadi versi berikutnya, dan
 * versi lama tetap bisa diunduh dari riwayat di bawah.
 */
export function FormRevisi({ id }: { id: number }) {
  const [hasil, kirim, sedang] = useActionState(unggahRevisi, hasilAwal);

  return (
    <form action={kirim} className="flex flex-col gap-3 rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
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
        accept=".pdf,.docx,.doc,.xlsx,.png,.jpg,.jpeg"
        className={`${gaya} file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
      />

      <input
        name="catatan"
        placeholder="Catatan perubahan — misalnya: tanggal pekan ketiga diperbaiki"
        className={gaya}
      />

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Mengunggah…" : "Unggah revisi"}
      </button>
    </form>
  );
}
