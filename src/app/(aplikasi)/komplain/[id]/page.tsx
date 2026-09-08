import Link from "next/link";
import { notFound } from "next/navigation";
import { wajibAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { SLA_JAM } from "@/lib/komplain-pilihan";
import { FormTindakLanjut, type NilaiAwal } from "./form-tindak-lanjut";

const waktuPanjang = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const tanggalSaja = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function Baris({ label, nilai }: { label: string; nilai: string | null }) {
  return (
    <>
      <dt className="text-tinta-3">{label}</dt>
      <dd className="mb-1">{nilai && nilai.trim() !== "" ? nilai : "—"}</dd>
    </>
  );
}

export default async function HalamanDetailKomplain({
  params,
}: PageProps<"/komplain/[id]">) {
  await wajibAkses("komplain");
  const { id } = await params;

  const supabase = await createClient();
  const { data: k } = await supabase
    .from("komplain")
    .select("*, pengguna:dicatat_oleh(nama)")
    .eq("id", Number(id))
    .maybeSingle();

  if (!k) notFound();

  const { data: riwayat } = await supabase
    .from("komplain_riwayat")
    .select("id, aktivitas, detail, pada, pengguna:oleh(nama)")
    .eq("komplain_id", Number(id))
    .order("pada", { ascending: false });

  const pencatat = Array.isArray(k.pengguna) ? k.pengguna[0] : k.pengguna;

  const awal: NilaiAwal = {
    id: k.id,
    pasienNoRm: k.pasien_no_rm ?? "",
    penerimaNama: k.penerima_nama ?? "",
    penerimaUnit: k.penerima_unit ?? "",
    penerimaJabatan: k.penerima_jabatan ?? "",
    jawaban: k.jawaban ?? "",
    hasil: k.hasil_penyelesaian ?? "",
    status: k.status ?? "Baru",
    grading: k.grading ?? "",
    kepuasan: k.kepuasan_penanganan ?? "",
    evaluasi: k.evaluasi ?? "",
    perluEskalasi: k.perlu_eskalasi === true,
    jenisKomite: k.jenis_komite ?? "",
    tglLaporKomite: k.tgl_lapor_komite ?? "",
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/komplain" className="text-sm text-tinta-3 hover:underline">
          ← Kembali ke daftar komplain
        </Link>
        <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight">{k.kode}</h1>
        <p className="mt-1 text-tinta-2">
          Dilaporkan {waktuPanjang.format(new Date(k.waktu_pelaporan))}
          {pencatat && ` · dicatat oleh ${pencatat.nama}`}
        </p>
        {k.sla_jam !== null && (
          <p className={`mt-1 text-sm ${k.sla_status === "Breach" ? "text-merah" : "text-hijau"}`}>
            Ditanggapi setelah {Number(k.sla_jam)} jam
            {k.sla_status === "Breach"
              ? ` — melewati ambang ${SLA_JAM} jam`
              : ` — dalam ambang ${SLA_JAM} jam`}
          </p>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="rounded border border-garis bg-permukaan p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              Isi laporan
            </h2>
            <dl className="grid grid-cols-[9rem_1fr] gap-x-4 text-sm">
              <Baris label="Pelapor" nilai={k.pelapor_nama} />
              <Baris label="Kontak pelapor" nilai={k.pelapor_hp} />
              <Baris label="Alamat pelapor" nilai={k.pelapor_alamat} />
              <Baris label="Pasien" nilai={k.pasien_nama} />
              <Baris
                label="Tanggal lahir"
                nilai={k.pasien_tgl_lahir ? tanggalSaja.format(new Date(k.pasien_tgl_lahir)) : null}
              />
              <Baris label="No. rekam medis" nilai={k.pasien_no_rm} />
              <Baris label="Kontak pasien" nilai={k.pasien_hp} />
              <Baris label="Alamat pasien" nilai={k.pasien_alamat} />
              <Baris label="Jalur / media" nilai={`${k.jalur_pelaporan} · ${k.media_pelaporan}`} />
              <Baris label="Kategori / sumber" nilai={`${k.kategori_masalah} · ${k.sumber_pelaporan}`} />
              <Baris label="Kepuasan awal" nilai={k.kepuasan_awal} />
            </dl>

            <div className="mt-4 border-t border-garis pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-tinta-3">
                Detail masalah
              </p>
              <p className="mt-2 text-sm whitespace-pre-wrap">{k.detail_masalah}</p>
            </div>
          </section>

          <section className="rounded border border-garis bg-permukaan p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              Riwayat aktivitas
            </h2>
            {(riwayat ?? []).length === 0 ? (
              <p className="text-sm text-tinta-3">Belum ada aktivitas.</p>
            ) : (
              <ol className="flex flex-col gap-4">
                {(riwayat ?? []).map((r) => {
                  const oleh = Array.isArray(r.pengguna) ? r.pengguna[0] : r.pengguna;
                  return (
                    <li key={r.id} className="border-l-2 border-hijau pl-3">
                      <p className="text-sm font-medium">{r.aktivitas}</p>
                      <p className="text-xs text-tinta-3">
                        {waktuPanjang.format(new Date(r.pada))}
                        {oleh && ` · ${oleh.nama}`}
                      </p>
                      {r.detail && <p className="mt-0.5 text-sm text-tinta-2">{r.detail}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded border border-garis bg-permukaan p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              Tindak lanjut
            </h2>
            <p className="mt-1 mb-4 text-sm text-tinta-2">
              Isi jawaban dan hasil penanganannya di sini. Waktu tanggapan
              dicatat sekali, saat pertama kali disimpan.
            </p>
            <FormTindakLanjut awal={awal} />
          </section>

          <section className="rounded border border-garis bg-permukaan p-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
              Formulir resmi
            </h2>
            <p className="mb-4 text-sm text-tinta-2">
              Berisi data terakhir yang sudah disimpan. Buka dengan Word, lalu
              simpan sebagai PDF bila perlu diarsipkan.
            </p>
            <a
              href={`/komplain/${k.id}/dokumen`}
              className="inline-block rounded border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
            >
              Unduh formulir komplain
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
