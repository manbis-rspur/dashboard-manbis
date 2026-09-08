-- ============================================================
-- 13. PEMBATASAN MODUL HUMAS & DIGITAL MARKETING
--
-- Susunan barunya:
--
--   Humas dan Digital Marketing  -> memakai seluruh modul
--   Koordinator                  -> TIDAK memakai modul penyusun,
--                                   kecuali yang berkategori
--                                   Layanan Pelanggan; tetapi
--                                   menerima seluruh hasil yang
--                                   disusun tim
--
-- Dipisah jadi dua izin, bukan satu izin dengan pengecualian di
-- aplikasi: pembatasan yang hanya berupa menu tersembunyi masih
-- bisa ditembus dengan mengetik alamatnya langsung. Di sini
-- Koordinator benar-benar tidak bisa membaca modul selain Layanan
-- Pelanggan, sekalipun bertanya langsung ke database.
--
--   humas            -> memakai semua modul, dan merakit modul baru
--   humas_pelanggan  -> hanya modul Layanan Pelanggan
--
-- Riwayat dokumen sengaja TIDAK dibatasi: keduanya melihat seluruh
-- hasil. Itulah cara hasil "terkirim" ke Koordinator — bukan lewat
-- pesan yang bisa terlewat, melainkan karena memang sudah ada di
-- daftarnya begitu dokumennya jadi.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Izin per orang.
-- ------------------------------------------------------------

-- Koordinator: izin penuh dicabut, diganti izin terbatas.
delete from akses_modul
 where modul = 'humas'
   and pengguna_id in (select id from pengguna where jabatan = 'Koordinator Manajemen Bisnis');

insert into akses_modul (pengguna_id, modul)
select id, 'humas_pelanggan' from pengguna
 where jabatan = 'Koordinator Manajemen Bisnis'
on conflict do nothing;

-- Humas dan Digital Marketing: izin penuh.
insert into akses_modul (pengguna_id, modul)
select id, 'humas' from pengguna
 where jabatan in ('Humas', 'Digital Marketing')
on conflict do nothing;


-- ------------------------------------------------------------
-- (2) Modul mana yang boleh dibaca siapa.
--
-- Yang berizin terbatas hanya melihat kategori Layanan Pelanggan.
-- Modul lain tidak sekadar disembunyikan — barisnya memang tidak
-- terbaca olehnya.
-- ------------------------------------------------------------
drop policy if exists modul_ai_baca on modul_ai;
create policy modul_ai_baca on modul_ai
    for select to authenticated
    using (
        boleh_akses('humas')
        or (boleh_akses('humas_pelanggan') and kategori = 'Layanan Pelanggan')
    );

-- Merakit dan menyunting modul tetap hanya bagi yang berizin penuh.
drop policy if exists modul_ai_sunting on modul_ai;
create policy modul_ai_sunting on modul_ai
    for update to authenticated
    using (boleh_akses('humas'))
    with check (boleh_akses('humas'));


-- ------------------------------------------------------------
-- (3) Riwayat dokumen — terbaca oleh keduanya.
-- ------------------------------------------------------------
drop policy if exists riwayat_ai_baca on riwayat_ai;
create policy riwayat_ai_baca on riwayat_ai
    for select to authenticated
    using (boleh_akses('humas') or boleh_akses('humas_pelanggan'));

drop policy if exists riwayat_ai_tulis on riwayat_ai;
create policy riwayat_ai_tulis on riwayat_ai
    for insert to authenticated
    with check (
        (boleh_akses('humas') or boleh_akses('humas_pelanggan'))
        and oleh = id_saya()
    );

-- Menghapus dokumen: hanya miliknya sendiri, atau Admin.
drop policy if exists riwayat_ai_hapus on riwayat_ai;
create policy riwayat_ai_hapus on riwayat_ai
    for delete to authenticated
    using (
        (boleh_akses('humas') or boleh_akses('humas_pelanggan'))
        and (oleh = id_saya() or peran_saya() = 'Admin')
    );


-- ============================================================
-- CEK — siapa boleh apa sekarang.
--
-- Catatan: Admin selalu berhak atas segalanya. Saat ini peran
-- Admin dipegang Digital Marketing, jadi hasilnya sama saja —
-- tetapi kalau peran Admin suatu saat berpindah ke Koordinator,
-- pembatasan ini ikut terbuka untuknya.
-- ============================================================
select p.nama,
       p.jabatan,
       p.peran,
       case when p.peran = 'Admin' then 'semua modul (Admin)'
            when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'humas')
                 then 'semua modul'
            when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'humas_pelanggan')
                 then 'hanya Layanan Pelanggan + menerima hasil'
            else 'tidak berhak' end as modul_humas
  from pengguna p
 order by p.id;
