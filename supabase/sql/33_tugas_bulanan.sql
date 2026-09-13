-- ============================================================
-- 33. TUGAS BERULANG BERIRAMA BULANAN
--
-- Sampai sekarang tugas berulang hanya bisa diatur per hari dalam
-- minggu. Padahal sebagian pekerjaan iramanya bulanan: laporan
-- media sosial ditunggu tanggal 5, setoran akreditasi pada tanggal
-- tertentu, rekap bulanan menjelang akhir bulan. Dipaksa jadi
-- mingguan, ia akan menagih empat kali lebih sering daripada
-- seharusnya — dan yang terlalu sering menagih cepat diabaikan.
--
-- Satu tugas berulang memakai salah satu irama saja, tidak
-- dua-duanya. Gabungan keduanya terdengar fleksibel di rancangan,
-- tapi begitu dipakai tidak ada yang bisa menjawab "sebenarnya ini
-- muncul kapan" tanpa membuka kodenya.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table tugas
    add column if not exists tanggal_bulan smallint[];

-- Daftar tanggalnya ditulis apa adanya, bukan dibangkitkan dengan
-- generate_series: Postgres menolak subquery di dalam check, dan
-- penolakannya baru muncul saat berkas ini dijalankan.
alter table tugas drop constraint if exists tugas_tanggal_bulan_wajar;
alter table tugas add constraint tugas_tanggal_bulan_wajar
    check (
        tanggal_bulan is null
        or (array_length(tanggal_bulan, 1) between 1 and 31
            and tanggal_bulan <@ array[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]::smallint[])
    );

-- Irama hanya bermakna bagi yang berulang.
alter table tugas drop constraint if exists tugas_tanggal_hanya_berulang;
alter table tugas add constraint tugas_tanggal_hanya_berulang
    check (tanggal_bulan is null or jenis = 'Berulang');

-- Salah satu saja, tidak dua-duanya.
alter table tugas drop constraint if exists tugas_satu_irama;
alter table tugas add constraint tugas_satu_irama
    check (hari is null or tanggal_bulan is null);

create index if not exists idx_tugas_tanggal_bulan on tugas(untuk)
    where tanggal_bulan is not null and status not in ('Selesai','Batal');


-- ============================================================
-- CEK
-- ============================================================
select id, jenis, judul,
       coalesce(hari::text, '—')          as hari_minggu,
       coalesce(tanggal_bulan::text, '—') as tanggal_bulan,
       status
  from tugas
 where jenis = 'Berulang'
 order by id;
