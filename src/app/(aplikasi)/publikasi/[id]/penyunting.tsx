"use client";

import { useActionState, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { simpanSuntingan } from "@/lib/publikasi-actions";
import { hasilAwal } from "@/lib/hasil";

/**
 * Menyunting isi dokumen di tempat.
 *
 * Naskah dan pratinjaunya ditampilkan berdampingan supaya bentuk
 * tabel dan judul terlihat sambil diketik — teks mentah saja sulit
 * dinilai, terutama untuk kalender konten yang berisi tabel.
 */
export function Penyunting({ id, isiAwal }: { id: number; isiAwal: string }) {
  const [hasil, kirim, sedang] = useActionState(simpanSuntingan, hasilAwal);
  const [isi, setIsi] = useState(isiAwal);
  const berubah = isi !== isiAwal;

  return (
    <form action={kirim} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="isi" value={isi} />

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Naskah
          </span>
          <textarea
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            rows={26}
            spellCheck
            className="w-full rounded-lg border border-garis bg-permukaan px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Pratinjau
          </span>
          <div className="h-full overflow-x-auto rounded-xl shadow-lembut border border-garis bg-permukaan p-4">
            <div className="dokumen">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{isi}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Catatan perubahan <span className="normal-case tracking-normal">— boleh dikosongkan</span>
        </span>
        <input
          name="catatan"
          placeholder="Misalnya: tanggal pekan ketiga diperbaiki, judul dipersingkat"
          className="rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda"
        />
      </label>

      {hasil.pesan && (
        <p className="rounded-lg border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang || !berubah}
          className="rounded-lg bg-hijau px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {sedang ? "Menyimpan…" : "Simpan suntingan"}
        </button>
        {berubah && !sedang && (
          <span className="text-xs text-tinta-3">Ada perubahan yang belum disimpan.</span>
        )}
      </div>
    </form>
  );
}
