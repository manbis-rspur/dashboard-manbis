-- ============================================================
-- 15. ARSIP PUBLIKASI — HASIL YANG DIUNGGAH MANUAL
--
-- Modul penyusun dokumen Humas & Digital Marketing berpindah ke
-- dashboard tersendiri dengan alamat sendiri. Yang tinggal di sini
-- hanya HASILNYA: berkas yang sudah final diunggah manual, supaya
-- Koordinator bisa membacanya tanpa perlu membuka dashboard itu.
--
-- Karena itu dua hal dikerjakan sekaligus di berkas ini:
--
--   1. Izin Koordinator atas modul Humas dicabut. Riwayat dokumen
--      yang selama ini terlihat otomatis olehnya berhenti terlihat;
--      penggantinya adalah unggahan manual di bawah.
--
--   2. Tempat menyimpan berkas hasil beserta aturan siapa boleh
--      mengunggah dan siapa boleh membaca.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Izin Koordinator atas modul Humas dicabut.
--
-- Termasuk modul Layanan Pelanggan yang dulu terbuka untuknya:
-- seluruh modul penyusun berpindah ke dashboard yang terpisah,
-- jadi tidak ada lagi yang bisa dibuka dari sini. Bila suatu saat
-- beliau tetap perlu memakai modul itu, izinnya tinggal diberikan
-- kembali di dashboard yang baru.
-- ------------------------------------------------------------
delete from akses_modul
 where modul in ('humas', 'humas_pelanggan')
   and pengguna_id in (
        select id from pengguna where jabatan = 'Koordinator Manajemen Bisnis');


-- ------------------------------------------------------------
-- (2) Arsip berkas hasil.
--
-- Berkasnya sendiri disimpan di wadah 'dokumen' yang tertutup —
-- yang sama dengan template formulir komplain — dan hanya bisa
-- diambil lewat aplikasi setelah izinnya diperiksa. Tidak ada
-- alamat langsung yang bisa dibagikan tanpa sengaja.
-- ------------------------------------------------------------
create table if not exists publikasi (
    id             bigserial primary key,
    judul          text not null,
    keterangan     text,
    jenis          text not null default 'Lainnya',
    berkas_jalur   text not null,
    berkas_nama    text not null,
    berkas_ukuran  integer,
    diunggah_oleh  bigint not null references pengguna(id),
    diunggah_pada  timestamptz not null default now()
);

create index if not exists idx_publikasi on publikasi(diunggah_pada desc);

alter table publikasi enable row level security;


-- ------------------------------------------------------------
-- (3) Siapa boleh apa.
--
-- Mengunggah: yang memegang izin 'humas' — merekalah yang
-- menyusun dokumennya di dashboard sebelah.
-- Membaca: mereka, ditambah pemegang izin 'publikasi' —
-- yaitu Koordinator, yang menerima hasilnya.
--
-- Menghapus hanya berkas sendiri, atau oleh Admin. Dokumen yang
-- sudah diserahkan ke pimpinan tidak pantas bisa ditarik diam-diam
-- oleh orang lain.
-- ------------------------------------------------------------
drop policy if exists publikasi_baca on publikasi;
create policy publikasi_baca on publikasi
    for select to authenticated
    using (boleh_akses('publikasi') or boleh_akses('humas'));

drop policy if exists publikasi_unggah on publikasi;
create policy publikasi_unggah on publikasi
    for insert to authenticated
    with check (boleh_akses('humas') and diunggah_oleh = id_saya());

drop policy if exists publikasi_hapus on publikasi;
create policy publikasi_hapus on publikasi
    for delete to authenticated
    using (
        (boleh_akses('publikasi') or boleh_akses('humas'))
        and (diunggah_oleh = id_saya() or peran_saya() = 'Admin')
    );


-- ------------------------------------------------------------
-- (4) Izin membaca arsip: Koordinator.
-- ------------------------------------------------------------
insert into akses_modul (pengguna_id, modul)
select id, 'publikasi' from pengguna
 where jabatan = 'Koordinator Manajemen Bisnis'
on conflict do nothing;


-- ============================================================
-- CEK — siapa boleh apa atas arsip publikasi.
-- ============================================================
select p.nama,
       p.jabatan,
       case when boleh.humas then 'mengunggah dan membaca'
            when boleh.publikasi then 'membaca saja'
            when p.peran = 'Admin' then 'mengunggah dan membaca (Admin)'
            else 'tidak berhak' end as arsip_publikasi
  from pengguna p
  cross join lateral (
      select exists (select 1 from akses_modul a
                      where a.pengguna_id = p.id and a.modul = 'humas') as humas,
             exists (select 1 from akses_modul a
                      where a.pengguna_id = p.id and a.modul = 'publikasi') as publikasi
  ) boleh
 order by p.id;
