import { createClient } from "@/lib/supabase/server";

type Baris = {
  id: number;
  nomor_lengkap: string;
  tanggal_surat: string;
  diambil_pada: string;
  perihal: string;
  ditujukan_kepada: string | null;
  status: string;
  jenis_dokumen: { nama: string } | { nama: string }[] | null;
  pengguna: { nama: string } | { nama: string }[] | null;
};

function satu<T>(nilai: T | T[] | null): T | null {
  if (nilai === null) return null;
  return Array.isArray(nilai) ? (nilai[0] ?? null) : nilai;
}

const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function HalamanBukuNomor() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("nomor")
    .select(
      "id, nomor_lengkap, tanggal_surat, diambil_pada, perihal, ditujukan_kepada, status, jenis_dokumen(nama), pengguna(nama)",
    )
    // Diurutkan menurut waktu pengambilan, bukan menurut nomornya.
    //
    // Surat Keluar dan PKRS punya deret nomornya masing-masing, jadi
    // mengurutkan menurut angka urutan membuat keduanya berselang-
    // seling: PKRS terbaru bisa terkubur puluhan baris di bawah,
    // sejajar dengan Surat Keluar yang angkanya kebetulan sama
    // padahal diambil berbulan-bulan sebelumnya.
    //
    // Nomor pindahan dari buku lama memakai tanggal suratnya sebagai
    // waktu pengambilan, jadi urutannya tetap masuk akal walaupun
    // aslinya tidak pernah lewat aplikasi ini. Untuk yang tanggalnya
    // sama, id yang menentukan — yang tercatat belakangan di atas.
    .order("diambil_pada", { ascending: false })
    .order("id", { ascending: false })
    .limit(300);

  const baris = (data ?? []) as unknown as Baris[];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Buku Nomor</h1>
      <p className="mt-1 mb-7 text-tinta-2">
        Seluruh nomor yang pernah diambil unit manbis, yang terbaru di atas.
      </p>

      {baris.length === 0 ? (
        <div className="rounded-lg border border-garis bg-permukaan px-5 py-10 text-center">
          <p className="font-medium">Belum ada nomor yang diambil.</p>
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
                <th className="border-b border-garis px-4 py-2.5">Jenis</th>
                <th className="border-b border-garis px-4 py-2.5">Tanggal surat</th>
                <th className="border-b border-garis px-4 py-2.5">Perihal</th>
                <th className="border-b border-garis px-4 py-2.5">Pengambil</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => {
                const batal = b.status === "Batal";
                return (
                  <tr key={b.id} className={batal ? "text-tinta-3" : ""}>
                    <td className="border-b border-garis px-4 py-2.5 font-mono whitespace-nowrap">
                      <span className={batal ? "line-through" : ""}>{b.nomor_lengkap}</span>
                      {batal && (
                        <span className="ml-2 rounded-lg bg-permukaan-2 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide not-italic">
                          Batal
                        </span>
                      )}
                    </td>
                    <td className="border-b border-garis px-4 py-2.5 whitespace-nowrap">
                      {satu(b.jenis_dokumen)?.nama ?? "—"}
                    </td>
                    <td className="border-b border-garis px-4 py-2.5 whitespace-nowrap">
                      {tanggalPanjang.format(new Date(b.tanggal_surat))}
                      {/* Waktu pengambilan hanya disebut kalau memang
                          berbeda dari tanggal suratnya — kalau tidak,
                          barisnya cuma jadi ramai tanpa menambah apa
                          pun, dan justru itu yang menjelaskan urutan
                          daftar ini. */}
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
