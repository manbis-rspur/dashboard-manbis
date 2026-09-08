import { wajibLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormFoto } from "./form-foto";
import { FormSandi } from "./form-sandi";

export default async function HalamanProfil() {
  const pengguna = await wajibLogin();

  const supabase = await createClient();
  const { data } = await supabase
    .from("pengguna")
    .select("foto_url")
    .eq("id", pengguna.id)
    .maybeSingle();

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil Saya</h1>
        <p className="mt-1 text-tinta-2">
          {pengguna.nama} · {pengguna.jabatan}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Foto
        </h2>
        <FormFoto nama={pengguna.nama} foto={data?.foto_url ?? null} />
      </section>

      <section className="flex flex-col gap-4 border-t border-garis pt-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
            Kata sandi
          </h2>
          <p className="mt-1 text-sm text-tinta-2">
            Ganti kata sandi awal yang diberikan Koordinator dengan yang hanya
            Anda ketahui.
          </p>
        </div>
        <FormSandi />
      </section>

      <section className="flex flex-col gap-2 border-t border-garis pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Keterangan akun
        </h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-tinta-3">Email masuk</dt>
          <dd>{pengguna.email}</dd>
          <dt className="text-tinta-3">Peran</dt>
          <dd>{pengguna.peran}</dd>
        </dl>
        <p className="mt-2 text-xs text-tinta-3">
          Nama, jabatan, email, dan peran diatur oleh Koordinator.
        </p>
      </section>
    </div>
  );
}
