-- ============================================================
-- 17. SELURUH MODUL PENYUSUN PINDAH
--
-- Modul Balasan Ulasan & Komplain Pasien ikut berpindah ke
-- dashboard Humas & Digital Marketing. Di Dashboard Manajemen
-- Bisnis tidak ada lagi modul penyusun sama sekali — yang ada
-- hanya Arsip Publikasi, tempat hasil yang sudah final diunggah.
--
-- Akibatnya untuk Koordinator: beliau tidak lagi menyusun balasan
-- ulasan sendiri, dan tidak lagi melihat riwayat dokumen. Yang
-- diterimanya adalah berkas yang diunggah ke Arsip Publikasi.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

-- Izin terbatas dicabut — tidak ada lagi modul yang bisa dibuka
-- dengannya di dashboard mana pun.
delete from akses_modul
 where modul = 'humas_pelanggan';


-- Aturan baca riwayat disederhanakan kembali: hanya pemegang izin
-- penuh, yaitu mereka yang memakai dashboard Humas.
drop policy if exists riwayat_ai_baca on riwayat_ai;
create policy riwayat_ai_baca on riwayat_ai
    for select to authenticated using (boleh_akses('humas'));

drop policy if exists riwayat_ai_tulis on riwayat_ai;
create policy riwayat_ai_tulis on riwayat_ai
    for insert to authenticated
    with check (boleh_akses('humas') and oleh = id_saya());

drop policy if exists riwayat_ai_hapus on riwayat_ai;
create policy riwayat_ai_hapus on riwayat_ai
    for delete to authenticated
    using (boleh_akses('humas') and (oleh = id_saya() or peran_saya() = 'Admin'));


-- Modul juga kembali sederhana: yang berizin penuh melihat
-- semuanya, yang lain tidak melihat apa pun.
drop policy if exists modul_ai_baca on modul_ai;
create policy modul_ai_baca on modul_ai
    for select to authenticated using (boleh_akses('humas'));


-- ============================================================
-- CEK — siapa memakai apa sekarang.
-- ============================================================
select p.nama, p.jabatan,
       case when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'humas')
                 then 'dashboard Humas & Digital Marketing'
            when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'publikasi')
                 then 'membaca Arsip Publikasi di dashboard manbis'
            else '-' end as modul_dokumen
  from pengguna p order by p.id;
