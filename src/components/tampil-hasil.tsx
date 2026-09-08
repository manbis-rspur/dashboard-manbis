"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Menampilkan dokumen hasil susunan AI.
 *
 * Dua tampilan: pratinjau yang sudah rapi, dan teks mentah untuk
 * disalin ke Word atau surel. Keduanya perlu — tabel jauh lebih
 * enak dibaca sudah jadi, tapi yang disalin ke tempat lain harus
 * teks apa adanya.
 */
export function TampilHasil({
  judul,
  hasil,
  namaBerkas = "dokumen",
}: {
  judul: string;
  hasil: string;
  namaBerkas?: string;
}) {
  const [mentah, setMentah] = useState(false);
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(hasil);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  }

  function unduh() {
    const gumpal = new Blob([hasil], { type: "text/markdown;charset=utf-8" });
    const alamat = URL.createObjectURL(gumpal);
    const tautan = document.createElement("a");
    tautan.href = alamat;
    tautan.download = `${namaBerkas}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(tautan);
    tautan.click();
    tautan.remove();
    setTimeout(() => URL.revokeObjectURL(alamat), 1000);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{judul}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMentah((m) => !m)}
            className="rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            {mentah ? "Tampilan rapi" : "Teks mentah"}
          </button>
          <button
            type="button"
            onClick={salin}
            className="rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            {tersalin ? "Tersalin" : "Salin"}
          </button>
          <button
            type="button"
            onClick={unduh}
            className="rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Unduh
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Cetak
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-garis bg-permukaan p-5">
        {mentah ? (
          <pre className="text-xs whitespace-pre-wrap">{hasil}</pre>
        ) : (
          <div className="dokumen">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{hasil}</ReactMarkdown>
          </div>
        )}
      </div>

      <p className="text-xs text-tinta-3">
        Dokumen ini disusun mesin. Periksa dulu nama, tanggal, angka, dan
        keterangan medisnya sebelum diterbitkan.
      </p>
    </section>
  );
}
