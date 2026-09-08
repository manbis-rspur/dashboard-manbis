-- ============================================================
-- 11. KOP SURAT BERUPA GAMBAR
--
-- Sebelumnya kop dokumen disusun dari dua bagian: logo di kiri dan
-- alamat yang diketik di kanan. Cara itu menuntut penyusunan ulang
-- yang belum tentu sama persis dengan kop surat resmi.
--
-- Kalau kop resminya sudah ada dalam bentuk gambar, jauh lebih
-- tepat memakainya apa adanya. Kolom di bawah menyimpan alamat
-- gambar itu; kalau diisi, kop gambar yang dipakai. Kalau kosong,
-- sistem kembali memakai logo dan alamat seperti sebelumnya.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table pengaturan_sistem
    add column if not exists kop_url text;


create or replace function simpan_identitas(
    p_logo_url text,
    p_warna    text,
    p_alamat   text default null,
    p_kop_url  text default null
)
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
           warna_utama = v_warna,
           alamat_kop  = coalesce(nullif(btrim(coalesce(p_alamat, '')), ''), alamat_kop),
           kop_url     = coalesce(nullif(btrim(coalesce(p_kop_url, '')), ''), kop_url)
     where id = 1;

    return v_lama;
end
$identitas$;


-- Menghapus kop tidak bisa lewat fungsi di atas, karena di sana
-- nilai kosong berarti "biarkan seperti semula". Penghapusan
-- memang harus diminta secara terpisah dan tegas.
create or replace function hapus_kop()
returns text
language plpgsql
security definer
set search_path = public
as $hapus$
declare
    v_lama text;
begin
    if peran_saya() <> 'Admin' then
        raise exception 'Hanya Koordinator yang boleh mengubah identitas aplikasi';
    end if;

    select kop_url into v_lama from pengaturan_sistem where id = 1;
    update pengaturan_sistem set kop_url = null where id = 1;
    return v_lama;
end
$hapus$;

grant execute on function simpan_identitas(text, text, text, text) to authenticated;
grant execute on function hapus_kop() to authenticated;


-- ============================================================
-- CEK
-- ============================================================
select logo_url is not null as ada_logo,
       kop_url  is not null as ada_kop,
       coalesce(alamat_kop, '(belum diisi)') as alamat_kop
  from pengaturan_sistem where id = 1;
