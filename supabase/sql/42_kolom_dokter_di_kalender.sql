-- ============================================================
-- 42. KALENDER KONTEN PUNYA KOLOM DOKTER
--
-- Daftar dokter sudah disisipkan ke perintah AI sejak berkas 39,
-- lengkap dengan aturan memakainya. Tapi namanya tetap tidak
-- muncul — dan sebabnya bukan pada daftarnya.
--
-- Susunan tabel kalender tidak punya kolom untuk dokter. AI diberi
-- bahan, tapi tidak diberi tempat menaruhnya, jadi bahan itu
-- dilewati begitu saja. Memberi data tanpa memberi tempat sama
-- saja dengan tidak memberi apa-apa.
--
-- Sesudah ini tabelnya punya kolom "Dokter / Narasumber", dan
-- perintahnya menyebut terang kapan kolom itu diisi dan kapan
-- dibiarkan bertanda hubung.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Kolom baru pada susunan tabelnya.
--
-- Ditaruh sebelum PIC: yang membaca baris itu ingin tahu dulu
-- siapa yang tampil, baru siapa yang menggarap.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
         instruksi_sistem,
         '| Minggu / Tanggal | Pilar Konten | Topik & Judul Konten | Format & Kanal | Konsep / Angle Copywriting | PIC & Tim Produksi | Target Capaian |',
         '| Minggu / Tanggal | Pilar Konten | Topik & Judul Konten | Format & Kanal | Konsep / Angle Copywriting | Dokter / Narasumber | PIC & Tim Produksi | Target Capaian |'
       )
 where judul ilike '%kalender konten%'
   and instruksi_sistem like '%| Konsep / Angle Copywriting | PIC & Tim Produksi |%';


-- ------------------------------------------------------------
-- (2) Perintahnya menyebut cara mengisi kolom itu.
--
-- Termasuk kapan TIDAK diisi. Tanpa itu, AI akan memaksakan nama
-- dokter pada konten yang tidak ada hubungannya dengan poliklinik
-- mana pun — ucapan hari besar, misalnya.
-- ------------------------------------------------------------
update modul_ai
   set pola_perintah = pola_perintah
        || E'\n\nKolom "Dokter / Narasumber" diisi dari DAFTAR DOKTER yang dilampirkan '
        || E'bersama perintah ini, bukan dari ingatan. Aturannya:\n'
        || E'- Isi dengan nama dokter yang polikliniknya benar-benar nyambung dengan topik baris itu, '
        || E'ditulis persis seperti di daftar, lengkap gelarnya.\n'
        || E'- Konten yang tidak menyangkut satu poliklinik pun — ucapan hari besar, informasi jam '
        || E'layanan, lowongan, kegiatan internal — kolomnya diisi tanda hubung. Jangan dipaksakan.\n'
        || E'- Bila topiknya nyambung tapi tidak ada dokter yang cocok di daftar, tulis nama '
        || E'polikliniknya saja tanpa nama orang.\n'
        || E'- Bila daftar dokter tidak dilampirkan sama sekali, isi seluruh kolom itu dengan tanda '
        || E'hubung. JANGAN mengarang nama dokter dalam keadaan apa pun — nama dokter karangan di '
        || E'akun resmi rumah sakit adalah kesalahan yang jauh lebih berat daripada kolom kosong.\n'
        || E'- Sebarkan dokter yang tampil, jangan menaruh satu nama yang sama di hampir semua baris.'
 where judul ilike '%kalender konten%'
   and pola_perintah not like '%Dokter / Narasumber%';


-- ============================================================
-- CEK
-- ============================================================
select judul,
       instruksi_sistem like '%Dokter / Narasumber%' as tabel_punya_kolom_dokter,
       pola_perintah    like '%Dokter / Narasumber%' as perintah_menjelaskan,
       pakai_dokter,
       pakai_isu
  from modul_ai
 where judul ilike '%kalender konten%';
