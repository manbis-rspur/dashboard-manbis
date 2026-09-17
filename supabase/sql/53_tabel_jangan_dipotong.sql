-- ============================================================
-- 53. LARANG MEMOTONG BARIS TABEL
--
-- Ditemukan dari berkas Word yang terasa berantakan. Sebabnya
-- bukan pada penyusun berkasnya, melainkan pada naskahnya: AI
-- menulis satu baris tabel terpotong jadi dua baris —
--
--   | **Selasa, 8 September** | MOFU | Edukasi | ...
--   Designer: Tim Grafis | Peningkatan saves dan shares ...
--
-- Baris kedua itu sambungan baris pertama, tapi tidak diawali
-- garis tegak. Pembaca tabel berhenti di situ, dan separuh
-- kalender hilang dari berkas yang diunduh.
--
-- Pembacanya sudah diperbaiki supaya menyambung sendiri baris
-- seperti itu. Tapi memperbaiki pembaca saja berarti terus
-- menambal; yang menulisnya juga harus berhenti melakukannya.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

update modul_ai
   set instruksi_sistem = instruksi_sistem
        || E'\n\nATURAN MENULIS TABEL — TIDAK BOLEH DILANGGAR:\n'
        || E'- Satu baris tabel ditulis dalam SATU baris utuh, dari garis tegak pertama '
        || E'sampai garis tegak terakhir. JANGAN memotongnya jadi dua baris.\n'
        || E'- Jangan menekan enter di dalam kotak tabel. Bila sebuah kotak memuat '
        || E'beberapa hal, pisahkan dengan titik koma.\n'
        || E'- Jumlah kotak tiap baris harus sama persis dengan jumlah kolom pada '
        || E'baris kepala. Kotak yang tidak ada isinya diisi tanda hubung.\n'
        || E'- Isi kotak ditulis pendek. Kotak yang butuh lebih dari dua puluh kata '
        || E'hampir selalu tanda kolomnya perlu dipecah, bukan kotaknya diperpanjang.'
 where judul in ('Kalender Konten', 'Konsep Konten')
   and instruksi_sistem not like '%ATURAN MENULIS TABEL%';


-- ============================================================
-- CEK
-- ============================================================
select judul,
       instruksi_sistem like '%ATURAN MENULIS TABEL%' as sudah_dilarang
  from modul_ai
 where judul in ('Kalender Konten', 'Konsep Konten');
