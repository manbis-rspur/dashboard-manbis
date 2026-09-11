"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { catatKomplain } from "@/lib/komplain-actions";
import { komplainAwal } from "@/lib/hasil";
import { JALUR, MEDIA, KATEGORI, LAINNYA, SUMBER, KEPUASAN } from "@/lib/komplain-pilihan";

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
export function FormKomplain({ waktuSekarang }: { waktuSekarang: string }) {
  const [ulang, setUlang] = useState(0);
  return (
    <IsiFormulir
      key={ulang}
      waktuSekarang={waktuSekarang}
      mulaiLagi={() => setUlang((n) => n + 1)}
    />
  );
}

function IsiFormulir({
  waktuSekarang,
  mulaiLagi,
}: {
  waktuSekarang: string;
  mulaiLagi: () => void;
}) {
  const [hasil, kirim, sedang] = useActionState(catatKomplain, komplainAwal);

  // Kotak keterangan hanya muncul saat "Lainnya" dicentang. Ditampilkan
  // terus-menerus, ia jadi pertanyaan yang tidak relevan bagi sebagian
  // besar komplain; disembunyikan sama sekali, keterangannya tidak
  // pernah tertulis.
  const [adaLainnya, setAdaLainnya] = useState(false);

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
          <Link
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
      <section className="flex flex-col gap-4">
        <Judul anak="Data pelapor" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label judul="Nama pelapor" wajib anak={<input name="pelapor_nama" required className={gaya} />} />
          <Label
            judul="No. HP / WhatsApp"
            wajib
            anak={<input name="pelapor_hp" required placeholder="08xxxxxxxxxx" className={gaya} />}
          />
          <div className="sm:col-span-2">
            <Label judul="Alamat pelapor" anak={<input name="pelapor_alamat" className={`${gaya} w-full`} />} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Judul anak="Data pasien" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Label judul="Nama pasien" wajib anak={<input name="pasien_nama" required className={gaya} />} />
          <Label judul="Tanggal lahir" anak={<input name="pasien_tgl_lahir" type="date" className={gaya} />} />
          <Label judul="No. rekam medis" anak={<input name="pasien_no_rm" className={gaya} />} />
          <Label judul="No. HP pasien / keluarga" anak={<input name="pasien_hp" className={gaya} />} />
          <div className="sm:col-span-2">
            <Label judul="Alamat pasien" anak={<input name="pasien_alamat" className={`${gaya} w-full`} />} />
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
                  defaultValue={waktuSekarang}
                  className={gaya}
                />
              }
            />
          </div>
          <Label
            judul="Jalur pelaporan"
            wajib
            anak={
              <select name="jalur_pelaporan" required defaultValue="" className={gaya}>
                <option value="" disabled>— Pilih jalur —</option>
                {JALUR.map((j) => <option key={j}>{j}</option>)}
              </select>
            }
          />
          <Label
            judul="Media pelaporan"
            wajib
            anak={
              <select name="media_pelaporan" required defaultValue="" className={gaya}>
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
              <select name="sumber_pelaporan" required defaultValue="" className={gaya}>
                <option value="" disabled>— Pilih sumber —</option>
                {SUMBER.map((s) => <option key={s}>{s}</option>)}
              </select>
            }
          />
          <Label
            judul="Tingkat kepuasan awal"
            anak={
              <select name="kepuasan_awal" defaultValue="" className={gaya}>
                <option value="">— Belum ditanyakan —</option>
                {KEPUASAN.map((k) => <option key={k}>{k}</option>)}
              </select>
            }
          />
          <div className="sm:col-span-2">
            <Label
              judul="Detail komplain"
              wajib
              anak={<textarea name="detail_masalah" required rows={6} className={`${gaya} w-full`} />}
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
          {sedang ? "Menyimpan…" : "Simpan komplain"}
        </button>
        <Link
          href="/komplain"
          className="rounded-lg border border-garis px-5 py-2.5 font-medium text-tinta-2 hover:bg-permukaan-2"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
