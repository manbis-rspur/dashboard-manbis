"use client";

import { useActionState } from "react";
import { simpanTautanDocs } from "@/lib/publikasi-actions";
import { hasilAwal } from "@/lib/hasil";

/**
 * Menyimpan tautan Google Docs atau Drive sebuah dokumen.
 *
 * Berkasnya tetap tinggal di Drive milik yang mengunggah; di sini
 * hanya alamatnya. Sengaja begitu — menyambungkan Drive API berarti
 * bergantung pada izin Workspace rumah sakit, yang bisa dicabut
 * sewaktu-waktu tanpa pemberitahuan.
 */
export function FormTautan({
  id,
  tautanAwal,
}: {
  id: number;
  tautanAwal: string | null;
}) {
  const [hasil, kirim, sedang] = useActionState(simpanTautanDocs, hasilAwal);

  return (
    <section className="rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        Google Docs / Drive
      </h2>

      {tautanAwal && (
        <a
          href={tautanAwal}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Buka di Google Docs / Drive
        </a>
      )}

      <form action={kirim} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <div className="flex flex-wrap gap-2">
          <input
            name="tautan_docs"
            type="url"
            defaultValue={tautanAwal ?? ""}
            placeholder="https://docs.google.com/… atau https://drive.google.com/…"
            className="min-w-56 flex-1 rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
          />
          <button
            type="submit"
            disabled={sedang}
            className="rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-60"
          >
            {sedang ? "Menyimpan…" : tautanAwal ? "Ganti tautan" : "Simpan tautan"}
          </button>
        </div>

        {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
        {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

        <p className="text-xs text-tinta-3">
          Taruh berkasnya di Google Drive — boleh dibuka dulu dengan Google
          Docs, boleh juga tautan berkas Drive apa adanya — lalu salin
          alamatnya dari bilah alamat peramban. Pastikan izin berbaginya
          terbuka untuk yang perlu membacanya. Suntingan yang dilakukan di
          sana tidak ikut tercatat pada riwayat perubahan di halaman ini.
        </p>
      </form>
    </section>
  );
}
