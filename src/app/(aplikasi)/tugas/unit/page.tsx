import Link from "next/link";
import { redirect } from "next/navigation";
import Ikon from "@/components/ikon";
import { getPenggunaAktif } from "@/lib/auth";
import { bolehAkses } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import {
  MASIH_TERBUKA,
  hariIni as hitungHariIni,
  kelompokTugas,
  sebutTenggat,
  warnaStatus,
  type Tugas,
} from "@/lib/tugas";

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type Orang = { id: number; nama: string; jabatan: string };

/**
 * Papan tugas seluruh unit — hanya untuk Koordinator.
 *
 * Disusun per orang, bukan per tenggat. Yang ingin diketahui
 * Koordinator bukan "apa saja yang jatuh hari ini" melainkan "siapa
 * sedang menanggung apa" — dan itulah yang menjawab pertanyaan
 * berikutnya: siapa yang bisa dititipi pekerjaan baru, dan siapa
 * yang justru perlu dibantu.
 */
export default async function PapanTugasUnit() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");
  if (!(await bolehAkses("tugas_unit"))) redirect("/tanpa-akses");

  const kini = hitungHariIni();
  const supabase = await createClient();

  const [{ data: orang }, { data: tugas }] = await Promise.all([
    supabase
      .from("pengguna")
      .select("id, nama, jabatan")
      .eq("aktif", true)
      .order("id"),
    supabase
      .from("tugas")
      .select(
        "id, untuk, judul, keterangan, tanggal_mulai, tenggat, prioritas, status, catatan_hasil, selesai_pada",
      )
      .order("tenggat", { ascending: true, nullsFirst: false })
      .limit(500),
  ]);

  const daftar = (tugas ?? []) as Tugas[];
  const anggota = (orang ?? []) as Orang[];

  const terbuka = daftar.filter((t) => MASIH_TERBUKA.includes(t.status));
  const selesaiHariIni = daftar.filter(
    (t) => t.status === "Selesai" && (t.selesai_pada ?? "").slice(0, 10) >= kini,
  );

  const totalLewat = terbuka.filter((t) => kelompokTugas(t, kini) === "lewat").length;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link href="/tugas" className="text-sm text-tinta-3 hover:underline">
          ← Kembali ke tugas saya
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Papan Tugas Unit</h1>
        <p className="mt-1 flex items-center gap-1.5 text-tinta-2">
          <Ikon nama="waktu" ukuran={14} />
          {tanggalPanjang.format(new Date())}
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-garis bg-permukaan p-4 shadow-lembut">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Sedang berjalan
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{terbuka.length}</p>
        </div>
        <div
          className={`rounded-xl border bg-permukaan p-4 shadow-lembut ${
            totalLewat > 0 ? "border-merah" : "border-garis"
          }`}
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Lewat tenggat
          </p>
          <p
            className={`mt-2 text-2xl font-semibold tabular-nums ${
              totalLewat > 0 ? "text-merah" : ""
            }`}
          >
            {totalLewat}
          </p>
        </div>
        <div className="rounded-xl border border-garis bg-permukaan p-4 shadow-lembut">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-tinta-3">
            Selesai hari ini
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {selesaiHariIni.length}
          </p>
        </div>
      </section>

      {anggota.map((a) => {
        const miliknya = terbuka.filter((t) => t.untuk === a.id);
        const lewat = miliknya.filter((t) => kelompokTugas(t, kini) === "lewat");
        const sisanya = miliknya.filter((t) => kelompokTugas(t, kini) !== "lewat");
        const tuntas = selesaiHariIni.filter((t) => t.untuk === a.id).length;

        return (
          <section
            key={a.id}
            className="flex flex-col gap-3 rounded-xl border border-garis bg-permukaan p-5 shadow-lembut"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">
                {a.nama}
                <span className="ml-2 text-xs font-normal text-tinta-3">{a.jabatan}</span>
              </h2>
              <p className="text-xs text-tinta-3">
                {miliknya.length} berjalan
                {lewat.length > 0 && (
                  <span className="ml-2 font-semibold text-merah">
                    {lewat.length} lewat tenggat
                  </span>
                )}
                {tuntas > 0 && (
                  <span className="ml-2 text-hijau">{tuntas} selesai hari ini</span>
                )}
              </p>
            </div>

            {miliknya.length === 0 ? (
              <p className="text-sm text-tinta-3">
                Tidak ada tugas berjalan yang tercatat.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {[...lewat, ...sisanya].map((t) => (
                  <li
                    key={t.id}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 pl-3 ${
                      kelompokTugas(t, kini) === "lewat" ? "border-merah" : "border-garis"
                    }`}
                  >
                    <span className="min-w-0 flex-1 text-sm">
                      {t.judul}
                      {t.catatan_hasil && (
                        <span className="block text-xs text-tinta-3">
                          {t.catatan_hasil}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-xs ${
                        kelompokTugas(t, kini) === "lewat"
                          ? "font-semibold text-merah"
                          : "text-tinta-3"
                      }`}
                    >
                      {sebutTenggat(t.tenggat, kini)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${warnaStatus(t.status)}`}
                    >
                      {t.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <p className="text-xs text-tinta-3">
        Papan ini hanya terbuka untuk Koordinator. Anggota lain hanya melihat
        daftarnya sendiri.
      </p>
    </div>
  );
}
