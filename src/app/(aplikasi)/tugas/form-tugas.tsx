"use client";

import { useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { catatLampiran, siapkanLampiran, tambahTugas } from "@/lib/tugas-actions";
import { tugasAwal } from "@/lib/hasil";
import { unggahLewatIzin } from "@/lib/unggah-berkas";
import { ACCEPT_LAMPIRAN, MAKS_LAMPIRAN, jenisLampiranDiterima, ukuranRapi } from "@/lib/lampiran";
import { BERULANG, JENIS_KETERANGAN, PRIORITAS, SEKALI } from "@/lib/tugas";
import { PilihIrama } from "./pilih-irama";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

export type Anggota = { id: number; nama: string; jabatan: string };

type Isian = {
  hariIni: string;
  saya: number;
  /** Kosong bagi yang tidak berhak menitipkan tugas ke orang lain. */
  anggota: Anggota[];
};

/**
 * Menambah satu tugas.
 *
 * Tertutup sampai tombolnya ditekan. Formulir yang berdiri terbuka
 * di atas daftar membuat halamannya panjang dan daftar tugas — yang
 * justru dicari tiap pagi — terdorong ke bawah lipatan layar.
 *
 * Sesudah satu tugas tersimpan, formulirnya dipasang ulang dari
 * bersih tapi tetap terbuka: menulis tugas jarang cuma satu, dan
 * membuka ulang tombolnya tiap kali cuma menambah langkah. Dipasang
 * ulang, bukan dikosongkan satu per satu — kotak isian yang tidak
 * dikendalikan React tidak punya cara lain dibersihkan, dan yang
 * tertinggal akan ikut terkirim pada tugas berikutnya.
 */
export function FormTugas(isian: Isian) {
  const [buka, setBuka] = useState(false);
  const [ulang, setUlang] = useState(0);
  const [kabar, setKabar] = useState<string | null>(null);

  if (!buka) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="flex w-fit items-center gap-2 rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white shadow-lembut hover:opacity-90"
        >
          <Ikon nama="tambah" ukuran={16} />
          Tulis tugas baru
        </button>
        {kabar && <p className="text-sm text-hijau">{kabar}</p>}
      </div>
    );
  }

  return (
    <IsiFormulir
      key={ulang}
      {...isian}
      kabar={kabar}
      tutup={() => setBuka(false)}
      selesai={(pesan) => {
        setKabar(pesan);
        setUlang((n) => n + 1);
      }}
    />
  );
}

