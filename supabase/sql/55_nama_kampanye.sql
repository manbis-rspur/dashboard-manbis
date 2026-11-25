-- ============================================================
-- 55. DOKUMEN DINAMAI KAMPANYENYA, BUKAN CERITANYA
--
-- Permintaannya: ketika kita menceritakan kampanye yang ingin
-- dibuat, hasilnya diberi NAMA KAMPANYE yang sesuai isi cerita —
-- jangan ceritanya sendiri yang jadi judul, karena kepanjangan.
--
-- Sebabnya selama ini: judul riwayat diambil dari isian wajib
-- pertama pada formulir, lalu dipotong pada huruf ke-90. Isian
-- itu sekarang berupa cerita beberapa kalimat, jadi daftar
-- riwayat berisi potongan cerita yang terputus di tengah kata.
-- Dua kalender untuk kampanye yang sama sekali berbeda pun bisa
-- terlihat kembar, karena kebetulan sembilan puluh huruf
-- pertamanya sama.
--
-- Yang paling tahu inti sebuah cerita adalah yang baru saja
-- membacanya sampai habis. Maka namanya diminta ke AI, ditulis
-- pada satu baris bertanda di kepala dokumen, lalu dibaca sistem
-- dari sana.
--
-- Kenapa BUKAN judul setingkat satu ("# Nama Kampanye"):
-- tanda pagar setingkat satu sudah dipakai memisah konsep konten
-- dari kalendernya. Kalender yang diawali tanda itu akan dikira
-- sebuah konsep — unduhan "kalender saja" jadi kosong, dan
-- seluruh kalender terlipat di balik panel konsep. Jadi
-- penandanya baris biasa bercetak tebal.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Kalender Konten.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,
        'Awali dokumen dengan dua bagian ringkas: Strategi dan Sasaran Kampanye, lalu Target Capaian Utama.',

'Awali dokumen dengan SATU baris ini, persis bentuknya:

**Nama Kampanye:** [nama kampanyenya]

Aturan menamai:
- Namanya DISARIKAN dari inti cerita yang diberikan, bukan disalin dari ceritanya.
- Tiga sampai delapan kata. Cukup khas untuk membedakannya dari kampanye lain, dan enak diucapkan dalam rapat.
- Bukan kalimat, bukan ringkasan, dan tidak memuat tanggal atau nama bulan.
- JANGAN memakai tanda pagar (#) pada baris itu. Tanda pagar setingkat satu dipakai sistem untuk memisah konsep konten, dan kalender yang memakainya akan terpotong salah.

Contoh yang baik: Pikun Bukan Bagian Wajar Menua. Kenali Jantung Anak Sejak Dini. Tensi Terkendali, Hidup Lebih Panjang.

Contoh yang buruk: "Kalender Konten September 2026" — tidak menyebut isinya, dan semua kalender akan bernama begitu. "Membuat konten edukasi tentang Hari Alzheimer Sedunia yang jatuh pada 21 September beserta gejala yang perlu diwaspadai" — itu ceritanya, bukan namanya.

Sesudah baris itu, lanjutkan dengan dua bagian ringkas: Strategi dan Sasaran Kampanye, lalu Target Capaian Utama.')
 where judul = 'Kalender Konten'
   and instruksi_sistem not like '%Nama Kampanye:%';


-- ------------------------------------------------------------
-- (2) Perencana Event Kesehatan.
--
-- Masalahnya sama persis — lembar kerja panitia pun dinamai
-- ceritanya. Yang berbeda cuma sebutannya: acara punya nama
-- kegiatan, bukan nama kampanye.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
        instruksi_sistem,
        'Susun dengan urutan bagian berikut:',

'Awali dokumen dengan SATU baris ini, persis bentuknya:

**Judul Ringkas:** [nama kegiatannya]

Namanya disarikan dari inti permintaan, tiga sampai delapan kata, tanpa tanggal dan tanpa tanda pagar (#). Bukan kalimat, dan bukan salinan ceritanya.

Sesudah baris itu, susun dengan urutan bagian berikut:')
 where judul = 'Perencana Event Kesehatan'
   and instruksi_sistem not like '%Judul Ringkas:%';


-- ------------------------------------------------------------
-- (3) Memastikan hasilnya.
-- ------------------------------------------------------------
select judul,
       instruksi_sistem like '%Nama Kampanye:%'  as minta_nama_kampanye,
       instruksi_sistem like '%Judul Ringkas:%'  as minta_judul_ringkas
  from modul_ai
 where judul in ('Kalender Konten', 'Perencana Event Kesehatan')
 order by judul;
