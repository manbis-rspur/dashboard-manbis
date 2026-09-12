"use client";

import { useActionState } from "react";
import Ikon from "@/components/ikon";
import { hapusTugas, ubahStatusTugas, ubahTugas } from "@/lib/tugas-actions";
import { hasilAwal } from "@/lib/hasil";
import {
  JENIS,
  PRIORITAS,
  STATUS,
  sebutTenggat,
  warnaPrioritas,
  warnaStatus,
  type Tugas,
} from "@/lib/tugas";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Satu baris tugas.
 *
 * Ringkasannya cukup untuk memutuskan — judul, prioritas, tenggat,
 * status — dan tombol yang paling sering ditekan ada di barisnya
 * sendiri. Sisanya bersembunyi di balik panah, karena daftar yang
 * penuh kotak isian tidak bisa dibaca sekilas, dan yang tidak bisa
 * dibaca sekilas tidak akan dibuka tiap pagi.
 */
export function BarisTugas({ t, hariIni }: { t: Tugas; hariIni: string }) {
  const [hasil, kirim, sedang] = useActionState(ubahTugas, hasilAwal);

  const terbuka = t.status !== "Selesai" && t.status !== "Batal";
  const lewat = terbuka && t.tenggat !== null && t.tenggat < hariIni;
  const berjalan = t.jenis === "Berjalan";

  return (
    <li
      className={`rounded-xl border bg-permukaan shadow-lembut ${
        lewat ? "border-merah" : "border-garis"
      }`}
    >
      <details className="group">
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 marker:content-['']">
          <span className="min-w-0 flex-1">
            <span
              className={`block font-medium ${
                t.status === "Batal" ? "text-tinta-3 line-through" : ""
              }`}
            >
              {t.judul}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className={lewat ? "font-semibold text-merah" : "text-tinta-3"}>
                {berjalan ? "berjalan terus" : sebutTenggat(t.tenggat, hariIni)}
              </span>
              {t.prioritas !== "Sedang" && (
                <span
                  className={`rounded-full border px-1.5 py-0.5 ${warnaPrioritas(t.prioritas)}`}
                >
                  {t.prioritas}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 font-medium ${warnaStatus(t.status)}`}>
                {t.status}
              </span>
            </span>
          </span>

          {terbuka && !berjalan && (
            <span className="flex items-center gap-1.5">
              {t.status !== "Dikerjakan" && (
                <form action={ubahStatusTugas}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="status" value="Dikerjakan" />
                  <button
                    type="submit"
                    className="rounded-lg border border-garis px-2.5 py-1 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                  >
                    Mulai
                  </button>
                </form>
              )}
              <form action={ubahStatusTugas}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="status" value="Selesai" />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-hijau px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  <Ikon nama="centang" ukuran={13} />
                  Selesai
                </button>
              </form>
            </span>
          )}
        </summary>

        <div className="border-t border-garis px-4 py-4">
          {t.keterangan && (
            <p className="mb-3 text-sm whitespace-pre-wrap text-tinta-2">
              {t.keterangan}
            </p>
          )}

          <form action={kirim} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={t.id} />

            <input name="judul" defaultValue={t.judul} required className={gaya} />
            <textarea
              name="keterangan"
              rows={3}
              defaultValue={t.keterangan ?? ""}
              placeholder="Uraian pekerjaan — apa yang diminta, hasilnya berupa apa"
              className={`${gaya} w-full`}
            />

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                  Mulai
                </span>
                <input
                  type="date"
                  name="tanggal_mulai"
                  defaultValue={t.tanggal_mulai}
                  className={gaya}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                  Tenggat
                </span>
                <input
                  type="date"
                  name="tenggat"
                  defaultValue={t.tenggat ?? ""}
                  className={gaya}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                  Prioritas
                </span>
                <select name="prioritas" defaultValue={t.prioritas} className={gaya}>
                  {PRIORITAS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                  Status
                </span>
                <select name="status" defaultValue={t.status} className={gaya}>
                  {STATUS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                  Jenis
                </span>
                <select name="jenis" defaultValue={t.jenis} className={gaya}>
                  {JENIS.map((j) => (
                    <option key={j} value={j}>
                      {j === "Berjalan" ? "Peran berjalan" : "Tugas"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <textarea
              name="catatan_hasil"
              rows={2}
              defaultValue={t.catatan_hasil ?? ""}
              placeholder="Catatan hasil — apa yang sudah dikerjakan, apa yang menghambat"
              className={`${gaya} w-full`}
            />

            {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}
            {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={sedang}
                className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {sedang ? "Menyimpan…" : "Simpan perubahan"}
              </button>
            </div>
          </form>

          <form action={hapusTugas} className="mt-3 border-t border-garis pt-3">
            <input type="hidden" name="id" value={t.id} />
            <button type="submit" className="text-xs text-tinta-3 hover:text-merah">
              hapus tugas ini
            </button>
            <span className="ml-2 text-xs text-tinta-3">
              — untuk yang salah tulis. Yang batal dikerjakan sebaiknya diberi
              status Batal, supaya jejaknya tetap ada saat menyusun laporan.
            </span>
          </form>
        </div>
      </details>
    </li>
  );
}
