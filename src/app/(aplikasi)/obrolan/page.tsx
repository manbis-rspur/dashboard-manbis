import { wajibLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RuangObrolan, type Anggota, type Pesan } from "./ruang-obrolan";

export default async function HalamanObrolan() {
  const saya = await wajibLogin();
  const supabase = await createClient();

  // Dibatasi 200 pesan terakhir supaya halaman tidak berat.
  const { data: pesan } = await supabase
    .from("obrolan")
    .select("id, pengguna_id, pesan, dihapus, dibuat_pada")
    .order("dibuat_pada", { ascending: false })
    .limit(200);

  const { data: anggota } = await supabase
    .from("pengguna")
    .select("id, nama, jabatan, foto_url")
    .order("id");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Obrolan Unit</h1>
        <p className="mt-1 text-tinta-2">
          Satu ruang untuk seluruh anggota manajemen bisnis. Pesan baru muncul
          sendiri tanpa perlu memuat ulang halaman.
        </p>
      </div>

      <RuangObrolan
        awal={((pesan ?? []) as Pesan[]).slice().reverse()}
        anggota={(anggota ?? []) as Anggota[]}
        sayaId={saya.id}
      />
    </div>
  );
}
