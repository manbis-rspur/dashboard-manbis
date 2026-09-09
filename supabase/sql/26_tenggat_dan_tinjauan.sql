-- ============================================================
-- 26. TENGGAT DAN TINDAK LANJUT KOORDINATOR
--
-- Sampai sekarang dokumen yang diunggah Humas dan Digital Marketing
-- masuk ke arsip lalu berhenti di situ. Koordinator membacanya, tapi
-- tidak ada tempat untuk menuliskan hasil bacaannya — sehingga yang
-- mengunggah tidak pernah tahu dokumennya sudah dipakai, masih
-- ditunggu, atau perlu diperbaiki. Pertanyaan itu akhirnya diurus
-- lewat pesan pribadi, dan hilang.
--
-- Dua tambahan:
--
--   tenggat        — kapan dokumen ini ditunggu selesai. Diisi yang
--                    mengunggah, boleh diubah Koordinator.
--
--   status_tinjauan — putusan Koordinator sesudah membaca:
--                     Menunggu, Perlu revisi, atau Disetujui.
--                     Beserta catatannya, siapa yang memutuskan,
--                     dan kapan.
--
-- Sengaja hanya tiga status. Daftar status yang panjang terlihat
-- rapi di rancangan, lalu dalam praktiknya semua orang memakai dua
-- yang pertama saja.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table publikasi
    add column if not exists tenggat         date,
    add column if not exists status_tinjauan text not null default 'Menunggu',
    add column if not exists catatan_tinjauan text,
    add column if not exists ditinjau_oleh   bigint references pengguna(id),
    add column if not exists ditinjau_pada   timestamptz;

alter table publikasi drop constraint if exists publikasi_status_tinjauan_check;
alter table publikasi add constraint publikasi_status_tinjauan_check
    check (status_tinjauan in ('Menunggu', 'Perlu revisi', 'Disetujui'));

-- Dokumen yang sudah lewat tenggat dan belum disetujui akan sering
-- dicari; indeksnya kecil dan menghemat pemindaian.
create index if not exists idx_publikasi_tenggat
    on publikasi(tenggat)
 where status_tinjauan <> 'Disetujui';


-- ------------------------------------------------------------
-- Tenggat laporan media sosial.
--
-- Laporan bulanan punya iramanya sendiri — biasanya ditunggu pada
-- awal bulan berikutnya — jadi tenggatnya menempel pada laporannya,
-- bukan menunggu sampai dokumennya diunggah ke arsip.
-- ------------------------------------------------------------
alter table laporan_sosmed
    add column if not exists tenggat date;

-- Laporan yang sudah ada diberi tenggat bawaan: tanggal 5 bulan
-- berikutnya. Hanya yang belum punya, supaya menjalankan berkas ini
-- dua kali tidak menimpa tanggal yang sudah disepakati.
update laporan_sosmed
   set tenggat = (make_date(tahun, bulan, 1) + interval '1 month' + interval '4 days')::date
 where tenggat is null;


-- ============================================================
-- CEK
-- ============================================================
select id, judul,
       coalesce(to_char(tenggat, 'DD Mon YYYY'), 'tanpa tenggat') as tenggat,
       status_tinjauan,
       coalesce(catatan_tinjauan, '—') as catatan
  from publikasi order by id;
