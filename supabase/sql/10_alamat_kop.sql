-- ============================================================
-- 10. ALAMAT PADA KOP DOKUMEN
--
-- Formulir komplain yang dicetak memuat kop: logo di kiri, alamat
-- dan kontak rumah sakit di kanan.
--
-- Alamatnya disimpan sebagai pengaturan, bukan ditulis di dalam
-- program, karena dua alasan: nomor telepon dan email bisa berubah,
-- dan salah menuliskannya pada dokumen resmi bukan hal sepele.
-- Biarkan yang tahu persis yang mengisinya.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table pengaturan_sistem
    add column if not exists alamat_kop text;


-- Fungsi penyimpan identitas ikut menerima alamat kop.
create or replace function simpan_identitas(
    p_logo_url text,
    p_warna    text,
    p_alamat   text default null
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
           alamat_kop  = coalesce(nullif(btrim(coalesce(p_alamat, '')), ''), alamat_kop)
     where id = 1;

    return v_lama;
end
$identitas$;

grant execute on function simpan_identitas(text, text, text) to authenticated;


-- ============================================================
-- CEK
-- ============================================================
select logo_url is not null as ada_logo,
       warna_utama,
       coalesce(alamat_kop, '(belum diisi)') as alamat_kop
  from pengaturan_sistem where id = 1;
