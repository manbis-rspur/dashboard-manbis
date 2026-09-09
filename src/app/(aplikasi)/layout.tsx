import Link from "next/link";
import Avatar from "@/components/avatar";
import Ikon from "@/components/ikon";
import Kedip from "@/components/kedip";
import Lonceng from "@/components/lonceng";
import Navigasi, { type ButirMenu } from "@/components/navigasi";
import { keluar } from "@/lib/auth-actions";
import { wajibLogin } from "@/lib/auth";
import { bacaIdentitas } from "@/lib/identitas";
import { bacaLonceng } from "@/lib/notifikasi";
import { bolehAkses } from "@/lib/akses";
import { gayaWarna } from "@/lib/gaya-warna";
import { createClient } from "@/lib/supabase/server";

const MENU: ButirMenu[] = [
  { href: "/", label: "Beranda", ikon: "beranda" },
  { href: "/penomoran/ambil-nomor", label: "Penomoran", ikon: "penomoran" },
  { href: "/obrolan", label: "Obrolan", ikon: "obrolan" },
];

/** Menu yang hanya muncul untuk Koordinator. */
const MENU_ADMIN: ButirMenu[] = [
  { href: "/pengaturan/pengguna", label: "Pengguna", ikon: "pengguna" },
  { href: "/pengaturan/aplikasi", label: "Tampilan", ikon: "tampilan" },
  { href: "/pengaturan/template", label: "Template", ikon: "template" },
  { href: "/pengaturan/hapus-data", label: "Hapus Data", ikon: "hapus" },
];

export default async function LayoutAplikasi({ children }: LayoutProps<"/">) {
  const pengguna = await wajibLogin();
  const identitas = await bacaIdentitas();

  const supabase = await createClient();
  const { data } = await supabase
    .from("pengguna")
    .select("foto_url")
    .eq("id", pengguna.id)
    .maybeSingle();

  // Komplain memuat data pasien, jadi menunya hanya muncul bagi yang
  // memang diberi izin — bukan disembunyikan lewat peran saja.
  const bolehKomplain = await bolehAkses("komplain");
  const bolehMcu = await bolehAkses("mcu");
  const bolehPublikasi =
    (await bolehAkses("publikasi")) || (await bolehAkses("humas"));

  const lonceng = await bacaLonceng();

  const menu: ButirMenu[] = [
    ...MENU,
    ...(bolehKomplain
      ? [{ href: "/komplain", label: "Komplain", ikon: "komplain" as const }]
      : []),
    ...(bolehMcu ? [{ href: "/mcu", label: "MCU", ikon: "mcu" as const }] : []),
    ...(bolehPublikasi
      ? [{ href: "/publikasi", label: "Publikasi", ikon: "publikasi" as const }]
      : []),
    { href: "/rekap", label: "Rekap", ikon: "rekap" },
    ...(pengguna.peran === "Admin" ? MENU_ADMIN : []),
  ];

  return (
    <div className="flex min-h-full flex-col">
      {/* Warna pilihan Koordinator menimpa warna bawaan — termasuk
          latar, garis, dan warna tulisan, supaya seluruh halaman
          terasa satu keluarga dengan logonya. */}
      {identitas.warnaUtama && <style>{gayaWarna(identitas.warnaUtama)}</style>}

      <Kedip />

      <header className="sticky top-0 z-40 border-b border-garis bg-permukaan/95 backdrop-blur">
        {/* Garis warna rumah sakit di bibir atas layar. Tipis saja —
            penanda milik siapa halaman ini, bukan hiasan. */}
        <div className="h-[3px] bg-hijau" />

        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-5 py-2.5">
          <Link href="/" className="mr-auto flex items-center gap-3">
            {identitas.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={identitas.logoUrl}
                alt=""
                className="h-9 w-auto max-w-[7rem] object-contain"
              />
            )}
            <span className="block">
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-tinta-3">
                {identitas.namaUnit} RSPUR
              </span>
              <span className="block font-medium">Dashboard Unit</span>
            </span>
          </Link>

          <Navigasi menu={menu} />

          <div className="flex items-center gap-2.5 border-l border-garis pl-4">
            <Lonceng daftar={lonceng.daftar} baru={lonceng.baru} />

            <Link
              href="/profil"
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-permukaan-2"
            >
              <Avatar nama={pengguna.nama} foto={data?.foto_url} ukuran={32} />
              <span className="hidden text-right leading-tight sm:block">
                <span className="block text-sm font-medium">{pengguna.nama}</span>
                <span className="block text-xs text-tinta-3">{pengguna.jabatan}</span>
              </span>
            </Link>

            <form action={keluar}>
              <button
                type="submit"
                aria-label="Keluar"
                title="Keluar"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-garis text-tinta-2 hover:bg-permukaan-2"
              >
                <Ikon nama="keluar" ukuran={17} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>

      <footer className="border-t border-garis px-5 py-4">
        <p className="mx-auto max-w-6xl text-xs text-tinta-3">
          {identitas.namaUnit} — RS Pertamedika Ummi Rosnati
        </p>
      </footer>
    </div>
  );
}
