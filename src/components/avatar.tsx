/**
 * Lingkaran wajah pengguna.
 *
 * Bila belum ada fotonya, dipakai huruf awal namanya — bukan ikon
 * orang yang seragam untuk semua. Dua huruf sudah cukup membedakan
 * siapa yang menulis di ruang obrolan, dan warnanya tetap sama
 * untuk orang yang sama karena diambil dari namanya sendiri.
 */

const WARNA = [
  "bg-hijau-muda text-hijau",
  "bg-permukaan-2 text-tinta-2",
  "bg-[#f0e7d4] text-oker",
  "bg-[#dce4ec] text-[#2f4e6b]",
  "bg-[#f1dfe1] text-merah",
];

/** Membuang gelar supaya yang terbaca huruf awal namanya. */
function inisial(nama: string) {
  const kata = nama
    .replace(/\b(dr|drg|ns|apt|s\.?e|s\.?t|s\.?pd|a\.?md[\w.]*|s\.?farm|m\.?m)\b\.?/gi, " ")
    .split(/[\s,.]+/)
    .filter(Boolean);

  if (kata.length === 0) return "?";
  if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase();
  return (kata[0][0] + kata[1][0]).toUpperCase();
}

function warnaDari(nama: string) {
  let n = 0;
  for (const huruf of nama) n = (n + huruf.charCodeAt(0)) % 997;
  return WARNA[n % WARNA.length];
}

export default function Avatar({
  nama,
  foto,
  ukuran = 36,
}: {
  nama: string;
  foto?: string | null;
  /** Garis tengah lingkarannya dalam piksel. */
  ukuran?: number;
}) {
  const gaya = { width: ukuran, height: ukuran };

  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={nama}
        style={gaya}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      style={{ ...gaya, fontSize: ukuran * 0.36 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${warnaDari(nama)}`}
      aria-hidden="true"
    >
      {inisial(nama)}
    </span>
  );
}
