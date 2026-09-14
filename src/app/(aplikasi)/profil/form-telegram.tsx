"use client";

import { useActionState, useState, useTransition } from "react";
import Ikon from "@/components/ikon";
import { kirimUjiTelegram, simpanTelegram } from "@/lib/profil-actions";

const awal = { ok: false, pesan: "" };

const gaya =
  "rounded-lg border border-garis bg-permukaan px-3 py-2 text-sm outline-none focus:border-hijau focus:ring-2 focus:ring-hijau-muda";

/**
 * Menyambungkan Telegram untuk pengingat tugas tiap pagi.
 *
 * Nomor percakapannya diketik sendiri, bukan diambil otomatis.
 * Telegram melarang bot memulai percakapan lebih dulu — jadi
 * bagaimanapun caranya, orangnya tetap harus menekan Start sekali.
 * Menempel satu angka setelah itu lebih jujur daripada alur
 * "otomatis" yang tetap menuntut langkah yang sama.
 */
export function FormTelegram({ chatIdAwal }: { chatIdAwal: string | null }) {
  const [hasil, kirim, sedang] = useActionState(simpanTelegram, awal);
  const [uji, setUji] = useState<{ ok: boolean; pesan: string } | null>(null);
  const [menguji, mulai] = useTransition();

  const tersambung = Boolean(chatIdAwal);

  return (
    <div className="flex flex-col gap-3">
      <form action={kirim} className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            name="telegram_chat_id"
            defaultValue={chatIdAwal ?? ""}
            inputMode="numeric"
            placeholder="Nomor percakapan Telegram — misalnya 123456789"
            className={`${gaya} min-w-64 flex-1`}
          />
          <button
            type="submit"
            disabled={sedang}
            className="rounded-lg bg-hijau px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {sedang ? "Menyimpan…" : tersambung ? "Ganti" : "Sambungkan"}
          </button>

          {tersambung && (
            <button
              type="button"
              disabled={menguji}
              onClick={() =>
                mulai(async () => {
                  setUji(null);
                  setUji(await kirimUjiTelegram());
                })
              }
              className="flex items-center gap-1.5 rounded-lg border border-garis px-4 py-2 text-sm font-medium text-tinta-2 hover:bg-permukaan-2 disabled:opacity-60"
            >
              <Ikon nama="surat" ukuran={15} />
              {menguji ? "Mengirim…" : "Kirim percobaan"}
            </button>
          )}
        </div>

        {hasil.pesan && (
          <p className={`text-sm ${hasil.ok ? "text-hijau" : "text-merah"}`}>
            {hasil.pesan}
          </p>
        )}
        {uji && (
          <p className={`text-sm ${uji.ok ? "text-hijau" : "text-merah"}`}>
            {uji.pesan}
          </p>
        )}
      </form>

      <ol className="flex flex-col gap-1 text-xs text-tinta-3">
        <li>1. Buka Telegram, cari bot RSPUR, tekan <b>Start</b>.</li>
        <li>
          2. Cari <b>@userinfobot</b>, tekan Start — ia membalas dengan nomor
          percakapan Anda.
        </li>
        <li>3. Tempel angkanya di kotak atas, lalu simpan.</li>
        <li>
          4. Tekan <b>Kirim percobaan</b> untuk memastikan pesannya benar-benar
          sampai.
        </li>
      </ol>

      <p className="text-xs text-tinta-3">
        Pengingat dikirim tiap pagi pukul 08.00 WIB: yang lewat tenggat, yang
        jatuh hari ini, yang belum dikerjakan, yang sedang dikerjakan, dan yang
        selesai kemarin. Kosongkan kotaknya lalu simpan untuk berhenti menerima.
      </p>
    </div>
  );
}
