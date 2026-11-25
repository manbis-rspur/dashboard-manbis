import "server-only";

/**
 * Lapis kedua perapian bahasa: AI, tapi diminta.
 *
 * Lapis pertama (bahasa-baku.ts) hanya berani pada yang mekanis.
 * Lapis ini berani pada kalimat — tetapi hanya kalau petugas
 * menekan tombolnya, dan hasilnya harus dilihat berdampingan
 * sebelum dipakai.
 *
 * Yang dirapikan di sini adalah LAPORAN ORANG. Nama, jam, nomor
 * kamar, nama obat, dan nada keluhannya adalah bukti. Ada dua
 * penjaga supaya itu tidak hilang: petunjuk yang melarangnya, dan
 * pemeriksaan di bawah yang menolak hasil AI kalau angkanya hilang
 * atau teksnya mendadak menyusut. Petunjuk bisa dilanggar model;
 * pemeriksaan tidak.
 */

const MODEL = ["gemini-flash-latest", "gemini-flash-lite-latest"];
const ALAMAT = "https://generativelanguage.googleapis.com/v1beta/models";

const PETUNJUK = `Anda menyunting bahasa laporan komplain rumah sakit ke bahasa Indonesia baku sesuai EYD.

Yang BOLEH Anda perbaiki:
- Ejaan dan kata tidak baku: "ga" jadi "tidak", "udah" jadi "sudah", "gimana" jadi "bagaimana", "kasih" jadi "memberi".
- Singkatan: "yg" jadi "yang", "dgn" jadi "dengan", "tdk" jadi "tidak".
- Tanda baca, huruf besar di awal kalimat dan pada nama diri.
- Kalimat berantakan dirapikan susunannya supaya mudah dibaca.
- Imbuhan yang hilang: "dia bentak saya" jadi "dia membentak saya".

Yang DILARANG KERAS:
- Mengubah, menambah, atau menghilangkan fakta apa pun.
- Mengubah angka, jam, tanggal, nomor kamar, nomor rekam medis, nama orang, nama unit, atau nama obat. Salin persis.
- Memperhalus atau memperkeras keluhan. Kalau pelapor menulis "perawatnya galak dan membentak", hasilnya tetap "perawatnya galak dan membentak" - jangan jadi "perawatnya kurang ramah".
- Meringkas, memendekkan, atau membuang kalimat. Semua yang disampaikan harus tetap ada.
- Menambah pembuka, penutup, simpulan, saran, atau permintaan maaf.
- Mengubah sudut pandang. Kalau ditulis "saya", tetap "saya".

Yang sering terlewat, perbaiki juga:
- Klitik "-nya" yang ditulis terpisah: "suster nya" jadi "susternya", "tagihan nya" jadi "tagihannya", "kata nya" jadi "katanya".
- Imbuhan percakapan: "jelasin" jadi "menjelaskan", "bilangin" jadi "memberi tahu", "nanyain" jadi "menanyakan", "benerin" jadi "memperbaiki", "ngasih" jadi "memberikan".
- Awalan "di-" yang ditulis terpisah pada kata kerja: "di bilang" jadi "dikatakan", "di info kan" jadi "diinformasikan", "di suruh" jadi "disuruh".
- Kata depan "di" yang ditulis menempel pada tempat: "dikamar" jadi "di kamar", "dipoli" jadi "di poli".

Contoh.
Masukan: pasien nunggu 3 jam dipoli anak, perawat nya ga mau jelasin knp lama, pas di tanya malah di suruh sabar
Keluaran: Pasien menunggu 3 jam di poli anak, perawatnya tidak mau menjelaskan mengapa lama, saat ditanya malah disuruh sabar.

Jawab HANYA dengan teks hasil suntingan. Tanpa tanda kutip, tanpa penjelasan, tanpa kata pengantar.`;

/**
 * Angka yang merupakan FAKTA di dalam teks.
 *
 * Angka yang menempel langsung di belakang huruf bukan bilangan,
 * melainkan singkatan pengulangan khas tulisan sehari-hari -
 * "apa2", "anak2", "jalan2". Membakukannya jadi "apa-apa" memang
 * menghilangkan angkanya, dan itu benar. Yang tidak boleh hilang
 * adalah "2 jam", "kamar 302", "7,5 juta".
 *
 * Koma dan titik pemisah disamakan dulu, karena mengubah "7.5"
 * jadi "7,5" justru pembakuan yang diminta.
 */
