"use client";

import { useActionState } from "react";
import Ikon from "@/components/ikon";
import { simpanTinjauan } from "@/lib/publikasi-actions";
import { hasilAwal } from "@/lib/hasil";

const STATUS = ["Menunggu", "Perlu revisi", "Disetujui"] as const;

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Tindak lanjut Koordinator atas sebuah dokumen.
 *
 * Yang berhak memutuskan melihat formulirnya; yang mengunggah
 * melihat putusannya saja. Dua tampilan dari satu keadaan, bukan dua
 * halaman berbeda — supaya keduanya membaca hal yang sama.
 */
export function PanelTinjauan({
  id,
  status,
  catatan,
  tenggat,
  peninjau,
  ditinjauPada,
  bolehMenilai,
}: {
  id: number;
  status: string;
  catatan: string | null;
  tenggat: string | null;
  peninjau: string | null;
  ditinjauPada: string | null;
  bolehMenilai: boolean;
}) {
  const [hasil, kirim, sedang] = useActionState(simpanTinjauan, hasilAwal);

  const warna =
    status === "Disetujui"
      ? "border-hijau bg-hijau-muda/50 text-hijau"
      : status === "Perlu revisi"
        ? "border-oker bg-[#f6efe2] text-oker"
        : "border-garis bg-permukaan-2 text-tinta-3";

  return (
    <section className="rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        <Ikon nama="centang" ukuran={14} />
        Tindak lanjut Koordinator
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${warna}`}>
          {status}
        </span>
        {tenggat && (
          <span className="flex items-center gap-1.5 text-xs text-tinta-3">
            <Ikon nama="waktu" ukuran={13} />
            Tenggat{" "}
            {new Date(tenggat).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
        {peninjau && ditinjauPada && (
          <span className="text-xs text-tinta-3">
            oleh {peninjau},{" "}
            {new Date(ditinjauPada).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {catatan && (
        <p className="mt-3 border-l-2 border-garis pl-3 text-sm text-tinta-2">
          {catatan}
        </p>
      )}

      {!bolehMenilai ? (
        <p className="mt-3 text-xs text-tinta-3">
          {status === "Menunggu"
            ? "Belum ditinjau Koordinator."
            : "Putusan ini dituliskan Koordinator; hanya beliau yang bisa mengubahnya."}
        </p>
      ) : (
        <form action={kirim} className="mt-4 flex flex-col gap-3 border-t border-garis pt-4">
          <input type="hidden" name="id" value={id} />

          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                Putusan
              </span>
              <select name="status_tinjauan" defaultValue={status} className={gaya}>
                {STATUS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                Tenggat
              </span>
              <input
                type="date"
                name="tenggat"
                defaultValue={tenggat ?? ""}
                className={gaya}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
              Catatan
            </span>
            <textarea
              name="catatan_tinjauan"
              rows={3}
              defaultValue={catatan ?? ""}
              placeholder="Apa yang sudah benar, apa yang perlu diperbaiki, dan kapan ditunggu."
              className={gaya}
            />
          </label>

          {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
          {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

          <button
            type="submit"
            disabled={sedang}
            className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {sedang ? "Menyimpan…" : "Simpan tindak lanjut"}
          </button>
        </form>
      )}
    </section>
  );
}
