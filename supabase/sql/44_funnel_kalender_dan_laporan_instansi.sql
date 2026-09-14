-- ============================================================
-- 44. KALENDER BERTAHAP TOFU-MOFU-BOFU, DAN LAPORAN UNTUK
--     INSTANSI LAIN
--
-- Dua hal.
--
-- (A) Laporan bulanan sudah lama membedah konten menurut tahap
--     corong, karena tiap konten memang dicatat tahapnya. Tapi
--     kalender yang MERENCANAKAN konten itu tidak mengenal tahap
--     sama sekali. Akibatnya yang direncanakan hampir selalu
--     konten edukasi — TOFU semua — lalu laporan bulan berikutnya
--     menyimpulkan BOFU-nya kurang, dan kekurangan yang sama
--     terulang bulan demi bulan karena tidak ada yang
--     merencanakannya sejak awal.
--
-- (B) Laporan bulanan mengunci nama RSPUR di dalam perintahnya.
--     Modul lain sudah bisa dipakai untuk rumah sakit atau klinik
--     lain; laporan bulanan belum.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (A1) Kolom tahap corong pada tabel kalender.
-- ------------------------------------------------------------
update modul_ai
   set instruksi_sistem = replace(
         instruksi_sistem,
         '| Minggu / Tanggal | Pilar Konten | Topik & Judul Konten | Format & Kanal | Konsep / Angle Copywriting | Dokter / Narasumber | PIC & Tim Produksi | Target Capaian |',
         '| Minggu / Tanggal | Tahap | Pilar Konten | Topik & Judul Konten | Format & Kanal | Konsep / Angle Copywriting | Dokter / Narasumber | PIC & Tim Produksi | Target Capaian |'
       )
 where judul ilike '%kalender konten%'
   and instruksi_sistem like '%| Dokter / Narasumber | PIC & Tim Produksi |%';


-- ------------------------------------------------------------
-- (A2) Apa arti tiap tahap bagi sebuah rumah sakit.
--
-- Ditulis terang supaya tidak ditafsir menurut kebiasaan
-- perdagangan biasa. Rumah sakit bukan toko: BOFU-nya bukan
-- "beli sekarang", melainkan menolong orang yang sudah
-- memutuskan berobat supaya tidak tersesat di langkah terakhir.
-- ------------------------------------------------------------
update modul_ai
   set pola_perintah = pola_perintah
        || E'\n\nSETIAP BARIS KALENDER HARUS DIBERI TAHAP CORONG pada kolom "Tahap", '
        || E'diisi TOFU, MOFU, atau BOFU. Artinya bagi rumah sakit:\n\n'
        || E'- TOFU (menarik perhatian). Untuk orang yang belum merasa perlu ke rumah '
        || E'sakit. Edukasi kesehatan umum, mitos yang keliru, kebiasaan sehari-hari, '
        || E'hari besar kesehatan. Belum menjual apa pun, belum menyebut layanan. '
        || E'Ukurannya jangkauan dan tayangan.\n'
        || E'- MOFU (menimbang). Untuk orang yang sudah merasakan keluhan dan sedang '
        || E'mencari tahu. Kenali gejala, kapan harus diperiksa, bagaimana alur '
        || E'pemeriksaannya, perkenalan poliklinik dan dokternya, cerita pemulihan, '
        || E'tanya jawab. Ukurannya simpanan, bagikan, dan komentar bertanya.\n'
        || E'- BOFU (memutuskan dan datang). Untuk orang yang sudah memutuskan berobat '
        || E'dan tinggal butuh kemudahan. Jadwal praktik dokter, cara membuat janji '
        || E'temu, alur pendaftaran BPJS dan syarat rujukan, jam buka IGD, nomor yang '
        || E'bisa dihubungi, lokasi dan parkir, promo paket Medical Check Up. '
        || E'Ukurannya klik tautan, pesan masuk, dan janji temu.\n\n'
        || E'Sebarannya dijaga: kira-kira separuh TOFU, sepertiga MOFU, sisanya BOFU. '
        || E'Jangan menumpuk semuanya di TOFU — itu kesalahan yang paling sering '
        || E'terjadi, dan akibatnya kalender terlihat ramai tapi tidak ada yang '
        || E'sampai datang. Jangan pula menumpuk BOFU, karena akun berubah jadi papan '
        || E'iklan dan orang berhenti mengikuti.\n\n'
        || E'Tutup dokumen dengan tabel ringkas sebaran tahap: berapa konten tiap '
        || E'tahap, berapa persen, dan satu kalimat alasan kenapa sebarannya begitu '
        || E'untuk rentang ini. Bila evaluasi bulan sebelumnya menyebutkan satu tahap '
        || E'kurang, perbanyak tahap itu dan sebutkan bahwa itu jawaban atas evaluasinya.'
 where judul ilike '%kalender konten%'
   and pola_perintah not like '%TAHAP CORONG%';


-- ------------------------------------------------------------
-- (B) Laporan bulanan boleh untuk instansi lain.
--
-- 'instansi' sengaja tidak boleh kosong dan berisi 'RSPUR' secara
-- bawaan: syarat satu laporan per bulan harus ikut membedakan
-- instansinya, dan nilai kosong membuat syarat itu tidak berlaku
-- sama sekali — dua laporan RSPUR pada bulan yang sama akan lolos
-- tanpa ada yang mencegah.
-- ------------------------------------------------------------
alter table laporan_sosmed
    add column if not exists untuk_rspur boolean not null default true,
    add column if not exists instansi    text    not null default 'RSPUR';

alter table laporan_sosmed drop constraint if exists laporan_sekali_sebulan;
alter table laporan_sosmed add constraint laporan_sekali_sebulan
    unique (bulan, tahun, instansi);

alter table laporan_sosmed drop constraint if exists laporan_instansi_ada;
alter table laporan_sosmed add constraint laporan_instansi_ada
    check (btrim(instansi) <> '');


-- ============================================================
-- CEK
-- ============================================================
select judul,
       instruksi_sistem like '%| Tahap |%' as tabel_punya_kolom_tahap,
       pola_perintah    like '%TAHAP CORONG%' as perintah_menjelaskan
  from modul_ai
 where judul ilike '%kalender konten%';
