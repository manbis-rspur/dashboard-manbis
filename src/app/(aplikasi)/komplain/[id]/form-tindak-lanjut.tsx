"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { simpanTindakLanjut } from "@/lib/komplain-actions";
import { komplainAwal } from "@/lib/hasil";
import { HASIL, STATUS, GRADING, KEPUASAN, KOMITE } from "@/lib/komplain-pilihan";

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda disabled:bg-permukaan-2 disabled:text-tinta-3";

export type NilaiAwal = {
  id: number;
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
  const [tersimpan, setTersimpan] = useState(false);

  if (hasil.kode && !tersimpan) {
    setTersimpan(true);
    router.refresh();
  }

  return (
    <form action={kirim} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={awal.id} />

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
        <p className="rounded border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}
      {hasil.kode && !hasil.pesan && (
        <p className="text-sm text-hijau">Tindak lanjut tersimpan.</p>
      )}

      <button
        type="submit"
        disabled={sedang}
        className="w-fit rounded bg-hijau px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Menyimpan…" : "Simpan tindak lanjut"}
      </button>
    </form>
  );
}
