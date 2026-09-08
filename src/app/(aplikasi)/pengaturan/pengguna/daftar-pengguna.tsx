"use client";

import { useActionState, useState } from "react";
import {
  buatAkunLogin,
  tambahAnggota,
  ubahAktif,
  ubahPeran,
  hasilAwal,
} from "@/lib/pengguna-actions";

export type BarisPengguna = {
  id: number;
  nama: string;
  jabatan: string;
  email: string;
  peran: string;
  aktif: boolean;
  punyaAkun: boolean;
};

const gayaInput =
  "rounded border border-garis bg-permukaan px-3 py-2 outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

function FormAkun({ pengguna }: { pengguna: BarisPengguna }) {
  const [hasil, kirim, sedang] = useActionState(buatAkunLogin, hasilAwal);

  if (hasil.berhasil) {
    return <p className="text-sm text-hijau">{hasil.berhasil}</p>;
  }

  return (
    <form action={kirim} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="pengguna_id" value={pengguna.id} />
      <div className="flex flex-col gap-1">
        <input
          name="sandi"
          type="password"
          required
          minLength={8}
          placeholder="Kata sandi awal"
          autoComplete="new-password"
          className={`${gayaInput} w-44 text-sm`}
        />
        {hasil.pesan && <p className="text-xs text-merah">{hasil.pesan}</p>}
      </div>
      <button
        type="submit"
        disabled={sedang}
        className="rounded bg-hijau px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {sedang ? "Membuat…" : "Buatkan akun"}
      </button>
    </form>
  );
}

export function DaftarPengguna({ daftar }: { daftar: BarisPengguna[] }) {
  const [hasilTambah, kirimTambah, sedangTambah] = useActionState(tambahAnggota, hasilAwal);
  const [bukaTambah, setBukaTambah] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        {daftar.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-3 rounded border border-garis bg-permukaan p-4"
          >
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              <div className="mr-auto">
                <p className="font-medium">
                  {p.nama}
                  {!p.aktif && (
                    <span className="ml-2 rounded bg-permukaan-2 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-tinta-3">
                      Nonaktif
                    </span>
                  )}
                </p>
                <p className="text-sm text-tinta-3">
                  {p.jabatan} · {p.email}
                </p>
              </div>

              <form action={ubahPeran}>
                <input type="hidden" name="pengguna_id" value={p.id} />
                <select
                  name="peran"
                  defaultValue={p.peran}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  className={`${gayaInput} text-sm`}
                  aria-label={`Peran ${p.nama}`}
                >
                  <option value="Admin">Admin</option>
                  <option value="Staf">Staf</option>
                </select>
              </form>

              <form action={ubahAktif}>
                <input type="hidden" name="pengguna_id" value={p.id} />
                <input type="hidden" name="aktif" value={String(!p.aktif)} />
                <button
                  type="submit"
                  className="rounded border border-garis px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
                >
                  {p.aktif ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </form>
            </div>

            <div className="border-t border-garis pt-3">
              {p.punyaAkun ? (
                <p className="text-sm text-tinta-3">
                  Akun login sudah ada — beliau bisa masuk memakai emailnya.
                </p>
              ) : (
                <FormAkun pengguna={p} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded border border-garis bg-permukaan p-4">
        {!bukaTambah ? (
          <button
            type="button"
            onClick={() => setBukaTambah(true)}
            className="text-sm font-medium text-hijau hover:underline"
          >
            Tambah anggota unit
          </button>
        ) : (
          <form action={kirimTambah} className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
              Anggota baru
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="nama" required placeholder="Nama lengkap dan gelar" className={gayaInput} />
              <input name="jabatan" required placeholder="Jabatan" className={gayaInput} />
              <input name="email" type="email" required placeholder="Email kantor" className={gayaInput} />
              <select name="peran" defaultValue="Staf" className={gayaInput} aria-label="Peran">
                <option value="Staf">Staf</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {hasilTambah.pesan && <p className="text-sm text-merah">{hasilTambah.pesan}</p>}
            {hasilTambah.berhasil && <p className="text-sm text-hijau">{hasilTambah.berhasil}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sedangTambah}
                className="rounded bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {sedangTambah ? "Menyimpan…" : "Simpan anggota"}
              </button>
              <button
                type="button"
                onClick={() => setBukaTambah(false)}
                className="rounded border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
