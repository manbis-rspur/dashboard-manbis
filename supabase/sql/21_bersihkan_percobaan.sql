-- ============================================================
-- 21. MEMBERSIHKAN DATA PERCOBAAN
--
-- Dijalankan SEKALI sebelum sistem dipakai sungguhan, supaya nomor
-- surat pertama yang sungguhan bernomor 001 — bukan melanjutkan
-- deret dari uji coba.
--
-- YANG DIHAPUS: seluruh data yang lahir dari percobaan —
--   buku nomor surat beserta hitungannya
--   komplain pasien beserta riwayat dan hitungan nomornya
--   penawaran MCU
--   dokumen arsip beserta revisi dan berkasnya
--   riwayat dokumen AI
--   pesan obrolan
--
-- YANG DIPERTAHANKAN: seluruh data acuan —
--   akun pengguna dan izinnya
--   daftar tarif pemeriksaan MCU
--   keenam modul AI beserta susunan perintahnya
--   jenis dokumen dan pengaturan penomoran
--   logo, warna, kop, dan template formulir komplain
--
-- PERINGATAN: tidak bisa dibatalkan. Bacalah daftar di atas sekali
-- lagi sebelum menekan Run.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- ============================================================

begin;

-- Berkas arsip dibuang lebih dulu, selagi catatan jalurnya masih
-- ada. Kalau barisnya dihapus duluan, jalur berkasnya ikut hilang
-- dan berkasnya tertinggal selamanya di penyimpanan.
delete from storage.objects
 where bucket_id = 'dokumen'
   and name like 'publikasi/%';

delete from publikasi_revisi where id > 0;
delete from publikasi        where id > 0;

delete from riwayat_ai       where id > 0;

delete from komplain_riwayat where id > 0;
delete from komplain         where id > 0;
delete from nomor_urut_komplain where tanggal is not null;

delete from mcu_penawaran    where id > 0;

delete from nomor            where id > 0;
delete from nomor_urut       where tahun is not null;

delete from obrolan          where id > 0;

commit;


-- ============================================================
-- CEK — semuanya harus 0, kecuali baris acuan di bagian bawah.
-- ============================================================
select 'buku nomor'        as data, count(*)::text as sisa from nomor
union all select 'hitungan nomor',   count(*)::text from nomor_urut
union all select 'komplain',         count(*)::text from komplain
union all select 'penawaran MCU',    count(*)::text from mcu_penawaran
union all select 'dokumen arsip',    count(*)::text from publikasi
union all select 'riwayat AI',       count(*)::text from riwayat_ai
union all select '— acuan —',        '—'
union all select 'akun pengguna',    count(*)::text from pengguna
union all select 'tarif MCU',        count(*)::text from mcu_item
union all select 'modul AI',         count(*)::text from modul_ai;
