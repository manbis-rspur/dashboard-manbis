import { redirect } from "next/navigation";
import Ikon from "@/components/ikon";
import { getPenggunaAktif } from "@/lib/auth";
import { punyaIzin } from "@/lib/akses";
import { createClient } from "@/lib/supabase/server";
import { hapusLibur } from "@/lib/libur-actions";
import { hariIni as hitungHariIni } from "@/lib/tugas";
import type { HariLibur } from "@/lib/libur";
import { FormLibur } from "./form-libur";

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Kalender libur unit.
 *
 * Diisi sendiri sekali setahun dari SKB 3 Menteri, bukan diambil dari
 * layanan kalender di luar — layanan gratis semacam itu bisa mati
 * diam-diam, dan kalau mati, pengingatnya ikut salah tanpa ada yang
 * menyadari.
 */
export default async function HalamanHariLibur() {
  const pengguna = await getPenggunaAktif();
  if (!pengguna) redirect("/login");

  const bolehAtur = (await punyaIzin("tugas_unit")) || pengguna.peran === "Admin";
  const kini = hitungHariIni();

  const supabase = await createClient();
  const { data } = await supabase
    .from("hari_libur")
    .select("tanggal, keterangan, jenis")
    .gte("tanggal", `${kini.slice(0, 4)}-01-01`)
    .order("tanggal");

  const daftar = (data ?? []) as HariLibur[];
  const akanDatang = daftar.filter((l) => l.tanggal >= kini);
  const sudahLewat = daftar.filter((l) => l.tanggal < kini);

  return (
    <div className="flex max-w-3xl flex-col gap-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hari Libur</h1>
        <p className="mt-1 text-tinta-2">
          Pada tanggal yang terdaftar di sini, pengingat tugas tidak dikirim.
          Sabtu dan Minggu tidak perlu didaftarkan — keduanya sudah dianggap
          libur.
        </p>
      </div>

      {bolehAtur ? (
        <FormLibur />
      ) : (
        <p className="rounded-lg border-l-2 border-garis bg-permukaan-2 px-3 py-2 text-sm text-tinta-2">
          Hanya Koordinator yang bisa mengatur kalender libur unit. Anda tetap
          bisa melihatnya.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          <Ikon nama="waktu" ukuran={14} />
          Akan datang
          <span className="font-normal normal-case tracking-normal">
            {akanDatang.length}
          </span>
        </h2>

        {akanDatang.length === 0 ? (
          <p className="rounded-xl border border-garis bg-permukaan px-5 py-8 text-center text-sm text-tinta-3 shadow-lembut">
            Belum ada hari libur yang tercatat. Salin dari SKB 3 Menteri sekali
            saja, lalu tidak perlu diurus lagi sampai tahun depan.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {akanDatang.map((l) => (
              <li
                key={l.tanggal}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-garis bg-permukaan px-4 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{l.keterangan}</span>
                  <span className="block text-xs text-tinta-3">
                    {tanggalPanjang.format(new Date(`${l.tanggal}T00:00:00Z`))}
                  </span>
                </span>
                <span className="rounded-full border border-garis px-2.5 py-0.5 text-xs text-tinta-3">
                  {l.jenis}
                </span>
                {bolehAtur && (
                  <form action={hapusLibur}>
                    <input type="hidden" name="tanggal" value={l.tanggal} />
                    <button type="submit" className="text-xs text-tinta-3 hover:text-merah">
                      hapus
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {sudahLewat.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Sudah lewat tahun ini
          </h2>
          <p className="text-sm text-tinta-2">
            {sudahLewat.map((l) => l.keterangan).join(" · ")}
          </p>
        </section>
      )}
    </div>
  );
}
