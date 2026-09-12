-- ============================================================
-- 32. DUA TIPE TUGAS: SEKALI JALAN DAN BERULANG
--
-- Kerangka lama keliru. Ia menyebut sebagian pekerjaan "peran yang
-- tidak pernah selesai" — padahal sekretaris akreditasi dan anggota
-- pokja punya tanggal survei, dan pada tanggal itu keduanya memang
-- selesai. Yang benar-benar tidak punya garis selesai cuma yang
-- berulang: update jadwal dokter, tiap Senin sampai Jumat dan
-- Minggu.
--
-- Jadi pembedanya bukan "ada selesainya atau tidak", melainkan
-- "sekali jalan atau kembali lagi". Dan keduanya tetap boleh
-- ditandai selesai: pekerjaan rutin pun suatu saat berpindah tangan
-- atau berhenti, dan saat itu tiba harus ada cara menutupnya tanpa
-- menghapus jejaknya.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

-- Syaratnya dilepas dulu supaya nilai lamanya bisa diganti.
alter table tugas drop constraint if exists tugas_jenis_check;
alter table tugas drop constraint if exists tugas_berjalan_tanpa_tenggat;
alter table tugas drop constraint if exists tugas_hari_hanya_berjalan;

update tugas set jenis = 'Sekali Jalan' where jenis = 'Tugas';
update tugas set jenis = 'Berulang'     where jenis = 'Berjalan';

alter table tugas alter column jenis set default 'Sekali Jalan';

alter table tugas add constraint tugas_jenis_check
    check (jenis in ('Sekali Jalan', 'Berulang'));

-- Yang berulang tidak punya tenggat: tenggat pada sesuatu yang
-- kembali lagi tiap minggu cuma menyesatkan.
alter table tugas add constraint tugas_berulang_tanpa_tenggat
    check (jenis <> 'Berulang' or tenggat is null);

-- Hari kerja hanya bermakna bagi yang berulang. Yang sekali jalan
-- sudah punya tenggat.
alter table tugas add constraint tugas_hari_hanya_berulang
    check (hari is null or jenis = 'Berulang');


-- ------------------------------------------------------------
-- Memindahkan tiga baris yang sudah ada ke tempat yang benar.
--
-- Hanya yang masih memakai bentuk lama. Menjalankan berkas ini dua
-- kali tidak akan menimpa hari kerja yang sudah disesuaikan sendiri.
-- ------------------------------------------------------------
update tugas
   set hari = array[1,2,3,4,5,7]::smallint[]
 where jenis = 'Berulang'
   and hari is null
   and judul ilike '%jadwal dokter%';


-- ============================================================
-- CEK
-- ============================================================
select id, jenis, judul,
       coalesce(tenggat::text, '—') as tenggat,
       coalesce(hari::text, '—')    as hari,
       status
  from tugas
 order by jenis, id;
