"use client";

import { useState, useTransition } from "react";
import { catatPublikasi, siapkanUnggahan } from "@/lib/publikasi-actions";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import { ACCEPT, ukuranRapi, MAKS_BERKAS } from "@/lib/publikasi";

const JENIS = [
  "Siaran Pers",
  "Kalender Konten",
  "Rencana Acara",
  "Klarifikasi & Krisis",
  "Naskah Video",
  "Laporan Media Sosial",
  "Lainnya",
] as const;

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Mengunggah dokumen hasil ke arsip.
 *
 * Berkasnya naik dari peramban langsung ke penyimpanan, tidak
 * dititipkan lewat server action — server action hanya menerima
 * kiriman 1 MB, dan di Vercel batas kerasnya 4,5 MB, jauh di bawah
 * ukuran dokumen Word atau PDF yang sebenarnya.
 *
 * Boleh juga tanpa berkas, asalkan tautan Google Docs atau Drive-nya
 * diisi — sebagian dokumen memang lebih masuk akal tinggal di Drive.
 */
export function FormUnggah() {
  const [pesan, setPesan] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  async function kirim(formData: FormData) {
    setPesan(null);
    setBerhasil(null);

    const berkas = formData.get("berkas");
    const adaBerkas = berkas instanceof File && berkas.size > 0;
    const tautan = String(formData.get("tautan_docs") ?? "").trim();

    if (!adaBerkas && !tautan) {
      setPesan("Pilih berkasnya, atau tempel tautan Google Docs/Drive-nya.");
      return;
    }

    if (adaBerkas) {
      setTahap(`Mengunggah ${ukuranRapi(berkas.size)}…`);
      const naik = await unggahLewatIzin(berkas, (nama) =>
        siapkanUnggahan(nama, "arsip"),
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

    // Berkasnya sendiri tidak ikut dikirim ke peladen — sudah naik
    // duluan, dan menyertakannya lagi justru menabrak batas ukuran.
    formData.delete("berkas");

    setTahap("Mencatat ke arsip…");
    const hasil = await catatPublikasi({ pesan: null, berhasil: null }, formData);
    setTahap(null);

    setPesan(hasil.pesan);
    setBerhasil(hasil.berhasil);
  }

  return (
    <form
      action={(formData) => mulai(() => kirim(formData))}
      className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        Unggah dokumen hasil
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <input name="judul" required placeholder="Judul dokumen" className={gaya} />
        <select name="jenis" defaultValue="Lainnya" className={gaya}>
          {JENIS.map((j) => (
            <option key={j}>{j}</option>
          ))}
        </select>
      </div>

      <input
        name="keterangan"
        placeholder="Keterangan singkat — misalnya untuk keperluan apa dan kapan dipakai"
        className={gaya}
      />

      <input
        type="file"
        name="berkas"
        accept={ACCEPT}
        className={`${gaya} file:mr-3 file:rounded file:border-0 file:bg-permukaan-2 file:px-3 file:py-1.5 file:text-sm file:font-medium`}
      />

      <input
        name="tautan_docs"
        type="url"
        placeholder="Tautan Google Docs atau Drive (boleh dikosongkan) — https://…"
        className={gaya}
      />

      {pesan && <p className="text-sm text-merah">{pesan}</p>}
      {berhasil && <p className="text-sm text-hijau">{berhasil}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? (tahap ?? "Menyimpan…") : "Unggah"}
        </button>
        <span className="text-xs text-tinta-3">
          PDF, Word, Excel, atau gambar sampai {ukuranRapi(MAKS_BERKAS)}. Boleh
          berkas saja, tautan saja, atau keduanya.
        </span>
      </div>
    </form>
  );
}
