"use client";

import { useActionState } from "react";
import Ikon from "@/components/ikon";
import { tambahTugas } from "@/lib/tugas-actions";
import { hasilAwal } from "@/lib/hasil";
import { PRIORITAS } from "@/lib/tugas";

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Menambah satu tugas.
 *
 * Sengaja terbuka terus, bukan bersembunyi di balik tombol: menulis
 * tugas harus lebih mudah daripada mengingatnya. Satu langkah
 * tambahan saja sudah cukup membuat orang menunda menulis, dan yang
 * ditunda ditulis akhirnya tidak pernah ditulis.
 */
export type Anggota = { id: number; nama: string; jabatan: string };

export function FormTugas({
  hariIni,
  saya,
  anggota,
}: {
  hariIni: string;
  saya: number;
  /** Kosong bagi yang tidak berhak menitipkan tugas ke orang lain. */
  anggota: Anggota[];
}) {
  const [hasil, kirim, sedang] = useActionState(tambahTugas, hasilAwal);

  return (
    <form
      action={kirim}
      className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
    >
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
        <Ikon nama="tambah" ukuran={14} />
        Tulis tugas baru
      </h2>

      <input
        name="judul"
        required
        placeholder="Apa yang harus dikerjakan?"
        className={gaya}
      />

      <input
        name="keterangan"
        placeholder="Keterangan — untuk siapa, hasilnya berupa apa (boleh dikosongkan)"
        className={gaya}
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
            value="Tugas"
            defaultChecked
            className="mt-0.5 accent-hijau"
          />
          <span>
            Tugas
            <span className="block text-xs text-tinta-3">
              Ada hasilnya, ada selesainya
            </span>
          </span>
        </label>
        <label className="flex flex-1 items-start gap-2.5 rounded-lg border border-garis px-3 py-2 text-sm hover:bg-permukaan-2">
          <input type="radio" name="jenis" value="Berjalan" className="mt-0.5 accent-hijau" />
          <span>
            Peran berjalan
            <span className="block text-xs text-tinta-3">
              Jabatan atau pekerjaan tanpa garis selesai
            </span>
          </span>
        </label>
      </fieldset>

      <div className={`grid gap-3 ${anggota.length > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
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

        <label className="flex flex-col gap-1.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Tenggat
          </span>
          <input type="date" name="tenggat" className={gaya} />
        </label>

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
      {hasil.berhasil && <p className="text-sm text-hijau">{hasil.berhasil}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={sedang}
          className="w-fit rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyimpan…" : "Tambahkan"}
        </button>
        <span className="text-xs text-tinta-3">
          {anggota.length > 0
            ? "Tanpa tenggat pun boleh. Tugas yang dititipkan ke anggota langsung muncul di lonceng dan daftar tugasnya."
            : "Tanpa tenggat pun boleh — tugasnya tetap muncul hari ini selama sudah lewat tanggal mulainya."}
        </span>
      </div>
    </form>
  );
}
