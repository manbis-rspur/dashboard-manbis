-- ============================================================
-- 43. DAFTAR LAYANAN RUMAH SAKIT
--
-- Pendamping daftar dokter. Dokter menjawab "siapa", layanan
-- menjawab "apa yang kita punya" — dan kalender konten butuh
-- keduanya.
--
-- Tanpa ini AI hanya mengenal poliklinik dari nama poli tempat
-- dokternya praktik. Layanan yang tidak punya poli sendiri jadi
-- tidak pernah terangkat: Medical Check Up, Radiologi,
-- Laboratorium, Ambulans 24 Jam, Prime Care, pelayanan BPJS.
-- Padahal justru itu yang sering perlu diumumkan.
--
-- Sumbernya sama dengan daftar dokter: halaman Layanan di
-- rspur.co.id, yang menyiarkan daftar resminya dalam bentuk
-- schema.org. Ikut tersegarkan sendiri tiap hari.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


create table if not exists layanan (
    id          bigserial primary key,
    nama        text not null,

    -- Kalimat pengenalnya dari situs. Inilah yang membuat AI tahu
    -- bedanya Prime Care dengan Poliklinik biasa, dan tidak
    -- menebak-nebak sendiri.
    ringkasan   text,
    tautan      text,

    aktif       boolean not null default true,
    urutan      integer not null default 0,
    diubah_pada timestamptz not null default now(),

    constraint layanan_nama_ada check (btrim(nama) <> ''),
    constraint layanan_tautan_aman check (tautan is null or tautan ~* '^https://'),
    constraint layanan_unik unique (nama)
);

create index if not exists idx_layanan on layanan(urutan, nama);

alter table layanan enable row level security;


-- ------------------------------------------------------------
-- Siapa boleh apa. Sama dengan daftar dokter: dibaca siapa saja
-- yang sudah masuk, diubah hanya pemegang izin 'humas'.
-- ------------------------------------------------------------
drop policy if exists layanan_baca on layanan;
create policy layanan_baca on layanan
    for select to authenticated using (true);

drop policy if exists layanan_ubah on layanan;
create policy layanan_ubah on layanan
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));


-- ------------------------------------------------------------
-- Modul mana yang perlu tahu daftar layanan.
-- ------------------------------------------------------------
alter table modul_ai
    add column if not exists pakai_layanan boolean not null default false;

update modul_ai set pakai_layanan = true
 where judul ilike '%kalender konten%';


-- ------------------------------------------------------------
-- DOKUMEN UNTUK INSTANSI LAIN
--
-- Modul yang sama kadang dipakai menyusun konten untuk rumah
-- sakit atau klinik lain. Untuk dokumen seperti itu, data RSPUR
-- justru tidak boleh ikut: nama dokter, daftar layanan, dan
-- penyebutan RSPUR harus hilang seluruhnya.
--
-- Penandanya disimpan bersama dokumennya, bukan cuma dipilih saat
-- menyusun. Kalau tidak, perbaikan yang diminta belakangan akan
-- menyelipkan kembali nama dokter RSPUR ke dokumen milik
-- instansi lain — dan itu kesalahan yang tidak akan disadari
-- sampai sudah terbit.
-- ------------------------------------------------------------
alter table riwayat_ai
    add column if not exists untuk_rspur boolean not null default true,
    add column if not exists instansi    text;

alter table draf
    add column if not exists untuk_rspur boolean not null default true,
    add column if not exists instansi    text;


-- ============================================================
-- CEK
-- ============================================================
select judul, pakai_dokter, pakai_isu, pakai_layanan
  from modul_ai order by urutan, id;
