/**
 * Menyiapkan foto profil: dipotong jadi persegi dari bagian tengah,
 * lalu diperkecil.
 *
 * Foto profil selalu ditampilkan dalam lingkaran. Kalau tidak
 * dipotong persegi lebih dulu, wajah orang akan gepeng atau
 * terpotong sembarangan oleh peramban.
 *
 * Hasilnya sekitar 30–60 KB, jadi yang melintas jaringan puluhan
 * kilobita — bukan foto HP empat megabita.
 */

const SISI = 400;
const MUTU = 0.85;

export async function potongPersegi(berkas: File): Promise<File> {
  if (!berkas.type.startsWith("image/")) {
    throw new Error("Berkasnya harus berupa gambar.");
  }

  // imageOrientation menjaga foto potret dari HP tidak terputar,
  // karena arah putarnya hilang saat digambar ulang ke kanvas.
  const gambar = await createImageBitmap(berkas, { imageOrientation: "from-image" });

  const sisiAsli = Math.min(gambar.width, gambar.height);
  const kiri = (gambar.width - sisiAsli) / 2;
  const atas = (gambar.height - sisiAsli) / 2;

  const kanvas = document.createElement("canvas");
  kanvas.width = SISI;
  kanvas.height = SISI;

  const kuas = kanvas.getContext("2d");
  if (!kuas) throw new Error("Peramban ini tidak bisa mengolah gambar.");

  kuas.imageSmoothingQuality = "high";
  kuas.drawImage(gambar, kiri, atas, sisiAsli, sisiAsli, 0, 0, SISI, SISI);
  gambar.close();

  const gumpal = await new Promise<Blob | null>((selesai) =>
    kanvas.toBlob(selesai, "image/jpeg", MUTU),
  );

  if (!gumpal) throw new Error("Gagal mengolah gambarnya.");

  return new File([gumpal], "profil.jpg", { type: "image/jpeg" });
}
