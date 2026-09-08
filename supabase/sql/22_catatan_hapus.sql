-- ============================================================
-- 22. CATATAN PENGHAPUSAN DATA
--
-- Menghapus data kini bisa dilakukan dari aplikasi oleh Admin.
-- Karena itu penghapusannya harus meninggalkan jejak.
--
-- Alasannya sederhana: seluruh sistem ini dirancang supaya nomor
-- surat, komplain, dan penawaran tidak bisa dilenyapkan — yang
-- keliru ditandai batal, bukan dihapus. Membuka satu pintu untuk
-- menghapus berarti pintu itu harus punya buku tamu. Tanpa catatan,
-- tidak ada cara menjawab pertanyaan "kenapa buku nomor kosong".
--
-- Catatan ini TIDAK BISA DIHAPUS oleh siapa pun, termasuk Admin.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

create table if not exists log_hapus_data (
    id          bigserial primary key,
    jenis       text   not null,
    keterangan  text   not null,
    jumlah      integer not null default 0,
    oleh        bigint references pengguna(id),
    nama_oleh   text   not null,
    pada        timestamptz not null default now()
);

create index if not exists idx_log_hapus on log_hapus_data(pada desc);

alter table log_hapus_data enable row level security;

-- Hanya Admin yang membacanya; tidak ada yang boleh menulis lewat
-- jalur biasa. Pencatatannya dilakukan aplikasi dengan kunci penuh,
-- bersamaan dengan penghapusannya, supaya tidak bisa dilewati.
drop policy if exists log_hapus_baca on log_hapus_data;
create policy log_hapus_baca on log_hapus_data
    for select to authenticated using (peran_saya() = 'Admin');

-- Tanpa kebijakan hapus dan ubah: catatannya permanen.


-- ============================================================
-- CEK
-- ============================================================
select count(*) as catatan_penghapusan from log_hapus_data;
