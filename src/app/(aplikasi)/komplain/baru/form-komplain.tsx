"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { catatKomplain, ubahKomplain } from "@/lib/komplain-actions";
import { KotakDetail } from "./kotak-detail";
import { komplainAwal } from "@/lib/hasil";
import { JALUR, MEDIA, KATEGORI, LAINNYA, SUMBER, KEPUASAN, pecahKategori, pokokKategori, labelKategori} from "@/lib/komplain-pilihan";

const gaya =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

function Label({
  judul,
  wajib,
  anak,
}: {
  judul: string;
  wajib?: boolean;
  anak: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
        {judul} {wajib && <span className="text-merah">*</span>}
      </span>
      {anak}
    </label>
  );
}

function Judul({ anak }: { anak: string }) {
  return (
    <h2 className="border-b border-garis pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
      {anak}
    </h2>
  );
}

/**
 * Pembungkus yang memungkinkan formulir dimulai ulang dari bersih.
 *
 * `useActionState` tidak punya cara mengosongkan hasilnya, jadi
 * cara yang benar adalah memasang ulang formulirnya — bukan memuat
 * ulang seluruh halaman, yang membuang waktu petugas.
 */
/**
 * Nilai yang sudah tersimpan, saat formulir ini dipakai untuk
 * MENGUBAH komplain yang sudah ada.
 *
 * Formulirnya satu, bukan dua yang kembar. Daftar field di sini
 * harus sama persis dengan yang dicetak di formulir resmi; dua
 * salinan berarti cepat atau lambat yang satu ketinggalan saat
 * yang lain diperbaiki.
 */
export type AwalKomplain = {
  id: number;
  kode: string;
  waktu_pelaporan: string;
  pelapor_nama: string;
  pelapor_hp: string;
  pelapor_alamat: string;
  pasien_nama: string;
  pasien_tgl_lahir: string;
  pasien_no_rm: string;
  pasien_hp: string;
  pasien_alamat: string;
  jalur_pelaporan: string;
  media_pelaporan: string;
  kategori_masalah: string;
  sumber_pelaporan: string;
  kepuasan_awal: string;
  detail_masalah: string;
  detail_masalah_asli: string | null;
};

export function FormKomplain({
  waktuSekarang,
  awal,
}: {
  waktuSekarang: string;
  awal?: AwalKomplain;
}) {
  const [ulang, setUlang] = useState(0);
  return (
    <IsiFormulir
      key={ulang}
      waktuSekarang={waktuSekarang}
      awal={awal}
      mulaiLagi={() => setUlang((n) => n + 1)}
    />
  );
}

