import Link from "next/link";
import { wajibAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { SLA_JAM } from "@/lib/komplain-pilihan";
import { DaftarKomplain, type BarisKomplain } from "./daftar-komplain";

function Angka({
  label,
  nilai,
  warna,
}: {
  label: string;
  nilai: string | number;
  warna?: string;
}) {
  return (
    <div className="rounded-lg border border-garis bg-permukaan px-4 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${warna ?? ""}`}>{nilai}</p>
    </div>
  );
}

export default async function HalamanKomplain() {
  await wajibAkses("komplain");

  const supabase = await createClient();
  const { data } = await supabase
    .from("komplain")
    .select(
      "id, kode, waktu_pelaporan, pasien_nama, pelapor_nama, kategori_masalah, status, grading, sla_jam, sla_status, detail_masalah",
    )
    .order("waktu_pelaporan", { ascending: false })
    .limit(500);

  const semua = data ?? [];

  const baris: BarisKomplain[] = semua.map((k) => ({
    id: k.id,
    kode: k.kode,
    waktu: k.waktu_pelaporan,
    pasien: k.pasien_nama,
    pelapor: k.pelapor_nama,
    kategori: k.kategori_masalah,
    status: k.status,
    grading: k.grading,
    slaJam: k.sla_jam === null ? null : Number(k.sla_jam),
    slaStatus: k.sla_status,
    detail: k.detail_masalah,
  }));

  const ditanggapi = baris.filter((b) => b.slaJam !== null);
  const memenuhi = ditanggapi.filter((b) => b.slaStatus === "Met").length;
  const rerata =
    ditanggapi.length === 0
      ? 0
      : ditanggapi.reduce((j, b) => j + (b.slaJam ?? 0), 0) / ditanggapi.length;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Komplain Pasien</h1>
          <p className="mt-1 text-tinta-2">
            Pencatatan dan tindak lanjut keluhan pelanggan RSPUR.
          </p>
        </div>
        <Link
          href="/komplain/baru"
          className="rounded-lg bg-hijau px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Catat komplain
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Angka label="Total" nilai={baris.length} />
        <Angka label="Baru" nilai={baris.filter((b) => b.status === "Baru").length} />
        <Angka label="Diproses" nilai={baris.filter((b) => b.status === "Diproses").length} />
        <Angka label="Selesai" nilai={baris.filter((b) => b.status === "Selesai").length} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Angka
          label={`Ditanggapi ≤ ${SLA_JAM} jam`}
          nilai={
            ditanggapi.length === 0
              ? "—"
              : `${Math.round((memenuhi / ditanggapi.length) * 100)}%`
          }
        />
        <Angka
          label="Rata-rata tanggapan"
          nilai={ditanggapi.length === 0 ? "—" : `${rerata.toFixed(1)} jam`}
        />
        <Angka
          label="Grading merah"
          nilai={baris.filter((b) => b.grading === "Merah").length}
          warna="text-merah"
        />
      </div>

      <DaftarKomplain baris={baris} />
    </div>
  );
}
