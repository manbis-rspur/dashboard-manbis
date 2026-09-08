"use client";

import { useActionState, useState } from "react";
import { ambilNomor, type HasilAmbil } from "@/lib/nomor-actions";

export type Jenis = {
  id: number;
  nama: string;
  berikutnya: string | null;
};

const awal: HasilAmbil = { pesan: null, nomor: null };

export function FormAmbil({ daftarJenis }: { daftarJenis: Jenis[] }) {
  const [hasil, kirim, sedang] = useActionState(ambilNomor, awal);
  const [jenisId, setJenisId] = useState(daftarJenis[0]?.id ?? 0);
  const [tersalin, setTersalin] = useState(false);

  const terpilih = daftarJenis.find((j) => j.id === jenisId);

  async function salin(teks: string) {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  }

  if (hasil.nomor) {
    return (
      <div className="rounded border border-garis bg-permukaan p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Nomor Anda
        </p>
        <p className="mt-3 font-mono text-2xl font-semibold tracking-tight break-all">
          {hasil.nomor}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => salin(hasil.nomor!)}
            className="rounded bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {tersalin ? "Tersalin" : "Salin nomor"}
          </button>
          <a
            href="/penomoran/ambil-nomor"
            className="rounded border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Ambil nomor lagi
          </a>
          <a
            href="/penomoran/buku-nomor"
            className="rounded px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Lihat buku nomor
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={kirim} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Jenis dokumen
        </legend>
        {daftarJenis.map((j) => (
          <label
            key={j.id}
            className="flex cursor-pointer items-center gap-3 rounded border border-garis bg-permukaan px-4 py-3 has-checked:border-hijau has-checked:bg-hijau-muda"
          >
            <input
              type="radio"
              name="jenis_id"
              value={j.id}
              checked={jenisId === j.id}
              onChange={() => setJenisId(j.id)}
              className="accent-hijau"
            />
            <span className="font-medium">{j.nama}</span>
            {j.berikutnya && (
              <span className="ml-auto font-mono text-sm text-tinta-3">
                {j.berikutnya}
              </span>
            )}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Perihal
        </span>
        <input
          name="perihal"
          required
          placeholder="Permohonan kerja sama layanan"
          className="rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Ditujukan kepada <span className="normal-case tracking-normal">— boleh dikosongkan</span>
        </span>
        <input
          name="ditujukan_kepada"
          placeholder="PT Sumber Sehat"
          className="rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Tanggal surat
        </span>
        <input
          name="tanggal_surat"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-fit rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
        />
      </label>

      {hasil.pesan && (
        <p className="rounded border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="rounded bg-hijau px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Mengambil…" : "Ambil nomor"}
        </button>
        {terpilih?.berikutnya && !sedang && (
          <p className="text-sm text-tinta-3">
            Ancar-ancar: <span className="font-mono">{terpilih.berikutnya}</span>
          </p>
        )}
      </div>
    </form>
  );
}
