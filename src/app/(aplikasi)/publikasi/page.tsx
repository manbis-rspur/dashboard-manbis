import Link from "next/link";
import { redirect } from "next/navigation";
import { bolehAkses } from "@/lib/akses";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hapusPublikasi } from "@/lib/publikasi-actions";
import { FormUnggah } from "./form-unggah";

const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function ukuran(bita: number | null) {
  if (!bita) return "";
  if (bita < 1024 * 1024) return `${Math.round(bita / 1024)} KB`;
  return `${(bita / 1024 / 1024).toFixed(1)} MB`;
}

export default async function HalamanPublikasi() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");

  const bolehUnggah = await bolehAkses("humas");
  const bolehBaca = bolehUnggah || (await bolehAkses("publikasi"));
  if (!bolehBaca) redirect("/tanpa-akses");

  const supabase = await createClient();
  const { data } = await supabase
    .from("publikasi")
    .select(
      "id, judul, keterangan, jenis, isi, tautan_docs, berkas_nama, berkas_ukuran, diunggah_pada, diubah_pada, pengguna:diunggah_oleh(nama)",
    )
    .order("diunggah_pada", { ascending: false })
    .limit(200);

  const dokumen = data ?? [];

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Arsip Publikasi</h1>
        <p className="mt-1 max-w-2xl text-tinta-2">
          {bolehUnggah
            ? "Dokumen yang sudah final diunggah ke sini supaya Koordinator bisa membacanya."
            : "Dokumen hasil kerja Humas dan Digital Marketing yang sudah final."}
        </p>
      </div>

      {bolehUnggah && <FormUnggah />}

      {dokumen.length === 0 ? (
        <div className="rounded border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">Belum ada dokumen.</p>
          <p className="mt-1 text-sm text-tinta-3">
            {bolehUnggah
              ? "Unggah dokumen pertama lewat formulir di atas."
              : "Dokumen akan muncul di sini begitu diunggah."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {dokumen.map((d) => {
            const oleh = Array.isArray(d.pengguna) ? d.pengguna[0] : d.pengguna;
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-garis bg-permukaan px-4 py-3"
              >
                <div className="mr-auto min-w-0">
                  <Link href={`/publikasi/${d.id}`} className="font-medium hover:underline">
                    {d.judul}
                  </Link>
                  <p className="text-xs text-tinta-3">
                    {d.jenis} · {waktu.format(new Date(d.diunggah_pada))}
                    {oleh && ` · ${oleh.nama}`}
                    {d.berkas_ukuran ? ` · ${ukuran(d.berkas_ukuran)}` : ""}
                    {d.diubah_pada ? " · sudah disunting" : ""}
                  </p>
                  {d.keterangan && (
                    <p className="mt-0.5 text-sm text-tinta-2">{d.keterangan}</p>
                  )}
                </div>

                {d.tautan_docs && (
                  <a
                    href={d.tautan_docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                  >
                    Google Docs
                  </a>
                )}

                {d.isi === null && (
                  <a
                    href={`/publikasi/${d.id}/berkas`}
                    className="rounded border border-garis px-3 py-1.5 text-xs font-medium text-tinta-2 hover:bg-permukaan-2"
                  >
                    Unduh
                  </a>
                )}

                <Link
                  href={`/publikasi/${d.id}`}
                  className="rounded bg-hijau px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  {d.isi === null ? "Buka" : "Buka & sunting"}
                </Link>

                <form action={hapusPublikasi}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" className="text-xs text-tinta-3 hover:text-merah">
                    hapus
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
