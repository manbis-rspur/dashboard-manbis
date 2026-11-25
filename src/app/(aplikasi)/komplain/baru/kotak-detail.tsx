"use client";

import { useRef, useState, useTransition } from "react";
import { rapikanMekanis } from "@/lib/bahasa-baku";
import { usulkanBahasaBaku } from "@/lib/komplain-actions";

/**
 * Kotak Detail komplain dengan dua lapis perapian bahasa.
 *
 * LAPIS 1 - mekanis, otomatis. Singkatan dan tanda baca, saat
 * kursor meninggalkan kotak. Tidak ada makna yang bergeser, jadi
 * tidak perlu izin; cukup diberi tahu dan bisa diurungkan.
 * Sengaja tidak berjalan saat mengetik: teks yang berubah di
 * bawah kursor membuat orang kehilangan tempat.
 *
 * LAPIS 2 - AI, diminta. Menyusun ulang kalimat memang menggeser
 * bentuk, dan ini laporan orang, jadi tidak boleh terjadi diam-
 * diam. Petugas menekan tombolnya, melihat sebelum dan sesudahnya
 * berdampingan, lalu memutuskan. Yang diterima menyimpan kata
 * asli pelapor di kolom tersendiri -- kalau kelak komplainnya
 * dipersoalkan, yang harus bisa ditunjukkan adalah kalimat yang
 * betul-betul mereka sampaikan.
 */
export function KotakDetail({
  nama = "detail_masalah",
  awal = "",
  asliAwal = null,
  gaya,
}: {
  nama?: string;
  awal?: string;
  asliAwal?: string | null;
  gaya: string;
}) {
  const [nilai, setNilai] = useState(awal);
  const [sebelumnya, setSebelumnya] = useState<string | null>(null);
  const [jumlah, setJumlah] = useState(0);

  const [usulan, setUsulan] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();

  // Kata asli pelapor. Terisi begitu usulan AI diterima, dan
  // tetap terbawa pada komplain lama yang dulu pernah dirapikan.
  const [asli, setAsli] = useState<string | null>(asliAwal);

  const kotak = useRef<HTMLTextAreaElement>(null);

  function rapikan() {
    const hasil = rapikanMekanis(nilai);
    if (hasil.jumlah === 0 || hasil.teks === nilai) return;
    setSebelumnya(nilai);
    setNilai(hasil.teks);
    setJumlah(hasil.jumlah);
  }

  function urungkan() {
    if (sebelumnya === null) return;
    setNilai(sebelumnya);
    setSebelumnya(null);
    setJumlah(0);
    kotak.current?.focus();
  }

  function mintaAI() {
    setPesan(null);
    setUsulan(null);
    const teks = nilai.trim();
    if (teks === "") {
      setPesan("Tulis dulu detail komplainnya.");
      return;
    }
    mulai(async () => {
      const jawab = await usulkanBahasaBaku(teks);
      if (jawab.teks) setUsulan(jawab.teks);
      else setPesan(jawab.pesan);
    });
  }

  function terima() {
    if (usulan === null) return;
    // Yang disimpan sebagai "asli" adalah kata pelapor yang
    // paling awal, bukan hasil perapian sebelumnya.
    if (asli === null) setAsli(nilai);
    setNilai(usulan);
    setUsulan(null);
    setSebelumnya(null);
    setJumlah(0);
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={kotak}
        name={nama}
        required
        rows={6}
        value={nilai}
        onChange={(e) => {
          setNilai(e.target.value);
          if (sebelumnya !== null) setSebelumnya(null);
          if (usulan !== null) setUsulan(null);
        }}
        onBlur={rapikan}
        className={gaya}
      />

      {asli !== null && (
        <input type="hidden" name="detail_masalah_asli" value={asli} />
      )}

      {sebelumnya !== null && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-permukaan-2 px-3 py-2 text-xs text-tinta-2">
          <span>
            {jumlah === 1
              ? "Satu singkatan dan tanda baca dirapikan."
              : `${jumlah} singkatan dan tanda baca dirapikan.`}{" "}
            Isi dan maknanya tidak diubah.
          </span>
          <button
            type="button"
            onClick={urungkan}
            className="font-semibold text-hijau underline underline-offset-2 hover:opacity-80"
          >
            Urungkan
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={mintaAI}
          disabled={menunggu}
          className="rounded-lg border border-garis bg-permukaan px-3 py-1.5 text-xs font-medium text-tinta transition hover:border-hijau hover:text-hijau disabled:opacity-60"
        >
          {menunggu ? "Sedang merapikan…" : "Rapikan bahasa dengan AI"}
        </button>
        <span className="text-xs text-tinta-3">
          Hasilnya ditampilkan dulu untuk Anda setujui.
        </span>
      </div>

      {pesan && <p className="text-xs text-oker">{pesan}</p>}

      {usulan !== null && (
        <div className="rounded-xl border border-garis bg-permukaan-2 p-3">
          <p className="mb-2 text-xs font-semibold text-tinta">
            Bandingkan dulu sebelum dipakai
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-garis bg-permukaan p-2.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-tinta-3">
                Tulisan Anda sekarang
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-tinta-2">
                {nilai}
              </p>
            </div>
            <div className="rounded-lg border border-hijau bg-permukaan p-2.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-hijau">
                Usulan bahasa baku
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-tinta">
                {usulan}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={terima}
              className="rounded-lg bg-hijau px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            >
              Pakai usulan ini
            </button>
            <button
              type="button"
              onClick={() => setUsulan(null)}
              className="rounded-lg border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 transition hover:border-tinta-3"
            >
              Biarkan tulisan saya
            </button>
            <span className="text-[11px] text-tinta-3">
              Kalau dipakai, kata asli pelapor tetap tersimpan.
            </span>
          </div>
        </div>
      )}

      <span className="text-xs text-tinta-3">
        Tulis apa adanya seperti yang disampaikan pelapor. Singkatan seperti
        &ldquo;yg&rdquo; dan &ldquo;tdk&rdquo; dibentangkan sendiri saat Anda
        pindah dari kotak ini.
      </span>
    </div>
  );
}
