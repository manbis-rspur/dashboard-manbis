import Link from "next/link";
import { wajibLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bolehAkses } from "@/lib/akses";

/**
 * Beranda unit — pintu masuk ke seluruh modul.
 *
 * Modul yang belum dibangun sengaja tidak dikarang di sini. Kartunya
 * baru ditambahkan setelah jobdesk-nya dijelaskan, supaya tidak ada
 * menu yang menjanjikan sesuatu yang belum ada.
 */
export default async function Beranda() {
  const pengguna = await wajibLogin();
  const supabase = await createClient();
  const tahun = new Date().getFullYear();
  const bolehKomplain = await bolehAkses("komplain");
  const bolehHumas =
    (await bolehAkses("humas")) || (await bolehAkses("humas_pelanggan"));
  const bolehMcu = await bolehAkses("mcu");
  const bolehPublikasi =
    (await bolehAkses("publikasi")) || (await bolehAkses("humas"));

  const { count } = await supabase
    .from("nomor")
    .select("id", { count: "exact", head: true })
    .eq("tahun", tahun);

  const { data: terakhir } = await supabase
    .from("nomor")
    .select("nomor_lengkap, perihal, pengguna(nama)")
    .order("diambil_pada", { ascending: false })
    .limit(1)
    .maybeSingle();

  const pengambil = Array.isArray(terakhir?.pengguna)
    ? terakhir?.pengguna[0]
    : terakhir?.pengguna;

  return (
    <div className="flex flex-col gap-9">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Selamat datang, {pengguna.nama.split(",")[0]}
        </h1>
        <p className="mt-1 text-tinta-2">{pengguna.jabatan}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Modul
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/penomoran/ambil-nomor"
            className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
          >
            <p className="font-medium">Penomoran Surat</p>
            <p className="text-sm text-tinta-2">
              Mengambil nomor surat keluar dan PKRS, serta melihat buku nomor
              unit.
            </p>
            <p className="mt-1 text-sm text-tinta-3">
              {count ?? 0} nomor diambil sepanjang {tahun}
            </p>
          </Link>

          {bolehKomplain && (
            <Link
              href="/komplain"
              className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
            >
              <p className="font-medium">Komplain Pasien</p>
              <p className="text-sm text-tinta-2">
                Pencatatan dan tindak lanjut keluhan pelanggan RSPUR.
              </p>
              <p className="mt-1 text-sm text-tinta-3">Terbatas</p>
            </Link>
          )}

          {bolehHumas && (
            <Link
              href="/humas"
              className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
            >
              <p className="font-medium">Layanan Pelanggan</p>
              <p className="text-sm text-tinta-2">
                Bantuan menyusun balasan ulasan dan komplain pasien.
              </p>
              <p className="mt-1 text-sm text-tinta-3">Terbatas</p>
            </Link>
          )}

          {bolehMcu && (
            <Link
              href="/mcu"
              className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
            >
              <p className="font-medium">Kalkulator MCU</p>
              <p className="text-sm text-tinta-2">
                Menghitung harga paket medical check-up untuk rekanan, beserta
                laba dan marginnya.
              </p>
              <p className="mt-1 text-sm text-tinta-3">Terbatas</p>
            </Link>
          )}

          {bolehPublikasi && (
            <Link
              href="/publikasi"
              className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
            >
              <p className="font-medium">Arsip Publikasi</p>
              <p className="text-sm text-tinta-2">
                Dokumen hasil kerja Humas dan Digital Marketing yang sudah
                final.
              </p>
            </Link>
          )}

          <Link
            href="/obrolan"
            className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
          >
            <p className="font-medium">Obrolan Unit</p>
            <p className="text-sm text-tinta-2">
              Satu ruang percakapan untuk seluruh anggota manajemen bisnis.
            </p>
          </Link>

          {pengguna.peran === "Admin" && (
            <Link
              href="/pengaturan/pengguna"
              className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
            >
              <p className="font-medium">Pengguna</p>
              <p className="text-sm text-tinta-2">
                Anggota unit, peran masing-masing, dan akun loginnya.
              </p>
              <p className="mt-1 text-sm text-tinta-3">Khusus Koordinator</p>
            </Link>
          )}

          {pengguna.peran === "Admin" && (
            <Link
              href="/pengaturan/aplikasi"
              className="flex flex-col gap-2 rounded border border-garis bg-permukaan p-5 transition hover:border-hijau"
            >
              <p className="font-medium">Tampilan</p>
              <p className="text-sm text-tinta-2">
                Logo RSPUR dan warna yang dipakai di seluruh halaman.
              </p>
              <p className="mt-1 text-sm text-tinta-3">Khusus Koordinator</p>
            </Link>
          )}

          <div className="flex flex-col gap-2 rounded border border-dashed border-garis p-5">
            <p className="font-medium text-tinta-3">Modul berikutnya</p>
            <p className="text-sm text-tinta-3">
              Ruang untuk pekerjaan manbis lainnya. Kartunya ditambahkan begitu
              kebutuhannya dijelaskan.
            </p>
          </div>
        </div>
      </section>

      {terakhir && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Nomor terakhir diambil
          </h2>
          <div className="rounded border border-garis bg-permukaan p-5">
            <p className="font-mono text-lg font-semibold">
              {terakhir.nomor_lengkap}
            </p>
            <p className="mt-1 text-sm text-tinta-2">{terakhir.perihal}</p>
            {pengambil && (
              <p className="text-sm text-tinta-3">oleh {pengambil.nama}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
