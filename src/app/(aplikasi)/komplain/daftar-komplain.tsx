"use client";

import { useState } from "react";
import Link from "next/link";
import { STATUS, GRADING, pecahKategori } from "@/lib/komplain-pilihan";

export type BarisKomplain = {
  id: number;
  kode: string;
  waktu: string;
  pasien: string;
  pelapor: string;
  kategori: string;
  status: string;
  grading: string | null;
  slaJam: number | null;
  slaStatus: string | null;
  detail: string;
};

const waktuSingkat = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function warnaStatus(status: string) {
  if (status === "Selesai") return "bg-hijau-muda text-hijau";
  if (status === "Diproses") return "bg-[#f0e7d4] text-oker";
  return "bg-permukaan-2 text-tinta-2";
}

function warnaGrading(grading: string | null) {
  if (grading === "Merah") return "bg-[#f1dfe1] text-merah";
  if (grading === "Kuning") return "bg-[#f0e7d4] text-oker";
  if (grading === "Hijau") return "bg-hijau-muda text-hijau";
  return "bg-permukaan-2 text-tinta-3";
}

const gayaSaring =
  "rounded border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export function DaftarKomplain({ baris }: { baris: BarisKomplain[] }) {
  const [cari, setCari] = useState("");
  const [status, setStatus] = useState("");
  const [grading, setGrading] = useState("");

  const q = cari.trim().toLowerCase();
  const tersaring = baris.filter((b) => {
    const teks = [b.kode, b.pasien, b.pelapor, b.kategori, b.detail]
      .join(" ")
      .toLowerCase();
    return (
      (!q || teks.includes(q)) &&
      (!status || b.status === status) &&
      (!grading || b.grading === grading)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nomor, pasien, pelapor, kategori…"
          className={`${gayaSaring} min-w-56 flex-1`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={gayaSaring}>
          <option value="">Semua status</option>
          {STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={grading} onChange={(e) => setGrading(e.target.value)} className={gayaSaring}>
          <option value="">Semua grading</option>
          {GRADING.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        {(cari || status || grading) && (
          <button
            type="button"
            onClick={() => {
              setCari("");
              setStatus("");
              setGrading("");
            }}
            className="rounded-lg border border-garis px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Bersihkan
          </button>
        )}
      </div>

      {tersaring.length === 0 ? (
        <div className="rounded-lg border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">
            {baris.length === 0 ? "Belum ada komplain tercatat." : "Tidak ada yang cocok."}
          </p>
          <p className="mt-1 text-sm text-tinta-3">
            {baris.length === 0
              ? "Komplain pertama akan muncul di sini setelah dicatat."
              : "Coba ubah kata kuncinya atau bersihkan saringan."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lembut border border-garis bg-permukaan">
          <table className="w-full min-w-[58rem] border-collapse text-sm">
            <thead>
              <tr className="bg-permukaan-2 text-left text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                <th className="border-b border-garis px-4 py-2.5">Nomor</th>
                <th className="border-b border-garis px-4 py-2.5">Waktu</th>
                <th className="border-b border-garis px-4 py-2.5">Pasien</th>
                <th className="border-b border-garis px-4 py-2.5">Kategori</th>
                <th className="border-b border-garis px-4 py-2.5">Status</th>
                <th className="border-b border-garis px-4 py-2.5">Grading</th>
                <th className="border-b border-garis px-4 py-2.5">SLA</th>
                <th className="border-b border-garis px-4 py-2.5"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {tersaring.map((b) => (
                <tr key={b.id} className="hover:bg-permukaan-2">
                  <td className="border-b border-garis px-4 py-2.5 font-mono whitespace-nowrap">
                    <Link href={`/komplain/${b.id}`} className="font-medium hover:underline">
                      {b.kode}
                    </Link>
                  </td>
                  <td className="border-b border-garis px-4 py-2.5 whitespace-nowrap text-tinta-2">
                    {waktuSingkat.format(new Date(b.waktu))}
                  </td>
                  <td className="border-b border-garis px-4 py-2.5">
                    {b.pasien}
                    <span className="block text-xs text-tinta-3">dilaporkan {b.pelapor}</span>
                  </td>
                  {/* Kategorinya bisa lebih dari satu; ditampilkan
                      sebagai lencana terpisah supaya terbaca sekilas,
                      dan tanpa nowrap supaya tidak melebarkan tabel. */}
                  <td className="border-b border-garis px-4 py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {pecahKategori(b.kategori).map((k) => (
                        <span
                          key={k}
                          className="rounded-full bg-permukaan-2 px-2 py-0.5 text-xs text-tinta-2"
                        >
                          {k}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="border-b border-garis px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${warnaStatus(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="border-b border-garis px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${warnaGrading(b.grading)}`}>
                      {b.grading ?? "Belum"}
                    </span>
                  </td>
                  <td className="border-b border-garis px-4 py-2.5 whitespace-nowrap">
                    {b.slaJam === null ? (
                      <span className="text-tinta-3">belum ditanggapi</span>
                    ) : (
                      <span className={b.slaStatus === "Breach" ? "text-merah" : "text-hijau"}>
                        {b.slaJam} jam
                      </span>
                    )}
                  </td>
                  <td className="border-b border-garis px-4 py-2.5 text-right whitespace-nowrap">
                    <Link
                      href={`/komplain/${b.id}`}
                      className={
                        b.status === "Selesai"
                          ? "rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                          : "rounded bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      }
                    >
                      {b.status === "Selesai" ? "Lihat" : "Tindak lanjut"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-tinta-3">
        {tersaring.length} dari {baris.length} komplain ditampilkan.
      </p>
    </div>
  );
}
