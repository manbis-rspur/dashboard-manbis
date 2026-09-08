import Link from "next/link";
import Avatar from "@/components/avatar";
import { keluar } from "@/lib/auth-actions";
import { wajibLogin } from "@/lib/auth";
import { bacaIdentitas } from "@/lib/identitas";
import { bolehAkses } from "@/lib/akses";
import { gayaWarna } from "@/lib/gaya-warna";
import { createClient } from "@/lib/supabase/server";

const MENU = [
  { href: "/", label: "Beranda" },
  { href: "/penomoran/ambil-nomor", label: "Penomoran" },
  { href: "/obrolan", label: "Obrolan" },
] as const;

/** Menu yang hanya muncul untuk Koordinator. */
const MENU_ADMIN = [
  { href: "/pengaturan/pengguna", label: "Pengguna" },
  { href: "/pengaturan/aplikasi", label: "Tampilan" },
  { href: "/pengaturan/template", label: "Template" },
] as const;

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
  const bolehHumas = await bolehAkses("humas");

  const menu = [
    ...MENU,
    ...(bolehKomplain ? [{ href: "/komplain", label: "Komplain" }] : []),
    ...(bolehHumas ? [{ href: "/humas", label: "Humas" }] : []),
    ...(pengguna.peran === "Admin" ? MENU_ADMIN : []),
  ];

  return (
    <div className="flex min-h-full flex-col">
      {/* Warna pilihan Koordinator menimpa warna bawaan — termasuk
          latar, garis, dan warna tulisan, supaya seluruh halaman
          terasa satu keluarga dengan logonya. */}
      {identitas.warnaUtama && <style>{gayaWarna(identitas.warnaUtama)}</style>}

      <header className="border-b border-garis bg-permukaan">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
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

          <nav className="flex flex-wrap gap-1">
            {menu.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="rounded px-3 py-1.5 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
              >
                {m.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 border-l border-garis pl-4">
            <Link
              href="/profil"
              className="flex items-center gap-2.5 rounded px-1 py-1 hover:bg-permukaan-2"
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
                className="rounded border border-garis px-2.5 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
