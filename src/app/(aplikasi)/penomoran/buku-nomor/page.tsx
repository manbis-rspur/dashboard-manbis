import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Baris = {
  id: number;
  nomor_lengkap: string;
  urutan: number;
  tanggal_surat: string;
  diambil_pada: string;
  perihal: string;
  ditujukan_kepada: string | null;
  status: string;
  jenis_dokumen: { nama: string } | { nama: string }[] | null;
  pengguna: { nama: string } | { nama: string }[] | null;
};

type Jenis = { id: number; kode: string; nama: string };

function satu<T>(nilai: T | T[] | null): T | null {
  if (nilai === null) return null;
  return Array.isArray(nilai) ? (nilai[0] ?? null) : nilai;
}

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function HalamanBukuNomor({
  searchParams,
}: PageProps<"/penomoran/buku-nomor">) {
  const q = await searchParams;
  const supabase = await createClient();

  const { data: dataJenis } = await supabase
    .from("jenis_dokumen")
    .select("id, kode, nama")
    .eq("aktif", true)
    .order("urutan_tampil");

  const jenis = (dataJenis ?? []) as Jenis[];

  /**
   * Jenis mana yang sedang dibuka.
   *
   * Bawaannya jenis pertama, bukan "Semua". Surat Keluar dan PKRS
   * punya deret nomornya masing-masing, dan yang dicari orang di
   * sini hampir selalu satu deret saja — nomor terakhir deret itu,
   * atau nomor berapa yang dipakai untuk perihal tertentu. Daftar
   * campuran membuat dua deret berselang-seling, dan angka yang
   * berdekatan di layar sebetulnya tidak ada hubungannya.
   */
  const dimintaKode = typeof q.jenis === "string" ? q.jenis : null;
  const semua = dimintaKode === "semua";
  const terpilih = semua
    ? null
    : (jenis.find((j) => j.kode === dimintaKode) ?? jenis[0] ?? null);

  let kueri = supabase
    .from("nomor")
    .select(
      "id, nomor_lengkap, urutan, tanggal_surat, diambil_pada, perihal, ditujukan_kepada, status, jenis_dokumen(nama), pengguna(nama)",
    );

  if (terpilih) {
    // Di dalam satu jenis, urutan nomornya sendiri yang paling
    // masuk akal — itulah bentuk buku nomor yang sesungguhnya.
    kueri = kueri
      .eq("jenis_id", terpilih.id)
      .order("tahun", { ascending: false })
      .order("urutan", { ascending: false });
  } else {
    // Daftar campuran tidak bisa diurutkan menurut angka: PKRS
    // terbaru akan terkubur di antara Surat Keluar yang angkanya
    // kebetulan sama padahal diambil berbulan-bulan sebelumnya.
    // Jadi yang dipakai waktu pengambilannya.
    kueri = kueri
      .order("diambil_pada", { ascending: false })
      .order("id", { ascending: false });
  }

  const { data } = await kueri.limit(300);
  const baris = (data ?? []) as unknown as Baris[];

  const terpakai = baris.filter((b) => b.status !== "Batal").length;
  const batal = baris.length - terpakai;
  const terakhir = baris.find((b) => b.status !== "Batal");

  const gayaTab = (aktif: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      aktif ? "bg-hijau-muda text-hijau" : "text-tinta-2 hover:bg-permukaan-2"
    }`;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Buku Nomor</h1>
      <p className="mt-1 text-tinta-2">
        Nomor yang pernah diambil unit manbis, yang terbaru di atas.
      </p>

      {/* Tiap jenis punya deret nomornya sendiri, jadi dipisah
          tampilannya juga. "Semua" tetap ada untuk yang ingin
          melihat seluruhnya menurut waktu pengambilan. */}
      <nav className="mt-5 flex flex-wrap items-center gap-1 border-b border-garis pb-3">
        {jenis.map((j) => (
          <Link
            prefetch={false}
            key={j.kode}
            href={`/penomoran/buku-nomor?jenis=${j.kode}`}
            className={gayaTab(terpilih?.kode === j.kode)}
          >
            {j.nama}
          </Link>
        ))}
        <Link
          prefetch={false}
          href="/penomoran/buku-nomor?jenis=semua"
          className={gayaTab(semua)}
        >
          Semua
        </Link>
      </nav>

      {baris.length > 0 && (
        <p className="mt-3 mb-5 text-sm text-tinta-3">
          {terpakai} nomor terpakai
          {batal > 0 && ` · ${batal} batal`}
          {terakhir && (
            <>
              {" · terakhir "}
              <span className="font-mono text-tinta-2">{terakhir.nomor_lengkap}</span>
            </>
          )}
        </p>
      )}

      {baris.length === 0 ? (
        <div className="mt-5 rounded-lg border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">
            Belum ada nomor{terpilih ? ` ${terpilih.nama}` : ""} yang diambil.
          </p>
          <p className="mt-1 text-sm text-tinta-3">
            Nomor pertama akan muncul di sini begitu ada yang mengambilnya.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lembut border border-garis bg-permukaan">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="bg-permukaan-2 text-left text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
                <th className="border-b border-garis px-4 py-2.5">Nomor</th>
                {semua && <th className="border-b border-garis px-4 py-2.5">Jenis</th>}
                <th className="border-b border-garis px-4 py-2.5">Tanggal surat</th>
                <th className="border-b border-garis px-4 py-2.5">Perihal</th>
                <th className="border-b border-garis px-4 py-2.5">Pengambil</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => {
                const dibatalkan = b.status === "Batal";
                return (
                  <tr key={b.id} className={dibatalkan ? "text-tinta-3" : ""}>
                    <td className="border-b border-garis px-4 py-2.5 font-mono whitespace-nowrap">
                      <span className={dibatalkan ? "line-through" : ""}>
                        {b.nomor_lengkap}
                      </span>
                      {dibatalkan && (
                        <span className="ml-2 rounded-lg bg-permukaan-2 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide not-italic">
                          Batal
                        </span>
                      )}
                    </td>
                    {semua && (
                      <td className="border-b border-garis px-4 py-2.5 whitespace-nowrap">
                        {satu(b.jenis_dokumen)?.nama ?? "—"}
                      </td>
                    )}
                    <td className="border-b border-garis px-4 py-2.5 whitespace-nowrap">
                      {tanggalPanjang.format(new Date(b.tanggal_surat))}
                      {/* Waktu pengambilan hanya disebut kalau memang
                          berbeda dari tanggal suratnya — kalau tidak,
                          barisnya cuma jadi ramai tanpa menambah apa
                          pun. */}
                      {b.diambil_pada.slice(0, 10) !== b.tanggal_surat && (
                        <span className="block text-xs text-tinta-3">
                          diambil {tanggalPanjang.format(new Date(b.diambil_pada))}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-garis px-4 py-2.5">
                      {b.perihal}
                      {b.ditujukan_kepada && (
                        <span className="block text-xs text-tinta-3">
                          kepada {b.ditujukan_kepada}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-garis px-4 py-2.5 whitespace-nowrap">
                      {satu(b.pengguna)?.nama ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
