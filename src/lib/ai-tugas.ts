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
  /** Hari kerja tugas berulang: 1 = Senin ... 7 = Minggu. */
  hari: number[] | null;
  /** Tanggal dalam bulan, untuk yang berulang tiap bulan. */
  tanggal_bulan: number[] | null;
  /** Terisi bila ada yang perlu diperiksa sendiri oleh yang meminta. */
  catatan: string | null;
};

/** Senin sampai Jumat. */
const HARI_KERJA = [1, 2, 3, 4, 5];

/**
 * Merapikan hasil baca supaya tidak bertabrakan dengan aturan tabel.
 *
 * Tiga aturan yang gampang dilanggar AI maupun penafsiran sederhana:
 *
 *   1. Tugas berulang TIDAK BOLEH punya tenggat. Berulang berarti
 *      tidak ada hari ia berhenti, jadi tenggat justru menyesatkan.
 *   2. Irama hanya boleh ada pada yang berulang.
 *   3. Tugas berulang TANPA irama tidak pernah muncul di pengingat
 *      mana pun — tersimpan, tapi diam selamanya. Itu kegagalan
 *      yang paling sulit disadari, jadi kalau iramanya tidak
 *      terbaca, dipasang Senin–Jumat dan orangnya diberi tahu.
 */
export function rapikanTerbaca(t: TugasTerbaca): TugasTerbaca {
  if (t.jenis !== BERULANG) {
    return { ...t, hari: null, tanggal_bulan: null };
  }

  const hari = (t.hari ?? []).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  const tanggal = (t.tanggal_bulan ?? []).filter(
    (n) => Number.isInteger(n) && n >= 1 && n <= 31,
  );

  // Hari dan tanggal-bulan tidak boleh dipakai bersamaan; yang
  // disebut lebih khusus menang.
  if (tanggal.length > 0) {
    return {
      ...t,
      tenggat: null,
      hari: null,
      tanggal_bulan: [...new Set(tanggal)].sort((a, b) => a - b),
      catatan: t.catatan,
    };
  }

  if (hari.length > 0) {
    return {
      ...t,
      tenggat: null,
      hari: [...new Set(hari)].sort((a, b) => a - b),
      tanggal_bulan: null,
      catatan: t.catatan,
    };
  }

  return {
    ...t,
    tenggat: null,
    hari: HARI_KERJA,
    tanggal_bulan: null,
    catatan:
      t.catatan ??
      "Iramanya belum jelas, jadi saya pasang Senin-Jumat. Betulkan di web kalau bukan itu.",
  };
}

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

  // Tanda bahwa ini pekerjaan berulang, bukan sekali jalan.
  const berulang =
    /\b(setiap|tiap|rutin|harian|mingguan|bulanan|saban)\b/.test(kecil);

  const hari: number[] = [];
  if (berulang) {
    // "setiap hari kerja" berbeda dari "setiap hari", dan "setiap
    // hari Senin" bukan berarti tiap hari — nama hari sesudahnya
    // yang menentukan.
    if (/\b(setiap|tiap|saban)\s+hari\s+kerja\b/.test(kecil)) hari.push(1, 2, 3, 4, 5);
    else if (
      /\b(setiap|tiap|saban)\s+hari\b(?!\s*,?\s*(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu))/.test(
        kecil,
      )
    ) {
      hari.push(1, 2, 3, 4, 5, 6, 7);
    } else {
      for (const [nama, nomor] of Object.entries(HARI_NAMA)) {
        if (new RegExp(`\\b${nama}\\b`).test(kecil) && !hari.includes(nomor)) {
          hari.push(nomor);
        }
      }
    }
  }

  const tanggalBulan: number[] = [];
  if (berulang) {
    for (const m of kecil.matchAll(/\btanggal\s+(\d{1,2})\b/g)) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 31) tanggalBulan.push(n);
    }
  }

  return rapikanTerbaca({
    judul,
    keterangan: bersih.length > 90 ? bersih : null,
    // Yang berulang tidak boleh bertenggat; dirapikan di bawah.
    tenggat: berulang ? null : tenggat,
    jenis: berulang ? BERULANG : SEKALI,
    prioritas: /\b(segera|mendesak|urgent|hari ini)\b/.test(kecil) ? "Tinggi" : "Sedang",
    hari: hari.length > 0 ? hari : null,
    tanggal_bulan: tanggalBulan.length > 0 ? tanggalBulan : null,
    catatan: "Dibaca seadanya - AI sedang tidak bisa dipanggil. Periksa tenggat dan iramanya.",
  });
}

const PETUNJUK = `Anda mengubah satu instruksi kerja jadi catatan tugas.

Jawab HANYA dengan JSON berbentuk:
{"judul":"...","keterangan":null,"tenggat":"YYYY-MM-DD atau null","jenis":"Sekali Jalan atau Berulang","prioritas":"Rendah, Sedang, atau Tinggi","hari":null,"tanggal_bulan":null}

Aturan:
- judul: kalimat perintah singkat dan jelas, maksimal 90 huruf, huruf besar di awal. Buang sapaan dan basa-basi.
- keterangan: keterangan tambahan yang penting dan tidak muat di judul. null bila tidak ada.
- jenis: "Berulang" bila dikerjakan berulang setiap hari, pekan, atau bulan. Selain itu "Sekali Jalan".
- tenggat: HANYA untuk "Sekali Jalan". Tanggal sungguhan, dihitung dari tanggal hari ini yang diberikan. "Jumat" berarti Jumat terdekat yang akan datang. Bila tidak ada petunjuk waktu, null. JANGAN mengarang tanggal. Untuk "Berulang", tenggat SELALU null.
- hari: HANYA untuk "Berulang" yang jatuh pada hari tertentu. Larik angka, 1 = Senin sampai 7 = Minggu. "Setiap hari" berarti [1,2,3,4,5,6,7]. "Tiap hari kerja" berarti [1,2,3,4,5]. "Tiap Senin dan Kamis" berarti [1,4]. Selain itu null.
- tanggal_bulan: HANYA untuk "Berulang" yang jatuh pada tanggal tertentu tiap bulan. Larik angka 1 sampai 31. "Tiap tanggal 5" berarti [5]. "Awal bulan" berarti [1]. "Akhir bulan" berarti [28]. Selain itu null.
- hari dan tanggal_bulan tidak boleh terisi dua-duanya.
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

      const angka = (nilai: unknown) =>
        Array.isArray(nilai) ? nilai.map(Number).filter(Number.isInteger) : null;

      return rapikanTerbaca({
        judul: judul.slice(0, 120),
        keterangan: baca.keterangan ? String(baca.keterangan).slice(0, 500) : null,
        // Tenggat yang jatuh sebelum hari ini hampir selalu salah
        // tafsir, bukan permintaan sungguhan.
        tenggat: tenggat && tenggat >= kini ? tenggat : null,
        jenis: baca.jenis === BERULANG ? BERULANG : SEKALI,
        prioritas: ["Rendah", "Sedang", "Tinggi"].includes(String(baca.prioritas))
          ? String(baca.prioritas)
          : "Sedang",
        hari: angka(baca.hari),
        tanggal_bulan: angka(baca.tanggal_bulan),
        catatan: null,
      });
    } catch {
      // Coba model berikutnya.
    }
  }

  return bacaSeadanya(teks, kini);
}
