import { wajibAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormTemplate } from "./form-template";

const PENANDA = [
  ["Data pelapor", "NamaPelapor, AlamatPelapor, NoHpPelapor"],
  ["Data pasien", "NamaPasien, TglLahir, NoRM, AlamatPasien, NoHpPasien"],
  ["Kategori", "Kat_Medis, Kat_Keperawatan, Kat_Administrasi, Kat_Fasilitas, Kat_Pelayanan, Kat_Lainnya"],
  ["Sumber", "Sum_Pasien, Sum_Keluarga, Sum_Sejawat, Sum_Paramedis, Sum_Pengunjung"],
  ["Penerima", "NamaPenerima, UnitKerja, Jabatan"],
  ["Waktu", "TglLapor, JamLapor, TglTanggap, JamTanggap"],
  ["Isi", "Masalah, Jawaban"],
  ["Grading", "G_Hijau, G_Kuning, G_Merah"],
  ["Hasil", "Hasil_Teratasi, Hasil_Belum, Hasil_Komite"],
  ["Kepuasan", "Kepuasan_SangatPuas, Kepuasan_Puas, Kepuasan_TidakPuas"],
  ["Eskalasi", "Esk_Medik, Esk_Keperawatan, Esk_ProfesiLain, Esk_Etik, Esk_Hukum, Esk_Administrasi, TglKomite"],
  ["Lain-lain", "NoKomplain"],
] as const;

export default async function HalamanTemplate() {
  await wajibAdmin();

  // Dibaca dengan kunci penuh karena wadah 'dokumen' memang
  // tertutup — tidak ada izin baca terbuka untuk siapa pun.
  const db = createAdminClient();
  const { data } = await db.storage.from("dokumen").list("komplain");
  const template = (data ?? []).find((b) => b.name === "template.docx");

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Template Dokumen</h1>
      <p className="mt-1 mb-8 text-tinta-2">
        Formulir resmi yang dipakai saat mengunduh dokumen komplain.
      </p>

      <div className="mb-8 rounded border border-garis bg-permukaan p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Template terpasang
        </p>
        <p className="mt-2 font-medium">
          {template ? "Formulir komplain RSPUR" : "Belum ada template"}
        </p>
        {template?.updated_at && (
          <p className="text-sm text-tinta-3">
            Terakhir diperbarui{" "}
            {new Intl.DateTimeFormat("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(template.updated_at))}
          </p>
        )}
      </div>

      <div className="mb-8">
        <FormTemplate />
      </div>

      <section className="rounded border border-garis bg-permukaan-2 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Penanda yang dikenali
        </h2>
        <p className="mt-2 mb-4 text-sm text-tinta-2">
          Tulis penanda di dalam dokumen Word diapit tanda kurung sudut ganda,
          misalnya <span className="font-mono">&lt;&lt;NamaPasien&gt;&gt;</span>.
          Penanda yang tidak dikenali akan dikosongkan, jadi tidak sampai
          menggagalkan pembuatan dokumen. Penanda berawalan{" "}
          <span className="font-mono">Kat_</span>,{" "}
          <span className="font-mono">Sum_</span>,{" "}
          <span className="font-mono">G_</span>,{" "}
          <span className="font-mono">Hasil_</span>,{" "}
          <span className="font-mono">Kepuasan_</span>, dan{" "}
          <span className="font-mono">Esk_</span> menghasilkan kotak centang ☒
          atau ☐.
        </p>
        <dl className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-[7rem_1fr]">
          {PENANDA.map(([judul, isi]) => (
            <div key={judul} className="contents">
              <dt className="text-tinta-3">{judul}</dt>
              <dd className="font-mono text-xs break-words">{isi}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
