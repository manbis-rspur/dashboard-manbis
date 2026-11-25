/**
 * Merapikan tulisan tanpa mengubah maknanya.
 *
 * Dipakai pada kotak Detail komplain, yang isinya PERKATAAN
 * PELAPOR — dicetak di formulir resmi, ditandatangani pelapor dan
 * penerima laporan, dan bisa naik ke komite etik.
 *
 * Karena itu yang dikerjakan di sini sengaja dibatasi pada hal
 * yang pasti aman: membentangkan singkatan yang artinya tunggal,
 * dan merapikan spasi serta tanda baca. Tidak ada kalimat yang
 * disusun ulang, tidak ada kata yang diganti sinonimnya, tidak ada
 * nada yang diperhalus.
 *
 * Perbedaannya penting. "Suster galak, bentak ibu saya" yang
 * diperhalus jadi "perawat kurang ramah dalam berkomunikasi" bukan
 * perapian — itu memperingan tuduhan, dan yang membacanya setahun
 * lagi tidak akan tahu mana kata pelapor. Pekerjaan semacam itu
 * ada tempatnya sendiri: tombol yang ditekan sengaja, dengan
 * pratinjau, dan teks aslinya disimpan.
 */

/**
 * Singkatan yang artinya tunggal.
 *
 * Yang bermakna ganda sengaja TIDAK dimasukkan, dan itu bukan
 * kelalaian:
 *   - "dr"  bisa "dari" atau gelar dokter
 *   - "pd"  bisa "pada" atau "Pendidikan"
 *   - "mnt" bisa "menit" atau "minta"
 *   - "rs"  bisa "rumah sakit" atau inisial
 * Membentangkannya berarti menebak, dan menebak di dalam berkas
 * resmi lebih buruk daripada membiarkan singkatannya.
 */
const SINGKATAN: Record<string, string> = {
  yg: "yang",
  tdk: "tidak",
  gak: "tidak",
  ga: "tidak",
  nggak: "tidak",
  ngga: "tidak",
  dgn: "dengan",
  sdh: "sudah",
  udh: "sudah",
  udah: "sudah",
  blm: "belum",
  krn: "karena",
  karna: "karena",
  utk: "untuk",
  dlm: "dalam",
  jd: "jadi",
  sy: "saya",
  hrs: "harus",
  dpt: "dapat",
  hny: "hanya",
  sgt: "sangat",
  byk: "banyak",
  bnyk: "banyak",
  skrg: "sekarang",
  jg: "juga",
  lg: "lagi",
  tlg: "tolong",
  org: "orang",
  kl: "kalau",
  klo: "kalau",
  kalo: "kalau",
  tp: "tetapi",
  tpi: "tetapi",
  tapi: "tetapi",
  gmn: "bagaimana",
  bgmn: "bagaimana",
  knp: "kenapa",
  bbrp: "beberapa",
  spt: "seperti",
  sprt: "seperti",
  trs: "terus",
  dtg: "datang",
  nunggu: "menunggu",
  nunggunya: "menunggunya",
};

/** Menyamakan bentuk huruf besar-kecil dengan kata aslinya. */
function ikutiBentuk(asli: string, ganti: string): string {
  if (asli === asli.toUpperCase() && asli.length > 1) return ganti.toUpperCase();
  if (asli[0] === asli[0].toUpperCase()) {
    return ganti[0].toUpperCase() + ganti.slice(1);
  }
  return ganti;
}

export type HasilRapi = { teks: string; jumlah: number };

export function rapikanMekanis(masukan: string): HasilRapi {
  if (!masukan) return { teks: "", jumlah: 0 };

  let jumlah = 0;
  let t = masukan;

  // 1. Singkatan. Dibatasi batas kata supaya "jg" di dalam
  //    "jagung" tidak ikut tersentuh.
  const pola = new RegExp(`\\b(${Object.keys(SINGKATAN).join("|")})\\b`, "gi");
  t = t.replace(pola, (cocok) => {
    const ganti = SINGKATAN[cocok.toLowerCase()];
    if (!ganti) return cocok;
    jumlah++;
    return ikutiBentuk(cocok, ganti);
  });

  // 2. Spasi sebelum tanda baca — "halo , apa kabar" jadi
  //    "halo, apa kabar".
  const sebelum = t;
  t = t.replace(/\s+([,.;:!?])/g, "$1");

  // 3. Tanda baca tanpa spasi sesudahnya. Angka dikecualikan,
  //    supaya "Rp15.000" dan "08.30" tidak ikut dipecah.
  t = t.replace(/([,;:])(?=\S)/g, "$1 ");
  t = t.replace(/([.!?])(?=[A-Za-z])/g, "$1 ");

  // 4. Tanda baca berulang: "bagus!!!" jadi "bagus!".
  t = t.replace(/([.!?,])\1{1,}/g, "$1");

  // 5. Spasi ganda dan spasi di ujung baris.
  t = t.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/gm, "");

  // 6. Baris kosong beruntun dipadatkan jadi satu.
  t = t.replace(/\n{3,}/g, "\n\n");

  if (t !== sebelum) jumlah++;

  // 7. Huruf besar di awal kalimat dan awal baris — kecuali gelar
  //    yang memang ditulis huruf kecil.
  //
  //    Dalam penulisan Indonesia "dr." (dokter) dan "Dr." (doktor,
  //    gelar S3) adalah dua hal yang berbeda, begitu pula "drg."
  //    dan "apt.". Dibesarkan hanya karena kebetulan berada di awal
  //    kalimat, gelar orang jadi berubah — dan di berkas yang
  //    menyebut nama dokter, itu bukan kesalahan kecil.
  const GELAR_KECIL = /^(dr|drg|drh|apt|a\.n|u\.b)\b/i;

  t = t.replace(
    /(^|[.!?]\s+|\n\s*)([a-z][a-z.]*)/g,
    (cocok: string, depan: string, kata: string) =>
      GELAR_KECIL.test(kata) ? cocok : depan + kata[0].toUpperCase() + kata.slice(1),
  );

  t = t.trim();
  return { teks: t, jumlah: t === masukan.trim() ? 0 : Math.max(jumlah, 1) };
}