function IsiFormulir({
  hariIni,
  saya,
  anggota,
  kabar,
  tutup,
  selesai,
}: Isian & {
  kabar: string | null;
  tutup: () => void;
  selesai: (pesan: string) => void;
}) {
  const [berjalan, setBerjalan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [sedang, mulai] = useTransition();

  /**
   * Tugasnya dibuat dulu, lampirannya menyusul.
   *
   * Urutannya memang harus begitu: lampiran menempel pada sebuah
   * tugas, dan tugas itu baru punya nomor setelah tersimpan. Kalau
   * unggahannya gagal, tugasnya tetap ada — tinggal dilampirkan
   * belakangan lewat panah di barisnya, tidak perlu diketik ulang.
   */
  async function kirim(formData: FormData) {
    setPesan(null);

    const berkas = formData.get("berkas");
    const adaBerkas = berkas instanceof File && berkas.size > 0;
    const tautan = String(formData.get("tautan") ?? "").trim();
    formData.delete("berkas");
    formData.delete("tautan");

    if (adaBerkas) {
      if (!jenisLampiranDiterima(berkas.name)) {
        setPesan("Jenis lampiran itu belum didukung. Video cukup ditempel tautannya.");
        return;
      }
      if (berkas.size > MAKS_LAMPIRAN) {
        setPesan(
          `Lampirannya ${ukuranRapi(berkas.size)} — melebihi batas ${ukuranRapi(MAKS_LAMPIRAN)}.`,
        );
        return;
      }
    }

    setTahap("Menyimpan tugas…");
    const hasil = await tambahTugas(tugasAwal, formData);

    if (hasil.pesan || !hasil.id) {
      setTahap(null);
      setPesan(hasil.pesan ?? "Tugasnya gagal disimpan.");
      return;
    }

    if (adaBerkas || tautan) {
      const lampiran = new FormData();
      lampiran.set("tugas_id", String(hasil.id));

      if (adaBerkas) {
        setTahap(`Mengunggah ${ukuranRapi(berkas.size)}…`);
        const naik = await unggahLewatIzin(berkas, (nama) =>
          siapkanLampiran(hasil.id as number, nama),
        );

        if (naik.jalur === null) {
          setTahap(null);
          setPesan(`Tugasnya tersimpan, tapi lampirannya gagal: ${naik.pesan}`);
          selesai(hasil.berhasil ?? "Tugas tersimpan.");
          return;
        }

        lampiran.set("jalur", naik.jalur);
        lampiran.set("berkas_nama", berkas.name);
        lampiran.set("berkas_ukuran", String(berkas.size));
      }

      if (tautan) lampiran.set("tautan", tautan);

      setTahap("Melampirkan…");
      const catat = await catatLampiran({ pesan: null, berhasil: null }, lampiran);
      if (catat.pesan) {
        setTahap(null);
        setPesan(`Tugasnya tersimpan, tapi lampirannya gagal: ${catat.pesan}`);
        selesai(hasil.berhasil ?? "Tugas tersimpan.");
        return;
      }
    }

    setTahap(null);
    selesai(hasil.berhasil ?? "Tugas tersimpan.");
  }

  return (
    <form
      action={(formData) => mulai(() => kirim(formData))}
      className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="tambah" ukuran={14} />
          Tulis tugas baru
        </h2>
        <button
          type="button"
          onClick={tutup}
          className="text-xs text-tinta-3 hover:text-tinta"
        >
          Tutup
        </button>
      </div>

      {kabar && <p className="text-sm text-hijau">{kabar}</p>}

      <input
        name="judul"
        required
        placeholder="Apa yang harus dikerjakan?"
        className={gaya}
      />

      {/* Kotak bertingkat, bukan satu baris: yang ditulis di sini
          uraian pekerjaan — langkahnya apa saja, ukurannya berapa,
          diserahkan ke siapa. Satu baris memaksa orang meringkas
          sampai keterangannya kehilangan guna. */}
      <textarea
        name="keterangan"
        rows={3}
        placeholder="Uraian pekerjaan — apa yang diminta, hasilnya berupa apa, diserahkan ke siapa (boleh dikosongkan)"
        className={`${gaya} w-full`}
      />

      {/* Dua jenis, karena dua sifat yang berbeda. Yang punya garis
          selesai masuk daftar harian; peran yang berjalan terus punya
          tempatnya sendiri supaya tidak nongkrong di "Hari ini"
          selamanya dan membuat daftarnya berhenti dibaca. */}
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
          Jenis
        </legend>
        <label className="flex flex-1 items-start gap-2.5 rounded-lg border border-garis px-3 py-2 text-sm hover:bg-permukaan-2">
          <input
            type="radio"
            name="jenis"
            value={SEKALI}
            defaultChecked
            onChange={() => setBerjalan(false)}
            className="mt-0.5 accent-hijau"
          />
          <span>
            {SEKALI}
            <span className="block text-xs text-tinta-3">
              {JENIS_KETERANGAN[SEKALI]}
            </span>
          </span>
        </label>
        <label className="flex flex-1 items-start gap-2.5 rounded-lg border border-garis px-3 py-2 text-sm hover:bg-permukaan-2">
          <input
            type="radio"
            name="jenis"
            value={BERULANG}
            onChange={() => setBerjalan(true)}
            className="mt-0.5 accent-hijau"
          />
          <span>
            {BERULANG}
            <span className="block text-xs text-tinta-3">
              {JENIS_KETERANGAN[BERULANG]}
            </span>
          </span>
        </label>
      </fieldset>

      {berjalan && <PilihIrama />}

      <div
        className={`grid gap-3 ${
          anggota.length > 0
            ? berjalan
              ? "sm:grid-cols-3"
              : "sm:grid-cols-4"
            : berjalan
              ? "sm:grid-cols-2"
              : "sm:grid-cols-3"
        }`}
      >
        {/* Hanya Koordinator yang melihat pilihan ini. Bagi yang lain,
            tugas selalu untuk dirinya sendiri dan tidak perlu ada
            pertanyaan yang jawabannya cuma satu. */}
        {anggota.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
              Untuk
            </span>
            <select name="untuk" defaultValue={String(saya)} className={gaya}>
              {anggota.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id === saya ? "Saya sendiri" : a.nama.split(",")[0]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Mulai dikerjakan
          </span>
          <input type="date" name="tanggal_mulai" defaultValue={hariIni} className={gaya} />
        </label>

        {/* Yang berulang tidak punya tenggat — database menolaknya.
            Kotaknya ikut disembunyikan, bukan sekadar diabaikan:
            isian yang boleh diisi tapi tidak berpengaruh apa-apa
            lebih membingungkan daripada isian yang tidak ada. */}
        {!berjalan && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
              Tenggat
            </span>
            <input type="date" name="tenggat" className={gaya} />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Prioritas
          </span>
          <select name="prioritas" defaultValue="Sedang" className={gaya}>
            {PRIORITAS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Lampiran konsep boleh disertakan sejak awal. Tugasnya
          dibuat dulu, lampirannya menyusul — lampiran menempel pada
          sebuah tugas, dan tugas itu baru punya nomor setelah
          tersimpan. */}
      <fieldset className="rounded-lg border border-garis px-3 py-2.5">
        <legend className="px-1 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
          Lampiran konsep
        </legend>
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
            placeholder="Tautan video atau bahan di Drive — https://…"
            className={gaya}
          />
        </div>
        <p className="mt-2 text-xs text-tinta-3">
          Boleh dikosongkan. Dokumen, desain, dan gambar sampai{" "}
          {ukuranRapi(MAKS_LAMPIRAN)}; video cukup ditempel tautannya. Bisa
          ditambah lagi kapan saja lewat panah di baris tugasnya.
        </p>
      </fieldset>

      {pesan && <p className="text-sm text-merah">{pesan}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? (tahap ?? "Menyimpan…") : "Tambahkan"}
        </button>
        <span className="text-xs text-tinta-3">
          {berjalan
            ? "Yang berulang tidak punya tenggat. Kapan ia muncul ditentukan iramanya di atas."
            : anggota.length > 0
              ? "Tanpa tenggat pun boleh. Tugas yang dititipkan ke anggota langsung muncul di lonceng dan daftar tugasnya."
              : "Tanpa tenggat pun boleh — tugasnya tetap muncul hari ini selama sudah lewat tanggal mulainya."}
        </span>
      </div>
    </form>
  );
}
