-- ============================================================
-- 52. NAMA TAHAP DRAF YANG JUJUR
--
-- Draf Bersama dulu berujung pada pengiriman ke Arsip Publikasi
-- Dashboard Manajemen Bisnis. Tahapnya diberi nama menurut itu:
-- "Siap kirim", lalu "Terkirim".
--
-- Pengiriman itu sudah dihapus. Tapi namanya tertinggal, dan nama
-- yang tertinggal itu berbohong: ia menjanjikan ada sesuatu yang
-- dikirim ke suatu tempat, padahal tidak ada. Orang baru yang
-- membacanya akan mencari ke mana perginya, dan tidak akan ketemu.
--
-- Nama tahap bukan hiasan. Ia satu-satunya keterangan yang dibaca
-- dua orang untuk tahu giliran siapa sekarang.
--
--   Digarap        -> masih dikerjakan sendiri
--   Minta ditinjau -> menunggu pendapat rekan
--   Disepakati     -> berdua sudah setuju, siap diproduksi
--   Selesai        -> sudah diproduksi atau terbit
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Syaratnya dilonggarkan dulu.
--
-- Kalau baris diubah lebih dulu, syarat lama menolaknya di tengah
-- jalan dan sebagian data terlanjur berubah sebagian tidak.
-- ------------------------------------------------------------
alter table draf drop constraint if exists draf_status_check;


-- ------------------------------------------------------------
-- (2) Baris yang sudah ada dipindahkan namanya.
-- ------------------------------------------------------------
update draf set status = 'Disepakati' where status = 'Siap kirim';
update draf set status = 'Selesai'    where status = 'Terkirim';


-- ------------------------------------------------------------
-- (3) Syarat baru dipasang.
-- ------------------------------------------------------------
alter table draf add constraint draf_status_check
    check (status in ('Digarap', 'Minta ditinjau', 'Disepakati', 'Selesai'));


-- ------------------------------------------------------------
-- (4) Fungsi pengiriman ke arsip dibuang.
--
-- Tidak dipanggil siapa pun lagi sejak tombolnya dihapus. Fungsi
-- yang menganggur tapi masih bisa dipanggil adalah jalan masuk
-- yang tidak dijaga siapa-siapa — dan yang lupa dibuang hari ini
-- akan dikira masih dipakai tahun depan.
-- ------------------------------------------------------------
drop function if exists kirim_draf_ke_arsip(bigint);


-- ------------------------------------------------------------
-- (5) Kolom bekas pengiriman dibiarkan.
--
-- publikasi_id dan dikirim_pada sengaja TIDAK dihapus: keduanya
-- menyimpan jejak draf yang dulu memang pernah dikirim ke arsip,
-- dan jejak itu masih benar. Yang dihapus jalannya, bukan
-- catatannya.
-- ------------------------------------------------------------


-- ============================================================
-- CEK
-- ============================================================
select status, count(*) from draf group by status order by status;
