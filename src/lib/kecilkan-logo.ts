/**
 * Memperkecil logo tanpa mengubah bentuknya.
 *
 * Berbeda dari foto profil yang dipotong persegi: logo harus utuh,
 * termasuk kalau bentuknya memanjang. Hasilnya disimpan sebagai PNG
 * supaya latar tembus pandang tidak berubah jadi kotak putih.
 */

const SISI_MAKS = 512;

export async function kecilkanLogo(berkas: File): Promise<File> {
  if (!berkas.type.startsWith("image/")) {
    throw new Error("Berkasnya harus berupa gambar.");
  }

  const gambar = await createImageBitmap(berkas, { imageOrientation: "from-image" });

  const skala = Math.min(1, SISI_MAKS / Math.max(gambar.width, gambar.height));
  const lebar = Math.round(gambar.width * skala);
  const tinggi = Math.round(gambar.height * skala);

  const kanvas = document.createElement("canvas");
  kanvas.width = lebar;
  kanvas.height = tinggi;

  const kuas = kanvas.getContext("2d");
  if (!kuas) throw new Error("Peramban ini tidak bisa mengolah gambar.");

  kuas.imageSmoothingQuality = "high";
  kuas.drawImage(gambar, 0, 0, lebar, tinggi);
  gambar.close();

  const gumpal = await new Promise<Blob | null>((selesai) =>
    kanvas.toBlob(selesai, "image/png"),
  );

  if (!gumpal) throw new Error("Gagal mengolah gambarnya.");

  return new File([gumpal], "logo.png", { type: "image/png" });
}
