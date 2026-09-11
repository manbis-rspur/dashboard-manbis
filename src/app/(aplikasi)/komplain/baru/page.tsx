import { wajibAkses } from "@/lib/akses";
import { sekarangIsianWaktu } from "@/lib/waktu";
import { FormKomplain } from "./form-komplain";

export default async function HalamanKomplainBaru() {
  const pengguna = await wajibAkses("komplain");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Catat Komplain</h1>
      <p className="mt-1 mb-8 text-tinta-2">
        Untuk keluhan yang masuk lewat telepon, WhatsApp, kotak saran, atau tatap
        muka. Tercatat atas nama {pengguna.nama.split(",")[0]}.
      </p>

      {/* Waktunya dihitung di peladen lalu diserahkan ke formulir.
          Kalau formulir menghitungnya sendiri, angka yang digambar
          peladen dan yang digambar peramban bisa berbeda semenit —
          dan React menganggapnya ketidakcocokan, lalu mengosongkan
          isiannya. */}
      <FormKomplain waktuSekarang={sekarangIsianWaktu()} />
    </div>
  );
}
