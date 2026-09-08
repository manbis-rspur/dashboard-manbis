import { wajibAdmin } from "@/lib/auth";
import { bacaIdentitas } from "@/lib/identitas";
import { FormIdentitas } from "./form-identitas";

export default async function HalamanIdentitas() {
  await wajibAdmin();
  const identitas = await bacaIdentitas();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Identitas Aplikasi</h1>
      <p className="mt-1 mb-8 text-tinta-2">
        Logo dan warna yang dipakai di seluruh halaman, termasuk halaman masuk.
      </p>

      <FormIdentitas
        logoAwal={identitas.logoUrl}
        warnaAwal={identitas.warnaUtama}
        alamatAwal={identitas.alamatKop}
        kopAwal={identitas.kopUrl}
      />
    </div>
  );
}
