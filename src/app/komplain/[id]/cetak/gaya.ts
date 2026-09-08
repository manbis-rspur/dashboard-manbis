/**
 * Tampilan formulir cetak.
 *
 * Ditulis terpisah dari Tailwind karena halaman ini punya aturan
 * sendiri: ukuran kertas A4, garis tabel yang tegas, dan warna
 * grading yang harus tetap tercetak. Warna aplikasi sengaja tidak
 * dipakai di sini — formulir resmi harus selalu terlihat sama,
 * berapa pun warna yang sedang dipilih di menu Tampilan.
 */
export const gayaCetak = `
  @page { size: A4 portrait; margin: 8mm; }

  body { background: #e5e5e5; margin: 0; }

  .lembar {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 10mm 9mm;
    background: #fff;
    color: #000;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8.5pt;
    line-height: 1.25;
    box-sizing: border-box;
  }

  .kop-gambar {
    display: block; width: 100%; height: auto;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  .kop { display: flex; align-items: flex-start; justify-content: space-between; gap: 10mm; }
  .kop-logo { height: 20mm; width: auto; max-width: 70mm; object-fit: contain; }
  .kop-alamat { margin: 0; text-align: right; font-size: 7pt; line-height: 1.45; white-space: pre-line; }

  .judul { margin: 6mm 0 3mm; text-align: center; font-size: 9.5pt; font-weight: bold; }

  .formulir { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .formulir th, .formulir td { border: 0.7pt solid #000; padding: 1.6mm 2mm; vertical-align: top; }
  .formulir th { background: #d9d9d9; text-align: center; font-size: 8.5pt; font-weight: bold; }
  .formulir col, .formulir td, .formulir th { word-wrap: break-word; }

  .sel-isian { height: 16mm; }
  .sel-tengah { text-align: center; vertical-align: middle; }

  .isian { display: flex; gap: 1mm; align-items: baseline; }
  .isian-label { width: 22mm; flex: none; }
  .isian-titik { width: 2mm; flex: none; }
  .isian-nilai { flex: 1; min-height: 3.6mm; }

  .baris-pilihan {
    display: flex; flex-wrap: wrap; gap: 2mm 5mm;
    justify-content: center; align-items: baseline; margin: 1.4mm 0;
  }
  .pilihan { display: inline-flex; align-items: baseline; gap: 1.4mm; text-align: left; }
  .kotak {
    display: inline-block; width: 2.8mm; height: 2.8mm; flex: none;
    border: 0.7pt solid #000; background: #fff; position: relative; top: 0.3mm;
  }
  .kotak.terisi { background: #000; box-shadow: inset 0 0 0 0.6mm #fff; }
  .garis-isi { flex: 1; min-width: 22mm; border-bottom: 0.7pt dotted #000; text-align: left; }

  .sel-uraian { height: 42mm; white-space: pre-wrap; }
  .sel-ttd { width: 46mm; padding: 0; }
  .ttd { padding: 3mm 2mm; text-align: center; }
  .ttd + .ttd { border-top: 0.7pt solid #000; }
  .ttd p { margin: 0; }
  .ttd-nama { margin-top: 8mm !important; }
  .ttd-ket { font-size: 7pt; }

  /* Warna grading wajib ikut tercetak, bukan hanya tampil di layar. */
  .grading td { vertical-align: middle; height: 20mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .grading .hijau  { background: #7ab648; }
  .grading .kuning { background: #ffe600; }
  .grading .merah  { background: #ff0000; }

  .catatan { text-align: center; font-size: 7.5pt; }
  .sel-eskalasi { height: 26mm; }
  .sel-eskalasi.tengah { text-align: center; }
  .sub-judul { margin: 0 0 1.5mm; font-weight: bold; }
  .baris-komite { margin-bottom: 0.8mm; }

  .jejak { margin-top: 3mm; font-size: 7pt; color: #444; text-align: right; }

  .bilah-layar {
    position: fixed; top: 10px; right: 10px; z-index: 10;
    display: flex; gap: 8px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .bilah-layar button {
    border: 1px solid #999; background: #fff; color: #111;
    border-radius: 4px; padding: 8px 14px; font-size: 13px; cursor: pointer;
  }
  .bilah-layar button:hover { background: #f0f0f0; }

  @media print {
    body { background: #fff; }
    .lembar { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
    .bilah-layar { display: none; }
  }
`;
