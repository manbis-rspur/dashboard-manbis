"use client";

import { useActionState } from "react";
import Ikon from "@/components/ikon";
import { tutupHari } from "@/lib/tugas-actions";
import { hasilAwal } from "@/lib/hasil";
import { STATUS, sebutTenggat, type Tugas } from "@/lib/tugas";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Ritual sore: memberi status seluruh tugas hari ini sekaligus.
 *
 * Satu layar, satu tombol. Kalau tiap tugas harus dibuka sendiri
 * untuk diberi status, kebiasaan ini tidak bertahan seminggu — dan
 * yang hilang bukan cuma catatannya, melainkan kebiasaan memeriksa
 * daftar sebelum pulang.
 */
export function TutupHari({ daftar, hariIni }: { daftar: Tugas[]; hariIni: string }) {
  const [hasil, kirim, sedang] = useActionState(tutupHari, hasilAwal);

  if (daftar.length === 0) {
    return (
      <section className="rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="centang" ukuran={14} />
          Tutup hari
        </h2>
        <p className="mt-2 text-sm text-tinta-2">
          Tidak ada tugas yang menunggu hari ini. Selamat pulang.
        </p>
      </section>
    );
  }

  return (
    <form
      action={kirim}
      className="flex flex-col gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <div>
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="centang" ukuran={14} />
          Tutup hari
        </h2>
        <p className="mt-1.5 text-sm text-tinta-2">
          Sebelum pulang, beri status tiap pekerjaan hari ini. Yang belum
          selesai tidak hilang — besok masih di daftar, dan yang lewat tenggat
          naik ke paling atas.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {daftar.map((t) => (
          <li key={t.id} className="border-l-2 border-garis pl-3">
            <p className="text-sm font-medium">{t.judul}</p>
            <p className="mb-2 text-xs text-tinta-3">
              {sebutTenggat(t.tenggat, hariIni)}
            </p>
            <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <select
                name={`status_${t.id}`}
                defaultValue={t.status}
                className={gaya}
                aria-label={`Status ${t.judul}`}
              >
                {STATUS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                name={`catatan_${t.id}`}
                defaultValue={t.catatan_hasil ?? ""}
                placeholder="Catatan singkat — sampai mana, apa yang menghambat"
                className={gaya}
              />
            </div>
          </li>
        ))}
      </ul>

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : `Tutup hari — ${daftar.length} tugas`}
      </button>
    </form>
  );
}
