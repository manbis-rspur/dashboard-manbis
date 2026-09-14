import "server-only";

/**
 * Membaca satu instruksi berbahasa manusia jadi tugas.
 *
 * Instruksi dari atasan datang apa adanya — "tolong ganti banner
 * hero website buat Hari Kesehatan, paling lambat Jumat". Yang
 * dibutuhkan sistem: judul yang rapi, tanggal, dan tipenya.
 *
 * Kalau AI-nya sedang penuh atau kuncinya belum dipasang, tugasnya
 * TETAP dibuat memakai penafsiran sederhana di bawah. Instruksi
 * tidak boleh hilang hanya karena mesin sedang sibuk — itu
 * kegagalan paling mahal di sini, karena orangnya sudah merasa
 * mencatat.
 */

import { BERULANG, SEKALI, geser, hariIni } from "@/lib/tugas";

const MODEL = ["gemini-flash-lite-latest", "gemini-flash-latest"];
const ALAMAT = "https://generativelanguage.googleapis.com/v1beta/models";

export type TugasTerbaca = {
  judul: string;
  keterangan: string | null;
  tenggat: string | null;
  jenis: string;
  prioritas: string;
  /** Terisi bila hasilnya ditebak sendiri, bukan dibaca AI. */
  catatan: string | null;
};

const HARI_NAMA: Record<string, number> = {
  senin: 1, selasa: 2, rabu: 3, kamis: 4,
  jumat: 5, "jum'at": 5, sabtu: 6, minggu: 7,
};

/** Penafsiran sederhana, dipakai bila AI tidak bisa dipanggil. */
export function bacaSeadanya(teks: string, kini = hariIni()): TugasTerbaca {
  const bersih = teks.replace(/\s+/g, " ").trim();
  const kecil = bersih.toLowerCase();

  let tenggat: string | null = null;

  if (/\bhari ini\b/.test(kecil)) tenggat = kini;
  else if (/\bbesok\b/.test(kecil)) tenggat = geser(kini, 1);
  else if (/\blusa\b/.test(kecil)) tenggat = geser(kini, 2);
  else {
    const cocok = /\b(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\b/.exec(kecil);
    if (cocok) {
      const tujuan = HARI_NAMA[cocok[1]];
      // Hari yang disebut selalu berarti yang akan datang, bukan
      // yang baru lewat.
      for (let maju = 1; maju <= 7; maju++) {
        const tanggal = geser(kini, maju);
        if (new Date(`${tanggal}T00:00:00Z`).getUTCDay() === (tujuan % 7)) {
          tenggat = tanggal;
          break;
        }
      }
    }
  }

  const judul = bersih.length > 90 ? `${bersih.slice(0, 89)}…` : bersih;

  return {
    judul,
    keterangan: bersih.length > 90 ? bersih : null,
    tenggat,
    jenis: SEKALI,
    prioritas: /\b(segera|mendesak|urgent|hari ini)\b/.test(kecil) ? "Tinggi" : "Sedang",
    catatan: "Dibaca seadanya — AI sedang tidak bisa dipanggil. Periksa tenggatnya.",
  };
}

const PETUNJUK = `Anda mengubah satu instruksi kerja jadi catatan tugas.

Jawab HANYA dengan JSON berbentuk:
{"judul":"...","keterangan":null,"tenggat":"YYYY-MM-DD atau null","jenis":"Sekali Jalan atau Berulang","prioritas":"Rendah, Sedang, atau Tinggi"}

Aturan:
- judul: kalimat perintah singkat dan jelas, maksimal 90 huruf, huruf besar di awal. Buang sapaan dan basa-basi.
- keterangan: keterangan tambahan yang penting dan tidak muat di judul. null bila tidak ada.
- tenggat: tanggal sungguhan. Hitung dari tanggal hari ini yang diberikan. "Jumat" berarti Jumat terdekat yang akan datang. Bila tidak ada petunjuk waktu sama sekali, null. JANGAN mengarang tanggal.
- jenis: "Berulang" hanya bila jelas dikerjakan berulang setiap hari, pekan, atau bulan. Selain itu "Sekali Jalan".
- prioritas: "Tinggi" bila diminta segera atau tenggatnya hari ini atau besok.
- Bahasa Indonesia. Jangan menambah apa pun di luar JSON.`;

export async function bacaTugasDariTeks(
  teks: string,
  kini = hariIni(),
): Promise<TugasTerbaca> {
  const kunci = process.env.GEMINI_API_KEY;
  if (!kunci) return bacaSeadanya(teks, kini);

  const badan = JSON.stringify({
    contents: [
      { parts: [{ text: `Tanggal hari ini: ${kini} (zona Asia/Jakarta).\n\nInstruksi:\n${teks}` }] },
    ],
    systemInstruction: { parts: [{ text: PETUNJUK }] },
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });

  for (const model of MODEL) {
    try {
      const jawaban = await fetch(`${ALAMAT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": kunci },
        body: badan,
      });

      if (!jawaban.ok) continue;

      const isi = (await jawaban.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const teksJawaban = (isi.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("");

      const baca = JSON.parse(teksJawaban) as Partial<TugasTerbaca>;
      const judul = String(baca.judul ?? "").trim();
      if (judul === "") continue;

      const tenggat =
        typeof baca.tenggat === "string" && /^\d{4}-\d{2}-\d{2}$/.test(baca.tenggat)
          ? baca.tenggat
          : null;

      return {
        judul: judul.slice(0, 120),
        keterangan: baca.keterangan ? String(baca.keterangan).slice(0, 500) : null,
        // Tenggat yang jatuh sebelum hari ini hampir selalu salah
        // tafsir, bukan permintaan sungguhan.
        tenggat: tenggat && tenggat >= kini ? tenggat : null,
        jenis: baca.jenis === BERULANG ? BERULANG : SEKALI,
        prioritas: ["Rendah", "Sedang", "Tinggi"].includes(String(baca.prioritas))
          ? String(baca.prioritas)
          : "Sedang",
        catatan: null,
      };
    } catch {
      // Coba model berikutnya.
    }
  }

  return bacaSeadanya(teks, kini);
}
