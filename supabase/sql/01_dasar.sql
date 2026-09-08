-- ============================================================
-- 01. DASAR — PENGATURAN, PENGGUNA, JENIS DOKUMEN
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Pengaturan sistem. Satu baris saja (id = 1).
--
-- panjang_urutan = 3 karena nomor manbis berbentuk 001, bukan 0001.
-- Disimpan sebagai pengaturan, bukan ditulis di dalam fungsi,
-- supaya bisa diubah tanpa mengubah program.
-- ------------------------------------------------------------
create table if not exists pengaturan_sistem (
    id              smallint primary key default 1,
    kode_rs         text    not null default 'PUR',
    panjang_urutan  integer not null default 3,
    nama_unit       text    not null default 'Manajemen Bisnis',
    constraint pengaturan_sistem_satu_baris check (id = 1),
    constraint pengaturan_sistem_panjang check (panjang_urutan between 1 and 6)
);

insert into pengaturan_sistem (id) values (1)
on conflict (id) do nothing;


-- ------------------------------------------------------------
-- (2) Pengguna manbis.
--
-- auth_user_id menyambung baris ini ke akun login Supabase.
-- Penyambungnya sengaja bukan email: kalau suatu saat email
-- seseorang diganti, sistem tetap mengenali orangnya.
-- ------------------------------------------------------------
create table if not exists pengguna (
    id           bigserial primary key,
    nama         text not null,
    jabatan      text not null,
    email        text not null unique,
    peran        text not null default 'Staf',
    aktif        boolean not null default true,
    auth_user_id uuid unique references auth.users(id) on delete set null,
    dibuat_pada  timestamptz not null default now(),
    constraint pengguna_peran_check check (peran in ('Admin','Staf'))
);

create index if not exists idx_pengguna_auth on pengguna(auth_user_id);

-- Anggota unit manajemen bisnis.
-- Email di bawah sudah dipastikan benar oleh unit manbis (8 Sep 2026).
insert into pengguna (nama, jabatan, email, peran) values
    ('Nurhafiza, A.Md.Farm',  'Koordinator Manajemen Bisnis', 'fiza@rspur.co.id', 'Admin'),
    ('Rahmat Ridwan, ST',     'Humas',                        'rahmatridwan@rspur.co.id',    'Staf'),
    ('Nanda Monica Putri, SE','Marketing',                    'nandamonica@rspur.co.id',     'Staf'),
    ('Fitry Hasnawita, S.E',  'Administrasi',                 'hasnawitafitry@gmail.com',     'Staf'),
    ('M. Rezki Fitrah, S.E',  'Digital Marketing',            'mrf@rspur.co.id',     'Staf')
on conflict (email) do nothing;


-- ------------------------------------------------------------
-- (3) Jenis dokumen — inilah yang menentukan bentuk nomor.
--
--   Surat Keluar : 001/PUR-B0004/2026-S3
--   PKRS         : 001/PUR-B0017/2026-S3
--
-- Bedanya hanya kode unit. Akhiran tetap disimpan per jenis
-- (bukan disamakan begitu saja) supaya kalau suatu saat ada
-- jenis dokumen yang akhirannya berbeda, cukup diatur di sini.
-- ------------------------------------------------------------
create table if not exists jenis_dokumen (
    id             bigserial primary key,
    kode           text not null unique,
    nama           text not null,
    kode_unit      text not null,
    sufiks         text,
    aktif          boolean not null default true,
    urutan_tampil  integer not null default 0
);

insert into jenis_dokumen (kode, nama, kode_unit, sufiks, urutan_tampil) values
    ('SURAT', 'Surat Keluar', 'B0004', 'S3',  1),
    ('PKRS',  'PKRS',         'B0017', 'S3', 2)
on conflict (kode) do update
    set nama          = excluded.nama,
        kode_unit     = excluded.kode_unit,
        sufiks        = excluded.sufiks,
        urutan_tampil = excluded.urutan_tampil;


-- ------------------------------------------------------------
-- (4) Fungsi bantu — dipakai aturan keamanan (RLS) nanti.
--
-- 'security definer' supaya pemeriksaan peran tidak memicu
-- pemeriksaan berulang tanpa henti pada tabel pengguna sendiri.
-- ------------------------------------------------------------
create or replace function peran_saya()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select peran from pengguna
     where auth_user_id = auth.uid() and aktif
     limit 1;
$$;

create or replace function id_saya()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
    select id from pengguna
     where auth_user_id = auth.uid() and aktif
     limit 1;
$$;

grant execute on function peran_saya() to authenticated;
grant execute on function id_saya()    to authenticated;


-- ============================================================
-- CEK — harus memperlihatkan 5 pengguna dan 2 jenis dokumen.
-- ============================================================
select 'pengguna' as tabel, count(*) as jumlah from pengguna
union all
select 'jenis_dokumen', count(*) from jenis_dokumen;
