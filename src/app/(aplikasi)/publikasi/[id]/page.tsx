import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { bolehAkses } from "@/lib/akses";
import { getPenggunaAktif } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Penyunting } from "./penyunting";
import { FormTautan } from "./form-tautan";
import { FormRevisi } from "./form-revisi";

const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function HalamanDokumen({ params }: PageProps<"/publikasi/[id]">) {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");

  const berhak = (await bolehAkses("publikasi")) || (await bolehAkses("humas"));
  if (!berhak) redirect("/tanpa-akses");

  const { id } = await params;
  const supabase = await createClient();

  const { data: d } = await supabase
    .from("publikasi")
    .select(
      "id, judul, keterangan, jenis, isi, tautan_docs, berkas_jalur, berkas_nama, diunggah_pada, diubah_pada, pengunggah:diunggah_oleh(nama), penyunting:diubah_oleh(nama)",
    )
    .eq("id", Number(id))
    .maybeSingle();

  if (!d) notFound();

  const { data: revisi } = await supabase
    .from("publikasi_revisi")
    .select("id, versi, catatan, pada, berkas_nama, berkas_jalur, pengguna:oleh(nama)")
    .eq("publikasi_id", Number(id))
    .order("pada", { ascending: false });

  const pengunggah = Array.isArray(d.pengunggah) ? d.pengunggah[0] : d.pengunggah;
  const penyunting = Array.isArray(d.penyunting) ? d.penyunting[0] : d.penyunting;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link href="/publikasi" className="text-sm text-tinta-3 hover:underline">
          ← Kembali ke arsip
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{d.judul}</h1>
        <p className="mt-1 text-tinta-2">
          {d.jenis} · dikirim {waktu.format(new Date(d.diunggah_pada))}
          {pengunggah && ` oleh ${pengunggah.nama}`}
        </p>
        {d.diubah_pada && penyunting && (
          <p className="mt-0.5 text-sm text-hijau">
            Terakhir disunting {waktu.format(new Date(d.diubah_pada))} oleh{" "}
            {penyunting.nama}
          </p>
        )}
        {d.keterangan && <p className="mt-2 text-sm text-tinta-2">{d.keterangan}</p>}
      </div>

      {d.isi !== null ? (
        <Penyunting id={d.id} isiAwal={d.isi} />
      ) : d.berkas_jalur ? (
        <div className="rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
          <p className="font-medium">Dokumen ini berupa berkas.</p>
          <p className="mt-1 text-sm text-tinta-2">
            Berkas {d.berkas_nama} tidak bisa disunting di dalam peramban. Unduh
            lalu buka dengan Word bila perlu diubah.
          </p>
          <a
            href={`/publikasi/${d.id}/berkas`}
            className="mt-4 inline-block rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Unduh versi terakhir
          </a>
        </div>
      ) : (
        <div className="rounded-xl border border-garis bg-permukaan p-5 shadow-lembut">
          <p className="font-medium">Dokumen ini tersimpan di Google Drive.</p>
          <p className="mt-1 text-sm text-tinta-2">
            Tidak ada berkas yang diunggah ke sini — isinya dibuka lewat tautan
            di bawah. Perubahan yang dilakukan di sana tidak ikut tercatat pada
            riwayat halaman ini.
          </p>
        </div>
      )}

      {d.isi === null && d.berkas_jalur && <FormRevisi id={d.id} />}

      <FormTautan id={d.id} tautanAwal={d.tautan_docs} />

      {(revisi ?? []).length > 0 && (
        <section className="rounded-xl shadow-lembut border border-garis bg-permukaan p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Riwayat perubahan
          </h2>
          <ol className="flex flex-col gap-3">
            {(revisi ?? []).map((r) => {
              const oleh = Array.isArray(r.pengguna) ? r.pengguna[0] : r.pengguna;
              return (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 border-l-2 border-garis pl-3">
                  <div className="mr-auto">
                    <p className="text-sm">
                      <span className="font-medium">Versi {r.versi}</span>
                      {r.catatan ? ` — ${r.catatan}` : ""}
                    </p>
                    <p className="text-xs text-tinta-3">
                      {waktu.format(new Date(r.pada))}
                      {oleh && ` · ${oleh.nama}`}
                      {r.berkas_nama ? ` · ${r.berkas_nama}` : ""}
                    </p>
                  </div>
                  {r.berkas_jalur && (
                    <a
                      href={`/publikasi/${d.id}/revisi/${r.id}/berkas`}
                      className="text-xs text-tinta-3 hover:underline"
                    >
                      unduh versi ini
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
