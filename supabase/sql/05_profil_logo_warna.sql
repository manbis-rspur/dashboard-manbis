-- ============================================================
-- 05. FOTO PROFIL, LOGO, DAN WARNA APLIKASI
--
-- Tiga hal yang saling berkaitan karena sama-sama butuh tempat
-- menyimpan berkas gambar:
--   - foto profil tiap anggota
--   - logo RSPUR sebagai identitas aplikasi
--   - warna utama aplikasi, diambil dari logo itu
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Tempat menyimpan gambar.
--
-- Wadahnya sengaja publik: logo harus tampil di halaman masuk,
-- yaitu sebelum siapa pun login. Isinya memang tidak rahasia —
-- logo rumah sakit dan foto profil, bukan dokumen.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('publik', 'publik', true)
on conflict (id) do nothing;

drop policy if exists p_publik_baca   on storage.objects;
drop policy if exists p_publik_unggah on storage.objects;

create policy p_publik_baca on storage.objects
    for select using (bucket_id = 'publik');

-- Yang boleh mengunggah hanya anggota manbis yang masih aktif.
create policy p_publik_unggah on storage.objects
    for all to authenticated
    using (bucket_id = 'publik' and id_saya() is not null)
    with check (bucket_id = 'publik' and id_saya() is not null);


-- ------------------------------------------------------------
-- (2) Kolom-kolom baru.
-- ------------------------------------------------------------
alter table pengguna
    add column if not exists foto_url text;

alter table pengaturan_sistem
    add column if not exists logo_url text,
    add column if not exists warna_utama text;


-- ------------------------------------------------------------
-- (3) Menyimpan foto profil sendiri.
--
-- Lewat fungsi, bukan dengan melonggarkan izin ubah pada tabel
-- pengguna: izin ubah baris akan membuat seorang Staf bisa
-- mengganti perannya sendiri jadi Admin. Fungsi ini hanya
-- menyentuh satu kolom, jadi tidak ada celah itu.
--
-- Alamat foto lama dikembalikan, supaya pemanggilnya bisa
-- membuang berkas usang dari penyimpanan.
-- ------------------------------------------------------------
create or replace function simpan_foto_profil(p_url text)
returns text
language plpgsql
security definer
set search_path = public
as $foto$
declare
    v_lama text;
    v_saya bigint := id_saya();
begin
    if v_saya is null then
        raise exception 'Akun tidak dikenali';
    end if;

    select foto_url into v_lama from pengguna where id = v_saya;

    update pengguna
       set foto_url = nullif(btrim(coalesce(p_url, '')), '')
     where id = v_saya;

    return v_lama;
end
$foto$;


-- ------------------------------------------------------------
-- (4) Menyimpan logo dan warna aplikasi. Hanya Admin.
--
-- Warna disimpan sebagai kode heksadesimal (#1b6156). Bentuknya
-- diperiksa di sini supaya nilai sembarangan tidak bisa masuk dan
-- merusak tampilan seluruh aplikasi.
-- ------------------------------------------------------------
create or replace function simpan_identitas(p_logo_url text, p_warna text)
returns text
language plpgsql
security definer
set search_path = public
as $identitas$
declare
    v_lama  text;
    v_warna text := nullif(btrim(coalesce(p_warna, '')), '');
begin
    if peran_saya() <> 'Admin' then
        raise exception 'Hanya Koordinator yang boleh mengubah identitas aplikasi';
    end if;

    if v_warna is not null and v_warna !~ '^#[0-9a-fA-F]{6}$' then
        raise exception 'Warna harus berupa kode seperti #1b6156';
    end if;

    select logo_url into v_lama from pengaturan_sistem where id = 1;

    update pengaturan_sistem
       set logo_url    = nullif(btrim(coalesce(p_logo_url, '')), ''),
           warna_utama = v_warna
     where id = 1;

    return v_lama;
end
$identitas$;


grant execute on function simpan_foto_profil(text)       to authenticated;
grant execute on function simpan_identitas(text, text)   to authenticated;


-- ------------------------------------------------------------
-- (5) Logo dan warna boleh dibaca sebelum login.
--
-- Halaman masuk perlu menampilkan logo, dan saat itu pengunjung
-- belum berstatus login. Isi tabel ini memang tidak rahasia —
-- kode rumah sakit, nama unit, alamat logo — jadi dibukakan
-- untuk dibaca saja. Yang mengubah tetap hanya Admin.
-- ------------------------------------------------------------
drop policy if exists pengaturan_baca_umum on pengaturan_sistem;
create policy pengaturan_baca_umum on pengaturan_sistem
    for select to anon using (true);


-- ============================================================
-- CEK — kolom dan fungsi yang baru dibuat.
-- ============================================================
select 'kolom pengguna.foto_url' as apa,
       count(*)::text as ada
  from information_schema.columns
 where table_name = 'pengguna' and column_name = 'foto_url'
union all
select 'kolom pengaturan.logo_url', count(*)::text
  from information_schema.columns
 where table_name = 'pengaturan_sistem' and column_name = 'logo_url'
union all
select 'kolom pengaturan.warna_utama', count(*)::text
  from information_schema.columns
 where table_name = 'pengaturan_sistem' and column_name = 'warna_utama'
union all
select 'wadah berkas publik', count(*)::text
  from storage.buckets where id = 'publik'
union all
select 'fungsi simpan_foto_profil', count(*)::text
  from pg_proc where proname = 'simpan_foto_profil'
union all
select 'fungsi simpan_identitas', count(*)::text
  from pg_proc where proname = 'simpan_identitas'
 order by 1;
