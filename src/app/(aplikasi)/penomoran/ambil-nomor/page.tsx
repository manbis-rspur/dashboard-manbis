import { createClient } from "@/lib/supabase/server";
import { FormAmbil, type Jenis } from "./form-ambil";

export default async function HalamanAmbilNomor() {
  const supabase = await createClient();

  const { data: jenis } = await supabase
    .from("jenis_dokumen")
    .select("id, nama")
    .eq("aktif", true)
    .order("urutan_tampil");

  // Ancar-ancar nomor berikutnya. Hanya membaca — hitungan tidak
  // ikut bertambah, jadi aman ditampilkan sebelum tombol ditekan.
  const daftar: Jenis[] = await Promise.all(
    (jenis ?? []).map(async (j) => {
      const { data } = await supabase.rpc("pratinjau_nomor", { p_jenis_id: j.id });
      return { id: j.id, nama: j.nama, berikutnya: typeof data === "string" ? data : null };
    }),
  );

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Ambil Nomor</h1>
      <p className="mt-1 mb-7 text-tinta-2">
        Nomor diberikan berurutan dan langsung tercatat atas nama Anda.
      </p>

      <FormAmbil daftarJenis={daftar} />
    </div>
  );
}
