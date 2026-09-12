import { bolehAkses } from "@/lib/akses";
import { wajibLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SLA_JAM, pecahKategori, pokokKategori } from "@/lib/komplain-pilihan";
import {
  MASIH_TERBUKA,
  hariIni as hitungHariIni,
  kelompokTugas,
  pisahJenis,
  type Tugas,
} from "@/lib/tugas";
import { PemilihBulan } from "./pemilih-bulan";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Batas awal dan akhir satu bulan, dalam waktu setempat. */
function rentang(bulan: number, tahun: number) {
  const awal = new Date(tahun, bulan - 1, 1);
  const akhir = new Date(tahun, bulan, 1);
  return { awal: awal.toISOString(), akhir: akhir.toISOString() };
}

function Angka({
  label,
  nilai,
  keterangan,
}: {
  label: string;
  nilai: string | number;
  keterangan?: string;
}) {
  return (
    <div className="rounded-lg border border-garis bg-permukaan px-4 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{nilai}</p>
      {keterangan && <p className="mt-0.5 text-xs text-tinta-3">{keterangan}</p>}
    </div>
  );
}

function Rincian({ judul, baris }: { judul: string; baris: [string, string][] }) {
  if (baris.length === 0) return null;
  return (
    <div className="rounded-xl shadow-lembut border border-garis bg-permukaan p-4">
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
        {judul}
      </p>
      <dl className="flex flex-col gap-1 text-sm">
        {baris.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-tinta-2">{k}</dt>
            <dd className="font-mono">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Menghitung berapa kali tiap nilai muncul, urut dari yang terbanyak. */
function kelompokkan(nilai: (string | null)[]): [string, string][] {
  const hitung = new Map<string, number>();
  for (const n of nilai) {
    const kunci = n ?? "—";
    hitung.set(kunci, (hitung.get(kunci) ?? 0) + 1);
  }
  return [...hitung.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => [k, String(n)]);
}

export default async function HalamanRekap({ searchParams }: PageProps<"/rekap">) {
  await wajibLogin();
  const q = await searchParams;

  const kini = new Date();
  const bulan = Number(q.bulan) || kini.getMonth() + 1;
  const tahun = Number(q.tahun) || kini.getFullYear();
  const { awal, akhir } = rentang(bulan, tahun);

  const supabase = await createClient();
  const [bolehKomplain, bolehPublikasi] = await Promise.all([
    bolehAkses("komplain"),
    bolehAkses("publikasi").then(async (a) => a || (await bolehAkses("humas"))),
  ]);

  // Penomoran surat terbuka untuk seluruh anggota — memang itu
  // gunanya buku nomor bersama.
  const { data: nomor } = await supabase
    .from("nomor")
    .select("status, jenis_dokumen(nama), pengguna:diambil_oleh(nama)")
    .gte("diambil_pada", awal)
    .lt("diambil_pada", akhir);

  const { data: komplain } = bolehKomplain
    ? await supabase
        .from("komplain")
        .select("status, grading, kategori_masalah, sla_jam, sla_status")
        .gte("waktu_pelaporan", awal)
        .lt("waktu_pelaporan", akhir)
    : { data: null };

  // Tugas yang ditutup pada bulan itu — inilah bahan laporan
  // bulanannya. Yang masih berjalan ikut dihitung supaya terlihat
  // berapa yang terbawa ke bulan berikutnya.
  const { data: tugasSelesai } = await supabase
    .from("tugas")
    .select(
      "id, untuk, judul, keterangan, tanggal_mulai, tenggat, prioritas, status, catatan_hasil, selesai_pada, jenis, hari, terakhir_dikerjakan, pemilik:untuk(nama)",
    )
    .eq("status", "Selesai")
    .gte("selesai_pada", awal)
    .lt("selesai_pada", akhir)
    .order("selesai_pada", { ascending: true });

  const { data: tugasTerbuka } = await supabase
    .from("tugas")
    .select(
      "id, untuk, judul, keterangan, tanggal_mulai, tenggat, prioritas, status, catatan_hasil, selesai_pada, jenis, hari, terakhir_dikerjakan, pemilik:untuk(nama)",
    )
    .in("status", MASIH_TERBUKA)
    .limit(500);

  const { data: publikasi } = bolehPublikasi
    ? await supabase
        .from("publikasi")
        .select("jenis")
        .gte("diunggah_pada", awal)
        .lt("diunggah_pada", akhir)
    : { data: null };

  const tanggalKini = hitungHariIni();
  const selesaiBulanIni = ((tugasSelesai ?? []) as unknown as Tugas[]).filter(
    (t) => t.jenis !== "Berjalan",
  );
  const { tugas: masihBerjalan, berjalan: peranBerjalan } = pisahJenis(
    (tugasTerbuka ?? []) as unknown as Tugas[],
  );
  const tugasLewat = masihBerjalan.filter(
    (t) => kelompokTugas(t, tanggalKini) === "lewat",
  );

  const daftarNomor = nomor ?? [];
  const ditanggapi = (komplain ?? []).filter((k) => k.sla_jam !== null);
  const memenuhi = ditanggapi.filter((k) => k.sla_status === "Met").length;


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rekap Bulanan</h1>
          <p className="mt-1 text-tinta-2">
            {NAMA_BULAN[bulan - 1]} {tahun} · bahan laporan bulanan unit.
          </p>
        </div>
        <PemilihBulan bulan={bulan} tahun={tahun} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Penomoran surat
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Angka label="Nomor diambil" nilai={daftarNomor.length} />
          <Angka
            label="Terpakai"
            nilai={daftarNomor.filter((n) => n.status === "Terpakai").length}
          />
          <Angka
            label="Batal"
            nilai={daftarNomor.filter((n) => n.status === "Batal").length}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Rincian
            judul="Menurut jenis dokumen"
            baris={kelompokkan(
              daftarNomor.map((n) => {
                const j = Array.isArray(n.jenis_dokumen) ? n.jenis_dokumen[0] : n.jenis_dokumen;
                return j?.nama ?? null;
              }),
            )}
          />
          <Rincian
            judul="Menurut pengambil"
            baris={kelompokkan(
              daftarNomor.map((n) => {
                const p = Array.isArray(n.pengguna) ? n.pengguna[0] : n.pengguna;
                return p?.nama ?? null;
              }),
            )}
          />
        </div>
      </section>

      {bolehKomplain && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Komplain pasien
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <Angka label="Masuk" nilai={(komplain ?? []).length} />
            <Angka
              label="Selesai"
              nilai={(komplain ?? []).filter((k) => k.status === "Selesai").length}
            />
            <Angka
              label={`Ditanggapi ≤ ${SLA_JAM} jam`}
              nilai={
                ditanggapi.length === 0
                  ? "—"
                  : `${Math.round((memenuhi / ditanggapi.length) * 100)}%`
              }
              keterangan={`${ditanggapi.length} sudah ditanggapi`}
            />
            <Angka
              label="Grading merah"
              nilai={(komplain ?? []).filter((k) => k.grading === "Merah").length}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Satu komplain bisa punya beberapa kategori, jadi
                dihitung per kategori — bukan per gabungannya.
                Akibatnya jumlah baris di sini bisa melebihi jumlah
                komplainnya, dan memang begitu seharusnya.
                Dihitung menurut nama pokoknya: "Lainnya: parkir
                penuh" masuk kelompok "Lainnya", supaya keterangan
                sekali-pakai tidak memecah rekap jadi puluhan baris
                yang tidak bisa dibandingkan antar bulan. */}
            <Rincian
              judul="Menurut kategori"
              baris={kelompokkan(
                (komplain ?? []).flatMap((k) =>
                  pecahKategori(k.kategori_masalah).map(pokokKategori),
                ),
              )}
            />
            <Rincian judul="Menurut grading" baris={kelompokkan((komplain ?? []).map((k) => k.grading))} />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Tugas
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Angka
            label="Selesai bulan ini"
            nilai={selesaiBulanIni.length}
            keterangan="ditutup pada rentang bulan ini"
          />
          <Angka
            label="Masih berjalan"
            nilai={masihBerjalan.length}
            keterangan="terbawa ke bulan berikutnya"
          />
          <Angka label="Lewat tenggat" nilai={tugasLewat.length} />
          <Angka
            label="Peran berjalan"
            nilai={peranBerjalan.length}
            keterangan="tanpa garis selesai"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Rincian
            judul="Selesai menurut pemegangnya"
            baris={kelompokkan(
              selesaiBulanIni.map((t) => {
                const o = t as unknown as { pemilik?: { nama: string } | { nama: string }[] };
                const p = Array.isArray(o.pemilik) ? o.pemilik[0] : o.pemilik;
                return p?.nama ?? null;
              }),
            )}
          />
          <Rincian
            judul="Selesai menurut prioritas"
            baris={kelompokkan(selesaiBulanIni.map((t) => t.prioritas))}
          />
        </div>

        {/* Daftarnya ikut ditulis, bukan cuma angkanya. Yang dipakai
            menyusun laporan bulanan adalah apa yang dikerjakan, dan
            catatan hasilnya — angka saja tidak bisa diceritakan
            kepada siapa pun. */}
        {selesaiBulanIni.length > 0 && (
          <div className="rounded-xl border border-garis bg-permukaan p-4 shadow-lembut">
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
              Yang diselesaikan bulan ini
            </p>
            <ol className="flex flex-col gap-2">
              {selesaiBulanIni.map((t) => (
                <li key={t.id} className="border-l-2 border-hijau pl-3 text-sm">
                  {t.judul}
                  {t.catatan_hasil && (
                    <span className="block text-xs text-tinta-3">{t.catatan_hasil}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {bolehPublikasi && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Arsip publikasi
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Angka label="Dokumen masuk" nilai={(publikasi ?? []).length} />
            <Rincian judul="Menurut jenis" baris={kelompokkan((publikasi ?? []).map((p) => p.jenis))} />
          </div>
        </section>
      )}

      <p className="text-xs text-tinta-3">
        Angka dihitung dari data yang tercatat pada rentang bulan itu. Bagian
        yang tidak Anda lihat di halaman ini adalah bagian yang memang bukan
        wewenang akun Anda.
      </p>
    </div>
  );
}
