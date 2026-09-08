-- ============================================================
-- 08. PENGAMAN "ADMIN TERAKHIR"
--
-- Peran bisa diubah sendiri lewat menu Pengguna, tanpa perlu
-- menyentuh database. Itu memang disengaja. Tapi kebebasan itu
-- membuka satu kemungkinan yang tidak bisa diperbaiki dari dalam
-- aplikasi: Admin satu-satunya menurunkan dirinya sendiri jadi
-- Staf — atau menonaktifkan akunnya sendiri.
--
-- Begitu itu terjadi, tidak ada lagi yang berhak mengangkat siapa
-- pun jadi Admin, dan satu-satunya jalan keluar adalah membetulkan
-- lewat SQL Editor. Pengaman ini menolak langkah terakhir itu
-- sebelum terjadi.
--
-- Diletakkan di database, bukan di aplikasi, supaya tetap berlaku
-- walaupun perubahannya dilakukan langsung lewat Table Editor.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

create or replace function jaga_admin_terakhir()
returns trigger
language plpgsql
as $jaga$
begin
    -- Hanya diperiksa kalau baris ini SEDANG berhenti menjadi
    -- Admin aktif. Perubahan lain tidak disentuh sama sekali.
    if (old.peran = 'Admin' and old.aktif)
       and (new.peran <> 'Admin' or new.aktif = false) then

        if not exists (
            select 1 from pengguna
             where peran = 'Admin' and aktif and id <> old.id
        ) then
            raise exception
                'Harus selalu ada satu Admin yang aktif. Angkat orang lain jadi Admin lebih dulu, baru ubah yang ini.';
        end if;
    end if;

    return new;
end
$jaga$;

drop trigger if exists trg_jaga_admin on pengguna;

create trigger trg_jaga_admin
    before update on pengguna
    for each row execute function jaga_admin_terakhir();


-- ============================================================
-- CEK — daftar Admin yang aktif saat ini. Harus ada minimal satu.
-- ============================================================
select nama, jabatan, peran, aktif
  from pengguna
 where peran = 'Admin' and aktif
 order by id;
