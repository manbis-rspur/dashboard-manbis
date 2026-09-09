import Link from "next/link";
import Ikon, { type NamaIkon } from "@/components/ikon";
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

/** Kartu angka ringkas di baris paling atas. */
function Angka({
  ikon,
  nilai,
  label,
  keterangan,
}: {
  ikon: NamaIkon;
  nilai: string | number;
  label: string;
  keterangan?: string;
}) {
  return (
    <div className="rounded-xl border border-garis bg-permukaan p-4 shadow-lembut">
      <div className="flex items-center gap-2 text-tinta-3">
        <Ikon nama={ikon} ukuran={15} />
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em]">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {nilai}
      </p>
      {keterangan && <p className="text-xs text-tinta-3">{keterangan}</p>}
    </div>
  );
}

/** Kartu modul. */
function Modul({
  href,
  ikon,
  judul,
  isi,
  kaki,
  terbatas = false,
}: {
  href: string;
  ikon: NamaIkon;
  judul: string;
  isi: string;
  kaki?: string;
  terbatas?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut transition hover:border-hijau hover:shadow-angkat"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-hijau-muda text-hijau">
          <Ikon nama={ikon} ukuran={18} />
        </span>
        <p className="font-medium">{judul}</p>
        {terbatas && (
          <span className="ml-auto rounded-full border border-garis px-2 py-0.5 text-[0.65rem] font-medium text-tinta-3">
            Terbatas
          </span>
        )}
      </div>
      <p className="text-sm text-tinta-2">{isi}</p>
      {kaki && <p className="mt-auto pt-1 text-sm text-tinta-3">{kaki}</p>}
    </Link>
  );
}

