import { wajibAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { daftarKumpulan } from "@/lib/hapus-data-actions";
import { KotakHapus } from "./kotak-hapus";

const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Tabel yang dihitung untuk memperlihatkan berapa banyak akan hilang. */
const HITUNG: Record<string, string> = {
  nomor: "nomor",
  komplain: "komplain",
  mcu: "mcu_penawaran",
  publikasi: "publikasi",
  obrolan: "obrolan",
};

export default async function HalamanHapusData() {
  await wajibAdmin();

  const db = createAdminClient();
  const kumpulan = await daftarKumpulan();

  const jumlah: Record<string, number> = {};
  for (const k of kumpulan) {
    const { count } = await db
      .from(HITUNG[k.kunci])
      .select("*", { count: "exact", head: true });
    jumlah[k.kunci] = count ?? 0;
  }

  const { data: catatan } = await db
    .from("log_hapus_data")
    .select("id, keterangan, jumlah, nama_oleh, pada")
    .order("pada", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Hapus Data</h1>
      <p className="mt-1 text-tinta-2">
        Mengosongkan satu kumpulan data. Dipakai saat menyiapkan sistem — bukan
        saat sudah berjalan.
      </p>

      <div className="mt-6 rounded border-l-2 border-merah bg-permukaan-2 px-4 py-3">
        <p className="text-sm font-medium">Tidak bisa dibatalkan.</p>
        <p className="mt-1 text-sm text-tinta-2">
          Di luar halaman ini, tidak ada satu pun cara menghapus nomor surat,
          komplain, atau penawaran — bahkan bagi Admin. Aturannya memang
          begitu: yang keliru ditandai batal, tidak dilenyapkan. Halaman ini
          satu-satunya pengecualian, dan setiap pemakaiannya dicatat.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {kumpulan.map((k) => (
          <KotakHapus
            key={k.kunci}
            kunci={k.kunci}
            nama={k.nama}
            penegasan={k.penegasan}
            keterangan={k.keterangan}
            jumlah={jumlah[k.kunci] ?? 0}
          />
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Catatan penghapusan
        </h2>
        {(catatan ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-tinta-3">Belum pernah ada penghapusan.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {(catatan ?? []).map((c) => (
              <li key={c.id} className="border-l-2 border-garis pl-3">
                <p className="text-sm">
                  {c.keterangan} — {c.jumlah} baris
                </p>
                <p className="text-xs text-tinta-3">
                  {waktu.format(new Date(c.pada))} · {c.nama_oleh}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-tinta-3">
          Catatan ini permanen — tidak bisa dihapus oleh siapa pun, termasuk
          Admin.
        </p>
      </section>
    </div>
  );
}
