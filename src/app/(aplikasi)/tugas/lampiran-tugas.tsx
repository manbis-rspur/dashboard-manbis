"use client";

import { useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { catatLampiran, hapusLampiran, siapkanLampiran } from "@/lib/tugas-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import {
  ACCEPT_LAMPIRAN,
  MAKS_LAMPIRAN,
  jenisLampiranDiterima,
  ukuranRapi,
  type Lampiran,
} from "@/lib/lampiran";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Lampiran hasil pekerjaan.
 *
 * Dua bentuk, dan bedanya bukan selera. Berkas ringan — desain
 * leaflet, spanduk, PDF brosur — disimpan rumah sakit. Video ditaruh
 * di tempat lain lalu ditempel tautannya: satu video berukuran
 * puluhan megabita, dan penyimpanan yang penuh ikut memacetkan arsip
 * publikasi yang menumpang di sana.
 *
 * Keduanya tidak wajib. Wadahnya ada, kosong pun tidak apa-apa.
 */
export function LampiranTugas({
  tugasId,
  daftar,
}: {
  tugasId: number;
  daftar: Lampiran[];
}) {
  const [pesan, setPesan] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  async function kirim(formData: FormData) {
    setPesan(null);
    setBerhasil(null);

    const berkas = formData.get("berkas");
    const adaBerkas = berkas instanceof File && berkas.size > 0;
    const tautan = String(formData.get("tautan") ?? "").trim();

    if (!adaBerkas && !tautan) {
      setPesan("Pilih berkasnya, atau tempel tautannya.");
      return;
    }

    if (adaBerkas) {
      if (!jenisLampiranDiterima(berkas.name)) {
        setPesan("Jenis berkas itu belum didukung. Video cukup ditempel tautannya.");
        return;
      }
      if (berkas.size > MAKS_LAMPIRAN) {
        setPesan(
          `Berkasnya ${ukuranRapi(berkas.size)} — melebihi batas ${ukuranRapi(
            MAKS_LAMPIRAN,
          )}. Taruh di Drive lalu tempel tautannya.`,
        );
        return;
      }

      setTahap("Mengunggah…");
      const naik = await unggahLewatIzin(berkas, (nama) =>
        siapkanLampiran(tugasId, nama),
      );
      setTahap(null);

      if (naik.jalur === null) {
        setPesan(naik.pesan);
        return;
      }

      formData.set("jalur", naik.jalur);
      formData.set("berkas_nama", berkas.name);
      formData.set("berkas_ukuran", String(berkas.size));
    }

    // Berkasnya sudah naik duluan; menyertakannya lagi justru
    // menabrak batas ukuran kiriman.
    formData.delete("berkas");
    formData.set("tugas_id", String(tugasId));

    setTahap("Mencatat…");
    const hasil = await catatLampiran({ pesan: null, berhasil: null }, formData);
    setTahap(null);

    setPesan(hasil.pesan);
    setBerhasil(hasil.berhasil);
  }

  return (
    <div className="mt-4 border-t border-garis pt-4">
      <p className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
        <Ikon nama="publikasi" ukuran={13} />
        Lampiran hasil
        <span className="font-normal normal-case tracking-normal">
          {daftar.length > 0 ? daftar.length : "belum ada"}
        </span>
      </p>

      {daftar.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {daftar.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Ikon nama={l.jenis === "Tautan" ? "surat" : "template"} ukuran={14} />
              {l.jenis === "Tautan" ? (
                <a
                  href={l.tautan ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-auto text-hijau hover:underline"
                >
                  {l.judul || l.tautan}
                </a>
              ) : (
                <a
                  href={`/tugas/lampiran/${l.id}`}
                  className="mr-auto text-hijau hover:underline"
                >
                  {l.judul || l.berkas_nama}
                  <span className="ml-2 text-xs text-tinta-3">
                    {ukuranRapi(l.berkas_ukuran)}
                  </span>
                </a>
              )}
              <form action={hapusLampiran}>
                <input type="hidden" name="id" value={l.id} />
                <button type="submit" className="text-xs text-tinta-3 hover:text-merah">
                  hapus
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={(formData) => mulai(() => kirim(formData))}
        className="mt-3 flex flex-col gap-2"
      >
        <input name="judul" placeholder="Nama lampiran (boleh dikosongkan)" className={gaya} />

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="file"
            name="berkas"
            accept={ACCEPT_LAMPIRAN}
            className={`${gaya} file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
          />
          <input
            name="tautan"
            type="url"
            placeholder="Tautan video atau hasil yang sudah tayang — https://…"
            className={gaya}
          />
        </div>

        {pesan && <p className="text-sm text-merah">{pesan}</p>}
        {berhasil && <p className="text-sm text-hijau">{berhasil}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sedang}
            className="w-fit rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-60"
          >
            {sedang ? (tahap ?? "Menyimpan…") : "Lampirkan"}
          </button>
          <span className="text-xs text-tinta-3">
            Desain, PDF, dan gambar sampai {ukuranRapi(MAKS_LAMPIRAN)}. Video
            taruh di Drive lalu tempel tautannya.
          </span>
        </div>
      </form>
    </div>
  );
}
