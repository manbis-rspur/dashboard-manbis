import "server-only";

/**
 * Memanggil Gemini untuk menyusun dokumen.
 *
 * Kunci API hanya ada di server dan tidak pernah sampai ke
 * peramban. Pemeriksaan siapa yang berhak memakai dilakukan oleh
 * pemanggil — di aplikasi lama, alamat serupa terbuka untuk umum,
 * sehingga siapa pun yang menemukannya bisa menghabiskan kuota
 * Gemini rumah sakit.
 */

/** Dicoba berurutan; yang pertama berhasil dipakai. */
const MODEL = ["gemini-flash-latest", "gemini-2.5-flash"];

const ALAMAT = "https://generativelanguage.googleapis.com/v1beta/models";

export async function susunDenganAI(
  perintah: string,
  instruksiSistem: string,
  suhu = 0.7,
): Promise<string> {
  const kunci = process.env.GEMINI_API_KEY;

  if (!kunci) {
    throw new Error(
      "Kunci Gemini belum dipasang. Isi GEMINI_API_KEY di .env.local, lalu jalankan ulang aplikasinya.",
    );
  }

  let galatTerakhir = "";

  for (const model of MODEL) {
    try {
      const jawaban = await fetch(`${ALAMAT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": kunci },
        body: JSON.stringify({
          contents: [{ parts: [{ text: perintah }] }],
          systemInstruction: { parts: [{ text: instruksiSistem }] },
          generationConfig: { temperature: suhu },
        }),
      });

      if (!jawaban.ok) {
        const isi = await jawaban.text();
        galatTerakhir = terjemahkanGalat(jawaban.status, isi);
        continue;
      }

      const data = await jawaban.json();
      const teks: string =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";

      if (teks.trim()) return teks;

      // Jawaban kosong biasanya berarti permintaannya tertahan
      // penyaring keamanan Gemini, bukan gangguan jaringan.
      galatTerakhir =
        "Gemini tidak mengembalikan tulisan apa pun. Isian mungkin tertahan penyaring keamanannya — coba susun ulang kalimatnya.";
    } catch (galat) {
      galatTerakhir = galat instanceof Error ? galat.message : String(galat);
    }
  }

  throw new Error(galatTerakhir || "Gagal menghubungi Gemini.");
}

/** Menerjemahkan galat Gemini jadi kalimat yang bisa ditindaklanjuti. */
function terjemahkanGalat(status: number, isi: string) {
  if (status === 401 || status === 403 || isi.includes("API_KEY_INVALID")) {
    return (
      "Kunci Gemini ditolak. Pastikan kuncinya masih berlaku dan layanan " +
      "Generative Language API sudah diaktifkan untuk kunci itu."
    );
  }

  if (status === 429 || isi.includes("RESOURCE_EXHAUSTED")) {
    return "Kuota Gemini sedang penuh. Tunggu beberapa saat lalu coba lagi.";
  }

  if (status >= 500) {
    return "Layanan Gemini sedang bermasalah. Coba lagi beberapa saat lagi.";
  }

  return `Gemini menolak permintaan (kode ${status}).`;
}
