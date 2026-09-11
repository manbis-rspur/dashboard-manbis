"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { simpanTindakLanjut } from "@/lib/komplain-actions";
import { komplainAwal } from "@/lib/hasil";
import { HASIL, STATUS, GRADING, KEPUASAN, KOMITE } from "@/lib/komplain-pilihan";

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda disabled:bg-permukaan-2 disabled:text-tinta-3";

export type NilaiAwal = {
  id: number;
  /** Bentuk isian tanggal-jam WIB. */
  waktuPelaporan: string;
  /** Bentuk isian tanggal-jam WIB; kosong bila belum pernah ditanggapi. */
  waktuDitanggapi: string;
  /** Waktu sekarang, dihitung peladen — lihat catatan di bawah. */
  waktuSekarang: string;
  pasienNoRm: string;
  penerimaNama: string;
  penerimaUnit: string;
  penerimaJabatan: string;
  jawaban: string;
  hasil: string;
  status: string;
  grading: string;
  kepuasan: string;
  evaluasi: string;
  perluEskalasi: boolean;
  jenisKomite: string;
  tglLaporKomite: string;
};

function Label({ judul, anak }: { judul: string; anak: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
        {judul}
      </span>
      {anak}
    </label>
  );
}

export function FormTindakLanjut({ awal }: { awal: NilaiAwal }) {
  const router = useRouter();
  const [hasil, kirim, sedang] = useActionState(simpanTindakLanjut, komplainAwal);
  const [eskalasi, setEskalasi] = useState(awal.perluEskalasi);

  // Memuat ulang data halaman setelah tersimpan, supaya angka SLA dan
  // riwayat di sebelahnya ikut terbarui.
  //
  // Wajib di dalam useEffect: memanggil router.refresh() sambil
  // menggambar berarti mengubah komponen lain di tengah penggambaran —
  // React menolaknya, dan formulirnya berhenti menanggapi tanpa pesan
  // apa pun. Itulah sebabnya tombol simpan terasa mati.
  useEffect(() => {
    if (hasil.kode) router.refresh();
  }, [hasil.kode, router]);

  return (
    <form action={kirim} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={awal.id} />

      {/* Tanggapan bisa saja sudah diberikan lewat telepon kemarin
          dan baru sempat dicatat hari ini. Jam sistem tidak tahu itu,
          jadi yang diketik petugas yang dipakai — termasuk oleh
          hitungan SLA dan formulir cetak.

          Nilai bawaannya dihitung peladen, bukan di sini: kalau
          dihitung dua kali, angka yang digambar peladen dan yang
          digambar peramban bisa berbeda semenit, dan React
          mengosongkan isiannya karena dianggap tidak cocok. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Label
          judul="Waktu pelaporan diterima"
          anak={
            <input
              name="waktu_pelaporan"
              type="datetime-local"
              defaultValue={awal.waktuPelaporan}
              className={gaya}
            />
          }
        />
        <Label
          judul="Waktu ditanggapi"
          anak={
            <input
              name="waktu_ditanggapi"
              type="datetime-local"
              defaultValue={awal.waktuDitanggapi || awal.waktuSekarang}
              className={gaya}
            />
          }
        />
      </div>
      <p className="-mt-3 text-xs text-tinta-3">
        Keduanya boleh dikoreksi kapan saja. Selisihnya yang dipakai
        menghitung SLA, dan keduanya yang tercetak di formulir resmi.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label judul="No. rekam medis" anak={<input name="pasien_no_rm" defaultValue={awal.pasienNoRm} className={gaya} />} />
        <Label judul="Nama penerima" anak={<input name="penerima_nama" defaultValue={awal.penerimaNama} className={gaya} />} />
        <Label judul="Unit kerja" anak={<input name="penerima_unit" defaultValue={awal.penerimaUnit} className={gaya} />} />
        <Label judul="Jabatan" anak={<input name="penerima_jabatan" defaultValue={awal.penerimaJabatan} className={gaya} />} />
      </div>

      <Label
        judul="Jawaban / tindak lanjut"
        anak={<textarea name="jawaban" rows={5} defaultValue={awal.jawaban} className={`${gaya} w-full`} />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Label
          judul="Hasil penyelesaian"
          anak={
            <select name="hasil_penyelesaian" defaultValue={awal.hasil} className={gaya}>
              <option value="">— Belum ditentukan —</option>
              {HASIL.map((h) => <option key={h}>{h}</option>)}
            </select>
          }
        />
        <Label
          judul="Status"
          anak={
            <select name="status" defaultValue={awal.status || "Diproses"} className={gaya}>
              {STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          }
        />
        <Label
          judul="Grading"
          anak={
            <select name="grading" defaultValue={awal.grading} className={gaya}>
              <option value="">— Belum dinilai —</option>
              {GRADING.map((g) => <option key={g}>{g}</option>)}
            </select>
          }
        />
        <Label
          judul="Kepuasan setelah penanganan"
          anak={
            <select name="kepuasan_penanganan" defaultValue={awal.kepuasan} className={gaya}>
              <option value="">— Belum ditanyakan —</option>
              {KEPUASAN.map((k) => <option key={k}>{k}</option>)}
            </select>
          }
        />
      </div>

      <Label
        judul="Evaluasi"
        anak={<textarea name="evaluasi" rows={3} defaultValue={awal.evaluasi} className={`${gaya} w-full`} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Label
          judul="Perlu eskalasi?"
          anak={
            <select
              name="perlu_eskalasi"
              value={eskalasi ? "Ya" : "Tidak"}
              onChange={(e) => setEskalasi(e.target.value === "Ya")}
              className={gaya}
            >
              <option>Tidak</option>
              <option>Ya</option>
            </select>
          }
        />
        <Label
          judul="Komite tujuan"
          anak={
            <select
              name="jenis_komite"
              defaultValue={awal.jenisKomite}
              disabled={!eskalasi}
              className={gaya}
            >
              <option value="">— Pilih komite —</option>
              {KOMITE.map((k) => <option key={k}>{k}</option>)}
            </select>
          }
        />
        <Label
          judul="Tanggal lapor komite"
          anak={
            <input
              name="tgl_lapor_komite"
              type="date"
              defaultValue={awal.tglLaporKomite}
              disabled={!eskalasi}
              className={gaya}
            />
          }
        />
      </div>

      {hasil.pesan && (
        <p className="rounded-lg border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}
      {hasil.kode && !hasil.pesan && (
        <p className="text-sm text-hijau">Tindak lanjut tersimpan.</p>
      )}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded-lg bg-hijau px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Simpan tindak lanjut"}
      </button>
    </form>
  );
}
