import { wajibAkses } from "@/lib/akses";
import { sekarangIsianWaktu } from "@/lib/waktu";
import { FormKomplain } from "./form-komplain";

/**
 * Perapian bahasa dengan AI berjalan sebagai server action dari
 * halaman ini, dan Gemini kerap butuh belasan detik -- apalagi
 * bila model utama sedang penuh dan harus diulang. Batas bawaan
 * Vercel memutusnya di tengah jalan, dan petugas cuma melihat
 * tombol yang menggantung tanpa sebab.
 */
export const maxDuration = 60;

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
