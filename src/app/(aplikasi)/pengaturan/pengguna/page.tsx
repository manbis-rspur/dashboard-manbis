import { wajibAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DaftarPengguna, type BarisPengguna } from "./daftar-pengguna";

export default async function HalamanPengguna() {
  await wajibAdmin();

  const supabase = await createClient();
  const { data } = await supabase
    .from("pengguna")
    .select("id, nama, jabatan, email, peran, aktif, auth_user_id")
    .order("id");

  const { data: akses } = await supabase
    .from("akses_modul")
    .select("pengguna_id, modul")
    .eq("modul", "komplain");

  const berizin = new Set((akses ?? []).map((a) => a.pengguna_id));

  const daftar: BarisPengguna[] = (data ?? []).map((p) => ({
    id: p.id,
    nama: p.nama,
    jabatan: p.jabatan,
    email: p.email,
    peran: p.peran,
    aktif: p.aktif,
    punyaAkun: p.auth_user_id !== null,
    bolehKomplain: berizin.has(p.id),
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
      <p className="mt-1 mb-7 text-tinta-2">
        Anggota unit manajemen bisnis dan akun loginnya. Kata sandi awal yang
        Anda ketikkan di sini sebaiknya diganti sendiri oleh yang bersangkutan
        setelah berhasil masuk.
      </p>

      <DaftarPengguna daftar={daftar} />
    </div>
  );
}
