import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Memanggil Claude untuk menyusun dokumen.
 *
 * Kunci API hanya ada di server dan tidak pernah sampai ke
 * peramban. Pemeriksaan siapa yang berhak memakai dilakukan oleh
 * pemanggil — di aplikasi asal, alamat serupa terbuka untuk umum,
 * sehingga siapa pun yang menemukannya bisa menghabiskan kuota
 * rumah sakit.
 */

const MODEL = "claude-opus-5";

/**
 * Dokumen yang diminta modul ini bisa panjang — kalender konten
 * setahun penuh berisi puluhan baris tabel. Karena itu jawabannya
 * dialirkan sedikit demi sedikit; permintaan sepanjang itu kalau
 * ditunggu sekaligus akan kehabisan waktu di tengah jalan.
 */
const MAKS_KELUARAN = 32000;

export async function susunDenganAI(
  perintah: string,
  instruksiSistem: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Kunci Claude belum dipasang. Isi ANTHROPIC_API_KEY di .env.local, lalu jalankan ulang aplikasinya.",
    );
  }

  const claude = new Anthropic();

  try {
    const aliran = claude.beta.messages.stream({
      model: MODEL,
      max_tokens: MAKS_KELUARAN,
      system: instruksiSistem,
      messages: [{ role: "user", content: perintah }],
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      // Kalau permintaan ditolak penyaring keselamatan, permintaan
      // yang sama diulang pada model cadangan dalam satu panggilan
      // — supaya petugas tidak berhadapan dengan layar gagal untuk
      // sesuatu yang sebenarnya masih bisa dikerjakan.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    const jawaban = await aliran.finalMessage();

    if (jawaban.stop_reason === "refusal") {
      throw new Error(
        "Permintaan ini ditolak penyaring keselamatan Claude. Coba susun ulang kalimatnya, " +
          "atau kurangi keterangan yang menyebut identitas orang.",
      );
    }

    const teks = jawaban.content
      .filter((bagian) => bagian.type === "text")
      .map((bagian) => bagian.text)
      .join("");

    if (!teks.trim()) {
      throw new Error("Claude tidak mengembalikan tulisan apa pun. Coba jalankan lagi.");
    }

    return teks;
  } catch (galat) {
    throw new Error(terjemahkanGalat(galat));
  }
}

/**
 * Menerjemahkan galat jadi kalimat yang bisa ditindaklanjuti
 * petugas — bukan pesan mentah berbahasa Inggris.
 */
function terjemahkanGalat(galat: unknown): string {
  if (galat instanceof Anthropic.AuthenticationError) {
    return "Kunci Claude ditolak. Periksa ANTHROPIC_API_KEY di .env.local.";
  }

  if (galat instanceof Anthropic.PermissionDeniedError) {
    return "Kunci Claude tidak berhak memakai model ini. Periksa pengaturan kuncinya di Console.";
  }

  if (galat instanceof Anthropic.RateLimitError) {
    return "Permintaan sedang terlalu padat. Tunggu sebentar lalu coba lagi.";
  }

  if (galat instanceof Anthropic.BadRequestError) {
    return `Permintaan ditolak: ${galat.message}`;
  }

  if (galat instanceof Anthropic.APIConnectionError) {
    return "Tidak bisa menghubungi Claude. Periksa sambungan internet komputer ini.";
  }

  if (galat instanceof Anthropic.APIError) {
    return `Claude mengembalikan galat ${galat.status ?? ""}: ${galat.message}`.trim();
  }

  return galat instanceof Error ? galat.message : "Gagal menghubungi Claude.";
}