function angka(teks: string): string[] {
  const cocok = teks.match(/(?<![A-Za-z])\d+(?:[.,]\d+)*/g) ?? [];
  return cocok.map((n) => n.replace(/,/g, ".")).sort();
}

export type Curiga = "angka-hilang" | "menyusut" | "memanjang" | null;

/**
 * Memeriksa hasil AI sebelum ditawarkan ke petugas.
 *
 * Tiga kegagalan yang pernah terjadi pada model mana pun dan
 * paling mahal di sini: angka ikut "dirapikan", laporan panjang
 * dipadatkan jadi ringkasan, dan model malah mengarang tambahan.
 * Ketiganya terbaca dari bentuk, tanpa perlu membaca isinya.
 */
export function curiga(asli: string, hasil: string): Curiga {
  const a = angka(asli);
  const b = angka(hasil);
  if (a.length !== b.length || a.some((n, i) => n !== b[i])) return "angka-hilang";

  const panjangAsli = asli.trim().length;
  if (panjangAsli === 0) return null;
  const nisbah = hasil.trim().length / panjangAsli;

  // Bahasa baku hampir selalu lebih panjang daripada bahasa
  // sehari-hari - singkatan dibentangkan. Menyusut berarti ada
  // yang dibuang.
  if (nisbah < 0.75) return "menyusut";
  if (nisbah > 1.8) return "memanjang";
  return null;
}

export type HasilRapi =
  | { ok: true; teks: string }
  | { ok: false; sebab: string };

export async function rapikanDenganAI(teks: string): Promise<HasilRapi> {
  const isi = teks.trim();
  if (isi === "") return { ok: false, sebab: "Belum ada yang bisa dirapikan." };
  if (isi.length > 6000) {
    return { ok: false, sebab: "Teksnya terlalu panjang untuk dirapikan sekaligus." };
  }

  const kunci = process.env.GEMINI_API_KEY;
  if (!kunci) {
    return { ok: false, sebab: "Kunci AI belum dipasang di peladen." };
  }

  const badan = JSON.stringify({
    contents: [{ parts: [{ text: isi }] }],
    systemInstruction: { parts: [{ text: PETUNJUK }] },
    generationConfig: { temperature: 0, maxOutputTokens: 4096 },
  });

  let sebabTerakhir = "AI sedang tidak bisa dihubungi.";

  // Model utama dicoba dua kali. 503 dari Gemini berarti "sedang
  // ramai", bukan "tidak bisa" -- dan kalau ia menyerah terlalu
  // cepat, yang menjawab adalah model ringan yang hasilnya jelas
  // lebih kasar: ia membetulkan "apa2" tapi membiarkan "suster
  // nya" dan "jelasin". Satu jeda sedetik lebih murah daripada
  // suntingan setengah jadi.
  const urutan = [MODEL[0], ...MODEL];

  for (let ke = 0; ke < urutan.length; ke++) {
    const model = urutan[ke];
    if (ke === 1) await new Promise((r) => setTimeout(r, 1200));
    try {
      const jawaban = await fetch(`${ALAMAT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": kunci },
        body: badan,
        signal: AbortSignal.timeout(14_000),
      });

      if (!jawaban.ok) {
        sebabTerakhir = `AI menolak permintaan (${jawaban.status}).`;
        continue;
      }

      const data = (await jawaban.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const hasil = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();

      if (hasil === "") {
        sebabTerakhir = "AI mengembalikan jawaban kosong.";
        continue;
      }

      const cacat = curiga(isi, hasil);
      if (cacat === "angka-hilang") {
        sebabTerakhir =
          "Hasilnya saya tolak: ada angka yang berubah. Teks Anda tidak diubah.";
        continue;
      }
      if (cacat === "menyusut") {
        sebabTerakhir =
          "Hasilnya saya tolak: AI malah meringkas laporan. Teks Anda tidak diubah.";
        continue;
      }
      if (cacat === "memanjang") {
        sebabTerakhir =
          "Hasilnya saya tolak: AI menambah kalimat yang tidak ada. Teks Anda tidak diubah.";
        continue;
      }

      if (hasil === isi) {
        // Belum tentu memang sudah baku -- model ringan kerap
        // mengembalikan teks apa adanya. Dicoba model berikutnya
        // dulu sebelum menyimpulkan tidak ada yang perlu diubah.
        sebabTerakhir = "Bahasanya sudah baku. Tidak ada yang perlu diubah.";
        continue;
      }

      return { ok: true, teks: hasil };
    } catch {
      sebabTerakhir = "AI tidak menjawab tepat waktu.";
    }
  }

  return { ok: false, sebab: sebabTerakhir };
}
