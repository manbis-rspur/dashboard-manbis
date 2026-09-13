"use client";

import { useState } from "react";
import { HARI_PILIHAN } from "@/lib/tugas";

const TANGGAL = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Mengatur irama sebuah tugas berulang.
 *
 * Satu irama saja, mingguan atau bulanan — bukan dua-duanya.
 * Gabungan keduanya terdengar fleksibel di rancangan, tapi begitu
 * dipakai tidak ada yang bisa menjawab "sebenarnya ini muncul kapan"
 * tanpa membuka kodenya.
 *
 * Dipakai bersama oleh formulir tulis baru dan panel sunting, supaya
 * keduanya tidak mungkin berbeda aturan suatu hari nanti.
 */
export function PilihIrama({
  hariAwal = [],
  tanggalAwal = [],
}: {
  hariAwal?: number[];
  tanggalAwal?: number[];
}) {
  const [pola, setPola] = useState(tanggalAwal.length > 0 ? "bulanan" : "mingguan");
  const bulanan = pola === "bulanan";

  return (
    <fieldset className="rounded-lg border border-garis px-3 py-2.5">
      <legend className="px-1 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
        Iramanya
      </legend>

      <div className="mb-2.5 flex flex-wrap gap-x-5 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="pola"
            value="mingguan"
            checked={!bulanan}
            onChange={() => setPola("mingguan")}
            className="accent-hijau"
          />
          Hari dalam minggu
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="pola"
            value="bulanan"
            checked={bulanan}
            onChange={() => setPola("bulanan")}
            className="accent-hijau"
          />
          Tanggal dalam bulan
        </label>
      </div>

      {bulanan ? (
        <>
          <div className="grid grid-cols-7 gap-1 sm:grid-cols-[repeat(16,minmax(0,1fr))]">
            {TANGGAL.map((n) => (
              <label
                key={n}
                className="flex cursor-pointer items-center justify-center gap-1 rounded border border-garis px-1 py-1 text-xs hover:bg-permukaan-2"
              >
                <input
                  type="checkbox"
                  name="tanggal_bulan"
                  value={n}
                  defaultChecked={tanggalAwal.includes(n)}
                  className="accent-hijau"
                />
                {n}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-tinta-3">
            Tanggal yang tidak ada pada bulan berjalan jatuh di hari
            terakhirnya — yang memilih tanggal 31 tetap ditagih pada 28
            Februari, tidak lewat begitu saja.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {HARI_PILIHAN.map((h) => (
              <label key={h.n} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="hari"
                  value={h.n}
                  defaultChecked={hariAwal.includes(h.n)}
                  className="accent-hijau"
                />
                {h.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-tinta-3">
            Tugas ini naik ke daftar hari ini setiap hari yang dicentang,
            sampai ditandai sudah dikerjakan.
          </p>
        </>
      )}
    </fieldset>
  );
}
