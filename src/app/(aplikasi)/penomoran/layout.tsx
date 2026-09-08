import Link from "next/link";

/** Sub-menu di dalam modul Penomoran. */
const HALAMAN = [
  { href: "/penomoran/ambil-nomor", label: "Ambil Nomor" },
  { href: "/penomoran/buku-nomor", label: "Buku Nomor" },
] as const;

export default function LayoutPenomoran({ children }: LayoutProps<"/penomoran">) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3 border-b border-garis pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Modul Penomoran Surat
        </p>
        <nav className="flex gap-1">
          {HALAMAN.map((h) => (
            <Link
              key={h.href}
              href={h.href}
              className="rounded px-3 py-1.5 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
            >
              {h.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}