function IsiFormulir({
  waktuSekarang,
  awal,
  mulaiLagi,
}: {
  waktuSekarang: string;
  awal?: AwalKomplain;
  mulaiLagi: () => void;
}) {
  const mengubah = Boolean(awal);
  const [hasil, kirim, sedang] = useActionState(
    mengubah ? ubahKomplain : catatKomplain,
    komplainAwal,
  );

  // Kategori tersimpan sebagai satu tulisan dipisah koma, dan
  // "Lainnya" membawa keterangannya sendiri di belakang titik dua.
  const kategoriTersimpan = pecahKategori(awal?.kategori_masalah);
  const kategoriPokok = kategoriTersimpan.map(pokokKategori);
  const keteranganLain = kategoriTersimpan
    .filter((k) => pokokKategori(k) === LAINNYA)
    .map(labelKategori)
    .join("; ");

  // Kotak keterangan hanya muncul saat "Lainnya" dicentang. Ditampilkan
  // terus-menerus, ia jadi pertanyaan yang tidak relevan bagi sebagian
  // besar komplain; disembunyikan sama sekali, keterangannya tidak
  // pernah tertulis.
  const [adaLainnya, setAdaLainnya] = useState(kategoriPokok.includes(LAINNYA));

  if (hasil.kode && mengubah) {
    return (
      <div className="rounded-xl shadow-lembut border border-garis bg-permukaan p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Perubahan tersimpan
        </p>
        <p className="mt-3 font-mono text-2xl font-semibold">{hasil.kode}</p>
        <p className="mt-2 text-sm text-tinta-2">
          Apa saja yang berubah tercatat di riwayat komplain ini, berikut nilai
          lamanya.
        </p>
        <div className="mt-5">
          <Link
            prefetch={false}
            href={`/komplain/${awal!.id}`}
            className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Kembali ke komplain
          </Link>
        </div>
      </div>
    );
  }

  if (hasil.kode) {
    return (
      <div className="rounded-xl shadow-lembut border border-garis bg-permukaan p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Komplain tercatat
        </p>
        <p className="mt-3 font-mono text-2xl font-semibold">{hasil.kode}</p>
        <p className="mt-2 text-sm text-tinta-2">
          Nomor ini bisa disebutkan kepada pelapor sebagai tanda laporannya
          diterima.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link prefetch={false}
            href="/komplain"
            className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Lihat daftar komplain
          </Link>
          <button
            type="button"
            onClick={mulaiLagi}
            className="rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            Catat komplain lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={kirim} className="flex flex-col gap-8">
      {mengubah && <input type="hidden" name="id" value={awal!.id} />}
      <section className="flex flex-col gap-4">
        <Judul anak="Data pelapor" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label judul="Nama pelapor" wajib anak={<input name="pelapor_nama" required defaultValue={awal?.pelapor_nama} className={gaya} />} />
          <Label
            judul="No. HP / WhatsApp"
            wajib
            anak={<input name="pelapor_hp" required defaultValue={awal?.pelapor_hp} placeholder="08xxxxxxxxxx" className={gaya} />}
          />
          <div className="sm:col-span-2">
            <Label judul="Alamat pelapor" anak={<input name="pelapor_alamat" defaultValue={awal?.pelapor_alamat} className={`${gaya} w-full`} />} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Judul anak="Data pasien" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label judul="Nama pasien" wajib anak={<input name="pasien_nama" required defaultValue={awal?.pasien_nama} className={gaya} />} />
          <Label judul="Tanggal lahir" anak={<input name="pasien_tgl_lahir" type="date" defaultValue={awal?.pasien_tgl_lahir} className={gaya} />} />
          <Label judul="No. rekam medis" anak={<input name="pasien_no_rm" defaultValue={awal?.pasien_no_rm} className={gaya} />} />
          <Label judul="No. HP pasien / keluarga" anak={<input name="pasien_hp" defaultValue={awal?.pasien_hp} className={gaya} />} />
          <div className="sm:col-span-2">
            <Label judul="Alamat pasien" anak={<input name="pasien_alamat" defaultValue={awal?.pasien_alamat} className={`${gaya} w-full`} />} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Judul anak="Jalur dan media" />
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Komplain sering baru sempat dicatat beberapa jam setelah
              diterima. Kalau waktunya tidak boleh diisi, yang tercatat
              jam pengetikan — dan hitungan SLA jadi mengukur kecepatan
              mengetik, bukan kecepatan menanggapi. */}
          <div className="sm:col-span-2">
            <Label
              judul="Waktu pelaporan diterima"
              wajib
              anak={
                <input
                  name="waktu_pelaporan"
                  type="datetime-local"
                  required
                  defaultValue={awal?.waktu_pelaporan ?? waktuSekarang}
                  className={gaya}
                />
              }
            />
          </div>
          <Label
            judul="Jalur pelaporan"
            wajib
            anak={
              <select name="jalur_pelaporan" required defaultValue={awal?.jalur_pelaporan ?? ""} className={gaya}>
                <option value="" disabled>— Pilih jalur —</option>
                {JALUR.map((j) => <option key={j}>{j}</option>)}
              </select>
            }
          />
          <Label
            judul="Media pelaporan"
            wajib
            anak={
              <select name="media_pelaporan" required defaultValue={awal?.media_pelaporan ?? ""} className={gaya}>
                <option value="" disabled>— Pilih media —</option>
                {MEDIA.map((m) => <option key={m}>{m}</option>)}
              </select>
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Judul anak="Isi pengaduan" />
        {/* Kotak centang, bukan daftar pilih: satu komplain sering
            menyentuh lebih dari satu hal sekaligus — pelayanan yang
            lambat karena alatnya rusak, misalnya. Memaksa memilih
            satu berarti separuh keterangannya hilang sejak awal. */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-tinta-3">
            Kategori masalah <span className="text-merah">*</span>
            <span className="ml-2 font-normal normal-case tracking-normal text-tinta-3">
              boleh lebih dari satu
            </span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {KATEGORI.map((k) => (
              <label
                key={k}
                className="flex items-center gap-2.5 rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm hover:bg-permukaan-2"
              >
                <input
                  type="checkbox"
                  name="kategori_masalah"
                  value={k}
                  defaultChecked={kategoriPokok.includes(k)}
                  onChange={
                    k === LAINNYA
                      ? (e) => setAdaLainnya(e.target.checked)
                      : undefined
                  }
                  className="accent-hijau"
                />
                {k}
              </label>
            ))}
          </div>

          {adaLainnya && (
            <input
              name="kategori_lain"
              required
              autoFocus
              defaultValue={keteranganLain}
              placeholder="Kategori lainnya — tulis singkat, misalnya: parkir penuh"
              className={`${gaya} mt-1 w-full text-sm`}
            />
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label
            judul="Sumber pelaporan"
            wajib
            anak={
              <select name="sumber_pelaporan" required defaultValue={awal?.sumber_pelaporan ?? ""} className={gaya}>
                <option value="" disabled>— Pilih sumber —</option>
                {SUMBER.map((s) => <option key={s}>{s}</option>)}
              </select>
            }
          />
          <Label
            judul="Tingkat kepuasan awal"
            anak={
              <select name="kepuasan_awal" defaultValue={awal?.kepuasan_awal ?? ""} className={gaya}>
                <option value="">— Belum ditanyakan —</option>
                {KEPUASAN.map((k) => <option key={k}>{k}</option>)}
              </select>
            }
          />
          <div className="sm:col-span-2">
            <Label
              judul="Detail komplain"
              wajib
              anak={
                <KotakDetail
                  awal={awal?.detail_masalah ?? ""}
                  asliAwal={awal?.detail_masalah_asli ?? null}
                  gaya={`${gaya} w-full`}
                />
              }
            />
          </div>
        </div>
      </section>

      {hasil.pesan && (
        <p className="rounded-lg border-l-2 border-merah bg-permukaan-2 px-3 py-2 text-sm text-merah">
          {hasil.pesan}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={sedang}
          className="rounded-lg bg-hijau px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {sedang ? "Menyimpan…" : mengubah ? "Simpan perubahan" : "Simpan komplain"}
        </button>
        <Link prefetch={false}
          href={mengubah ? `/komplain/${awal!.id}` : "/komplain"}
          className="rounded-lg border border-garis px-5 py-2.5 font-medium text-tinta-2 hover:bg-permukaan-2"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
