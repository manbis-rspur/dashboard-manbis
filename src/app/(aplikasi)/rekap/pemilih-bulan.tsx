"use client";

import { useRouter } from "next/navigation";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function PemilihBulan({ bulan, tahun }: { bulan: number; tahun: number }) {
  const router = useRouter();
  const sekarang = new Date().getFullYear();
  const daftarTahun = [sekarang + 1, sekarang, sekarang - 1, sekarang - 2];

  function pindah(b: number, t: number) {
    router.push(`/rekap?bulan=${b}&tahun=${t}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={bulan}
        onChange={(e) => pindah(Number(e.target.value), tahun)}
        className={gaya}
        aria-label="Bulan"
      >
        {BULAN.map((n, i) => (
          <option key={n} value={i + 1}>
            {n}
          </option>
        ))}
      </select>
      <select
        value={tahun}
        onChange={(e) => pindah(bulan, Number(e.target.value))}
        className={gaya}
        aria-label="Tahun"
      >
        {daftarTahun.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
