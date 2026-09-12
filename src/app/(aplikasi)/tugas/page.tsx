import Link from "next/link";
import Ikon, { type NamaIkon } from "@/components/ikon";
import { wajibLogin } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import {
  MASIH_TERBUKA,
  hariIni as hitungHariIni,
  jatuhHariIni,
  kelompokTugas,
  pisahJenis,
  type Kelompok,
  type Tugas,
} from "@/lib/tugas";
import type { Lampiran } from "@/lib/lampiran";
import { BarisTugas } from "./baris-tugas";
import { FormTugas, type Anggota } from "./form-tugas";
import { TutupHari } from "./tutup-hari";

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Judul tiap kelompok, beserti lambang dan nada warnanya. */
const KELOMPOK: Record<Kelompok, { judul: string; ikon: NamaIkon; sunyi?: string }> = {
  lewat: { judul: "Lewat tenggat", ikon: "peringatan", sunyi: "text-merah" },
  "hari-ini": { judul: "Hari ini", ikon: "waktu" },
  "minggu-ini": { judul: "Tujuh hari ke depan", ikon: "rekap" },
  nanti: { judul: "Menyusul", ikon: "waktu" },
};

export default async function HalamanTugas() {
  const pengguna = await wajibLogin();
  const kini = hitungHariIni();

  const bolehPapan = await punyaIzin("tugas_unit");

  const supabase = await createClient();
  const { data: orang } = bolehPapan
    ? await supabase
        .from("pengguna")
        .select("id, nama, jabatan")
        .eq("aktif", true)
        .order("id")
    : { data: null };

  const anggota = (orang ?? []) as Anggota[];

  const { data } = await supabase
    .from("tugas")
    .select(
      "id, untuk, judul, keterangan, tanggal_mulai, tenggat, prioritas, status, catatan_hasil, selesai_pada, jenis, hari, terakhir_dikerjakan",
    )
    .eq("untuk", pengguna.id)
    .order("tenggat", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(300);

  const semua = (data ?? []) as Tugas[];

  // Lampiran diambil sekali untuk seluruh daftar, bukan satu kueri
  // per baris — tiga puluh tugas berarti tiga puluh perjalanan ke
  // database, dan halamannya akan terasa berat tanpa alasan.
  const { data: berkas } = await supabase
    .from("tugas_lampiran")
    .select("id, tugas_id, jenis, judul, berkas_nama, berkas_ukuran, tautan, pada")
    .in("tugas_id", semua.length > 0 ? semua.map((t) => t.id) : [0])
    .order("pada", { ascending: false });

  const lampiran = new Map<number, Lampiran[]>();
  for (const l of (berkas ?? []) as Lampiran[]) {
    const kumpulan = lampiran.get(l.tugas_id) ?? [];
    kumpulan.push(l);
    lampiran.set(l.tugas_id, kumpulan);
  }
  const { tugas: adaSelesainya, berjalan } = pisahJenis(
    semua.filter((t) => MASIH_TERBUKA.includes(t.status)),
  );
  const terbuka = adaSelesainya;

  const kelompok: Record<Kelompok, Tugas[]> = {
    lewat: [],
    "hari-ini": [],
    "minggu-ini": [],
    nanti: [],
  };
  for (const t of terbuka) kelompok[kelompokTugas(t, kini)].push(t);

  // Tugas berulang yang hari ini memang harinya ikut naik ke daftar
  // hari ini — itulah gunanya mencatat harinya. Yang sudah ditandai
  // turun lagi ke bagiannya sendiri.
  const berjalanHariIni = berjalan.filter((t) => jatuhHariIni(t, kini));
  kelompok["hari-ini"].push(...berjalanHariIni);

  // Yang ditutup sore hari: yang lewat tenggat dan yang jatuh hari
  // ini. Yang masih jauh tenggatnya tidak ikut ditanya — menanyakan
  // pekerjaan yang memang belum waktunya cuma melatih orang menekan
  // tombol tanpa membaca.
  const untukDitutup = [...kelompok.lewat, ...kelompok["hari-ini"]];

  const selesai = semua
    .filter((t) => t.status === "Selesai" || t.status === "Batal")
    .sort((a, b) => (b.selesai_pada ?? "").localeCompare(a.selesai_pada ?? ""))
    .slice(0, 15);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tugas Saya</h1>
          <p className="mt-1 flex items-center gap-1.5 text-tinta-2">
            <Ikon nama="waktu" ukuran={14} />
            {tanggalPanjang.format(new Date())}
          </p>
        </div>
        {bolehPapan && (
          <Link
            href="/tugas/unit"
            className="flex items-center gap-2 rounded-lg border border-garis px-4 py-2.5 text-sm font-medium text-tinta-2 hover:bg-permukaan-2"
          >
            <Ikon nama="pengguna" ukuran={16} />
            Papan tugas unit
          </Link>
        )}
      </div>

      <FormTugas hariIni={kini} saya={pengguna.id} anggota={anggota} />

      {terbuka.length === 0 ? (
        berjalan.length === 0 && (
        <div className="rounded-xl border border-garis bg-permukaan px-5 py-10 text-center shadow-lembut">
          <p className="font-medium">Daftar tugas Anda kosong.</p>
          <p className="mt-1 text-sm text-tinta-3">
            Tulis satu saja dulu — yang paling mengganjal pikiran pagi ini.
          </p>
        </div>
        )
      ) : (
        (Object.keys(KELOMPOK) as Kelompok[]).map((k) =>
          kelompok[k].length === 0 ? null : (
            <section key={k} className="flex flex-col gap-3">
              <h2
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                  KELOMPOK[k].sunyi ?? "text-tinta-3"
                }`}
              >
                <Ikon nama={KELOMPOK[k].ikon} ukuran={14} />
                {KELOMPOK[k].judul}
                <span className="font-normal normal-case tracking-normal text-tinta-3">
                  {kelompok[k].length}
                </span>
              </h2>
              <ul className="flex flex-col gap-2">
                {kelompok[k].map((t) => (
                  <BarisTugas
                    key={t.id}
                    t={t}
                    hariIni={kini}
                    lampiran={lampiran.get(t.id) ?? []}
                  />
                ))}
              </ul>
            </section>
          ),
        )
      )}

      {berjalan.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            <Ikon nama="pengguna" ukuran={14} />
            Tugas berulang
            <span className="font-normal normal-case tracking-normal text-tinta-3">
              {berjalan.length}
            </span>
          </h2>
          <p className="-mt-1 text-sm text-tinta-2">
            Kembali lagi tiap hari yang dipilih. Yang harinya jatuh hari ini
            naik ke daftar di atas; sisanya menunggu gilirannya. Tetap terlihat
            Koordinator sebagai beban yang Anda tanggung.
          </p>
          <ul className="flex flex-col gap-2">
            {berjalan
              .filter((t) => !berjalanHariIni.includes(t))
              .map((t) => (
              <BarisTugas
                key={t.id}
                t={t}
                hariIni={kini}
                lampiran={lampiran.get(t.id) ?? []}
              />
              ))}
          </ul>
        </section>
      )}

      <TutupHari daftar={untukDitutup} hariIni={kini} />

      {selesai.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            <Ikon nama="centang" ukuran={14} />
            Sudah ditutup
          </h2>
          <ul className="flex flex-col gap-2">
            {selesai.map((t) => (
              <BarisTugas
                key={t.id}
                t={t}
                hariIni={kini}
                lampiran={lampiran.get(t.id) ?? []}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