export default async function Beranda() {
  const pengguna = await wajibLogin();
  const supabase = await createClient();
  const sekarang = new Date();
  const tahun = sekarang.getFullYear();

  const bolehKomplain = await bolehAkses("komplain");
  const bolehPublikasi =
    (await bolehAkses("publikasi")) || (await bolehAkses("humas"));

  // Awal bulan berjalan, dipakai untuk menghitung nomor bulan ini.
  const awalBulan = new Date(tahun, sekarang.getMonth(), 1).toISOString();

  const [
    { count },
    { count: bulanIni },
    { count: komplainTerbuka },
    { count: publikasiTertunda },
    { data: terakhir },
  ] = await Promise.all([
    supabase
      .from("nomor")
      .select("id", { count: "exact", head: true })
      .eq("tahun", tahun),
    supabase
      .from("nomor")
      .select("id", { count: "exact", head: true })
      .eq("tahun", tahun)
      .gte("diambil_pada", awalBulan),
    bolehKomplain
      ? supabase
          .from("komplain")
          .select("id", { count: "exact", head: true })
          .neq("status", "Selesai")
      : Promise.resolve({ count: null }),
    bolehPublikasi
      ? supabase
          .from("publikasi")
          .select("id", { count: "exact", head: true })
          .neq("status_tinjauan", "Disetujui")
      : Promise.resolve({ count: null }),
    // Diurutkan menurut nomornya, bukan menurut waktu pengambilan.
    // "Nomor terakhir" berarti nomor tertinggi — dan waktu pengambilan
    // tidak bisa diandalkan untuk itu: nomor pindahan dari buku lama
    // memakai tanggal suratnya, yang sebagian keliru di sumbernya.
    supabase
      .from("nomor")
      .select("nomor_lengkap, perihal, tanggal_surat, pengguna(nama)")
      .order("tahun", { ascending: false })
      .order("urutan", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const pengambil = Array.isArray(terakhir?.pengguna)
    ? terakhir?.pengguna[0]
    : terakhir?.pengguna;

  const hariIni = sekarang.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-2xl border border-garis bg-permukaan shadow-lembut">
        <div className="flex flex-wrap items-end justify-between gap-4 bg-hijau-muda/60 px-6 py-6">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-tinta-3">
              <Ikon nama="waktu" ukuran={13} />
              {hariIni}
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
              Selamat datang, {pengguna.nama.split(",")[0]}
            </h1>
            <p className="mt-0.5 text-tinta-2">{pengguna.jabatan}</p>
          </div>
          <Link
            href="/penomoran/ambil-nomor"
            className="flex items-center gap-2 rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white shadow-lembut hover:opacity-90"
          >
            <Ikon nama="tambah" ukuran={16} />
            Ambil nomor surat
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Angka
          ikon="penomoran"
          nilai={count ?? 0}
          label={`Nomor ${tahun}`}
          keterangan="sepanjang tahun berjalan"
        />
        <Angka
          ikon="surat"
          nilai={bulanIni ?? 0}
          label="Bulan ini"
          keterangan="nomor yang sudah diambil"
        />
        {bolehKomplain && (
          <Angka
            ikon="komplain"
            nilai={komplainTerbuka ?? 0}
            label="Komplain terbuka"
            keterangan="belum berstatus selesai"
          />
        )}
        {bolehPublikasi && (
          <Angka
            ikon="publikasi"
            nilai={publikasiTertunda ?? 0}
            label="Menunggu tinjauan"
            keterangan="dokumen belum disetujui"
          />
        )}
      </section>

      {terakhir && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            <Ikon nama="centang" ukuran={14} />
            Nomor terakhir diambil
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
            <div>
              <p className="font-mono text-lg font-semibold">
                {terakhir.nomor_lengkap}
              </p>
              <p className="mt-1 text-sm text-tinta-2">{terakhir.perihal}</p>
              {pengambil && (
                <p className="text-sm text-tinta-3">oleh {pengambil.nama}</p>
              )}
            </div>
            <Link
              href="/penomoran/buku-nomor"
              className="flex items-center gap-1.5 rounded-lg border border-garis px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
            >
              Buku nomor
              <Ikon nama="penomoran" ukuran={15} />
            </Link>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="modul" ukuran={14} />
          Modul
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Modul
            href="/penomoran/ambil-nomor"
            ikon="penomoran"
            judul="Penomoran Surat"
            isi="Mengambil nomor surat keluar dan PKRS, serta melihat buku nomor unit."
            kaki={`${count ?? 0} nomor diambil sepanjang ${tahun}`}
          />

          {bolehKomplain && (
            <Modul
              href="/komplain"
              ikon="komplain"
              judul="Komplain Pasien"
              isi="Pencatatan dan tindak lanjut keluhan pelanggan RSPUR."
              terbatas
            />
          )}

          {bolehPublikasi && (
            <Modul
              href="/publikasi"
              ikon="publikasi"
              judul="Arsip Publikasi"
              isi="Dokumen hasil kerja Humas dan Digital Marketing yang sudah final."
            />
          )}

          <Modul
            href="/obrolan"
            ikon="obrolan"
            judul="Obrolan Unit"
            isi="Satu ruang percakapan untuk seluruh anggota manajemen bisnis."
          />

          <Modul
            href="/rekap"
            ikon="rekap"
            judul="Rekap Bulanan"
            isi="Rangkuman nomor surat yang diambil unit, bulan demi bulan."
          />

          {pengguna.peran === "Admin" && (
            <Modul
              href="/pengaturan/pengguna"
              ikon="pengguna"
              judul="Pengguna"
              isi="Anggota unit, peran masing-masing, dan akun loginnya."
              terbatas
            />
          )}

          {pengguna.peran === "Admin" && (
            <Modul
              href="/pengaturan/aplikasi"
              ikon="tampilan"
              judul="Tampilan"
              isi="Logo RSPUR dan warna yang dipakai di seluruh halaman."
              terbatas
            />
          )}

          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-garis p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-garis text-tinta-3">
              <Ikon nama="tambah" ukuran={18} />
            </span>
            <p className="font-medium text-tinta-3">Modul berikutnya</p>
            <p className="text-sm text-tinta-3">
              Ruang untuk pekerjaan manbis lainnya. Kartunya ditambahkan begitu
              kebutuhannya dijelaskan.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
