"use client";

import { useActionState } from "react";
import { unggahPublikasi } from "@/lib/publikasi-actions";
import { hasilAwal } from "@/lib/hasil";

const JENIS = [
  "Siaran Pers",
  "Kalender Konten",
  "Rencana Acara",
  "Klarifikasi & Krisis",
  "Naskah Video",
  "Lainnya",
] as const;

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormUnggah() {
  const [hasil, kirim, sedang] = useActionState(unggahPublikasi, hasilAwal);

  return (
    <form
      action={kirim}
      className="flex flex-col gap-3 rounded border border-garis bg-permukaan p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        Unggah dokumen hasil
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <input name="judul" required placeholder="Judul dokumen" className={gaya} />
        <select name="jenis" defaultValue="Lainnya" className={gaya}>
          {JENIS.map((j) => (
            <option key={j}>{j}</option>
          ))}
        </select>
      </div>

      <input
        name="keterangan"
        placeholder="Keterangan singkat — misalnya untuk keperluan apa dan kapan dipakai"
        className={gaya}
      />

      <input
        type="file"
        name="berkas"
        required
        accept=".pdf,.docx,.doc,.xlsx,.png,.jpg,.jpeg"
        className={`${gaya} file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
      />

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Mengunggah…" : "Unggah"}
        </button>
        <span className="text-xs text-tinta-3">
          PDF, Word, Excel, atau gambar. Maksimal 20 MB.
        </span>
      </div>
    </form>
  );
}
