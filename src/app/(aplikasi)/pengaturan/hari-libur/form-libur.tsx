"use client";

import { useActionState } from "react";
import Ikon from "@/components/ikon";
import { tambahLibur } from "@/lib/libur-actions";
import { hasilAwal } from "@/lib/hasil";
import { JENIS_LIBUR } from "@/lib/libur";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function FormLibur() {
  const [hasil, kirim, sedang] = useActionState(tambahLibur, hasilAwal);

  return (
    <form
      action={kirim}
      className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        <Ikon nama="tambah" ukuran={14} />
        Tambah hari libur
      </h2>

      <div className="grid gap-3 sm:grid-cols-[11rem_1fr_11rem]">
        <input type="date" name="tanggal" required className={gaya} />
        <input
          name="keterangan"
          required
          placeholder="Keterangan — misalnya Maulid Nabi Muhammad SAW"
          className={gaya}
        />
        <select name="jenis" defaultValue="Nasional" className={gaya}>
          {JENIS_LIBUR.map((j) => (
            <option key={j}>{j}</option>
          ))}
        </select>
      </div>

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyimpan…" : "Tambahkan"}
        </button>
        <span className="text-xs text-tinta-3">
          Tanggal yang sudah ada akan ditimpa keterangan barunya.
        </span>
      </div>
    </form>
  );
}
