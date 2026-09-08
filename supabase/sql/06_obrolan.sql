-- ============================================================
-- 06. OBROLAN UNIT
--
-- Satu ruang obrolan untuk seluruh anggota manbis — bukan pesan
-- pribadi antar dua orang. Untuk unit berisi lima orang, satu
-- ruang bersama sudah cukup dan jauh lebih sederhana dirawat.
--
-- Pesan tidak benar-benar dihapus, melainkan ditandai. Alasannya
-- sama dengan nomor yang dibatalkan: percakapan kerja adalah
-- catatan, dan catatan yang bisa lenyap tanpa jejak sulit
-- dipertanggungjawabkan.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Tabel pesan.
-- ------------------------------------------------------------
create table if not exists obrolan (
    id           bigserial primary key,
    pengguna_id  bigint not null references pengguna(id),
    pesan        text   not null,
    dihapus      boolean not null default false,
    dibuat_pada  timestamptz not null default now(),
    disunting_pada timestamptz,
    constraint obrolan_pesan_tidak_kosong check (btrim(pesan) <> '')
);

create index if not exists idx_obrolan_waktu on obrolan(dibuat_pada desc);

alter table obrolan enable row level security;


-- ------------------------------------------------------------
-- (2) Siapa boleh apa.
--
-- Semua anggota aktif boleh membaca seluruh isi ruang — memang
-- itu gunanya ruang bersama. Menulis hanya atas nama sendiri:
-- kolom pengguna_id tidak bisa diisi nama orang lain, walaupun
-- permintaannya dibuat langsung ke database.
-- ------------------------------------------------------------
drop policy if exists obrolan_baca on obrolan;
create policy obrolan_baca on obrolan
    for select to authenticated
    using (id_saya() is not null);

drop policy if exists obrolan_tulis on obrolan;
create policy obrolan_tulis on obrolan
    for insert to authenticated
    with check (pengguna_id = id_saya());

-- Menyunting dan menandai terhapus: hanya pesan sendiri.
-- Admin sengaja TIDAK diberi hak mengubah pesan orang lain —
-- menyunting ucapan orang lain bukan wewenang yang pantas ada.
drop policy if exists obrolan_sunting on obrolan;
create policy obrolan_sunting on obrolan
    for update to authenticated
    using (pengguna_id = id_saya())
    with check (pengguna_id = id_saya());

-- Tidak ada kebijakan hapus sama sekali, jadi baris tidak bisa
-- dilenyapkan oleh siapa pun. Yang ada hanya penandaan 'dihapus'.


-- ------------------------------------------------------------
-- (3) Supaya pesan baru muncul sendiri tanpa memuat ulang halaman.
--
-- Aturan keamanan di atas tetap berlaku pada aliran langsung ini:
-- Supabase menyaringnya dengan kebijakan yang sama.
-- ------------------------------------------------------------
do $realtime$
begin
    if not exists (
        select 1 from pg_publication_tables
         where pubname = 'supabase_realtime'
           and schemaname = 'public'
           and tablename = 'obrolan'
    ) then
        alter publication supabase_realtime add table obrolan;
    end if;
end
$realtime$;


-- ============================================================
-- CEK — tabel, kebijakan, dan aliran langsungnya.
-- ============================================================
select 'kebijakan' as apa, policyname::text as nama
  from pg_policies where tablename = 'obrolan'
union all
select 'aliran langsung', tablename::text
  from pg_publication_tables
 where pubname = 'supabase_realtime' and tablename = 'obrolan'
 order by 1, 2;
