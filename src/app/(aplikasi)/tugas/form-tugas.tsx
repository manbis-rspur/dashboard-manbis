"use client";

import { useActionState, useEffect, useState } from "react";
import Ikon from "@/components/ikon";
import { tambahTugas } from "@/lib/tugas-actions";
import { hasilAwal } from "@/lib/hasil";
import { BERULANG, HARI_PILIHAN, JENIS_KETERANGAN, PRIORITAS, SEKALI } from "@/lib/tugas";

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
 * ulang, bukan dikosongkan satu per satu — itu satu-satunya cara
 * useActionState melupakan hasil sebelumnya.
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
  const [hasil, kirim, sedang] = useActionState(tambahTugas, hasilAwal);
  const [berjalan, setBerjalan] = useState(false);

  // Wajib di dalam useEffect: memasang ulang formulir sambil
  // menggambar berarti mengubah komponen induk di tengah
  // penggambaran, dan React menolaknya diam-diam.
  useEffect(() => {
    if (hasil.berhasil) selesai(hasil.berhasil);
  }, [hasil.berhasil, selesai]);

  return (
    <form
      action={kirim}
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

      {/* Tugas berulang punya iramanya sendiri — update
          jadwal dokter tiap Senin sampai Jumat sore dan Minggu sore.
          Tanpa tempat menuliskan harinya, irama itu cuma ada di
          kepala, dan yang cuma ada di kepala itulah yang terlupa. */}
      {berjalan && (
        <fieldset className="rounded-lg border border-garis px-3 py-2.5">
          <legend className="px-1 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Hari kerjanya
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {HARI_PILIHAN.map((h) => (
              <label key={h.n} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="hari" value={h.n} className="accent-hijau" />
                {h.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-tinta-3">
            Boleh dikosongkan. Kalau diisi, tugas ini naik ke daftar hari ini
            setiap hari yang dicentang, sampai ditandai sudah dikerjakan.
          </p>
        </fieldset>
      )}

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

      {hasil.pesan && <p className="text-sm text-merah">{hasil.pesan}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyimpan…" : "Tambahkan"}
        </button>
        <span className="text-xs text-tinta-3">
          {berjalan
            ? "Yang berulang tidak punya tenggat. Kapan ia muncul ditentukan hari kerjanya di atas."
            : anggota.length > 0
              ? "Tanpa tenggat pun boleh. Tugas yang dititipkan ke anggota langsung muncul di lonceng dan daftar tugasnya."
              : "Tanpa tenggat pun boleh — tugasnya tetap muncul hari ini selama sudah lewat tanggal mulainya."}
        </span>
      </div>
    </form>
  );
}
