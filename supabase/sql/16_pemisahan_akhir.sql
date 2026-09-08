-- ============================================================
-- 16. PEMBAGIAN AKHIR DUA DASHBOARD
--
-- Modul Balasan Ulasan & Komplain Pasien TETAP tinggal di
-- Dashboard Manajemen Bisnis; hanya lima modul lainnya yang
-- berpindah ke dashboard Humas & Digital Marketing.
--
-- Karena itu izin Koordinator dikembalikan — tetapi dengan satu
-- perbaikan penting pada riwayat dokumen.
--
-- Persoalannya begini: riwayat disimpan di satu tabel yang sama
-- untuk kedua dashboard. Kalau izin Koordinator dikembalikan apa
-- adanya, beliau akan ikut melihat SELURUH dokumen — termasuk
-- yang disusun di dashboard sebelah, yang justru dipisahkan.
-- Maka aturan bacanya diperketat: pemegang izin terbatas hanya
-- melihat dokumen dari modul berkategori Layanan Pelanggan.
--
-- Ditambah tempat menyimpan logo dan warna khusus dashboard
-- Humas & Digital Marketing, terpisah dari milik dashboard ini —
-- mengganti salah satunya tidak mengubah yang lain.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Izin Koordinator atas modul Layanan Pelanggan dikembalikan.
-- ------------------------------------------------------------
insert into akses_modul (pengguna_id, modul)
select id, 'humas_pelanggan' from pengguna
 where jabatan = 'Koordinator Manajemen Bisnis'
on conflict do nothing;


-- ------------------------------------------------------------
-- (2) Riwayat dokumen dibatasi menurut kategori modulnya.
--
-- Pemegang izin penuh melihat semuanya. Pemegang izin terbatas
-- hanya melihat dokumen dari modul Layanan Pelanggan — yaitu
-- dokumen yang memang dibuat di dashboard ini.
-- ------------------------------------------------------------
drop policy if exists riwayat_ai_baca on riwayat_ai;
create policy riwayat_ai_baca on riwayat_ai
    for select to authenticated
    using (
        boleh_akses('humas')
        or (
            boleh_akses('humas_pelanggan')
            and exists (
                select 1 from modul_ai m
                 where m.id = riwayat_ai.modul_id
                   and m.kategori = 'Layanan Pelanggan'
            )
        )
    );

drop policy if exists riwayat_ai_tulis on riwayat_ai;
create policy riwayat_ai_tulis on riwayat_ai
    for insert to authenticated
    with check (
        (boleh_akses('humas') or boleh_akses('humas_pelanggan'))
        and oleh = id_saya()
    );


-- ------------------------------------------------------------
-- (3) Logo dan warna khusus dashboard Humas & Digital Marketing.
--
-- Disimpan terpisah dari logo dashboard ini: keduanya dashboard
-- yang berbeda, dan mengganti tampilan yang satu tidak seharusnya
-- mengubah yang lain.
-- ------------------------------------------------------------
alter table pengaturan_sistem
    add column if not exists logo_humas_url text,
    add column if not exists warna_humas    text;


create or replace function simpan_identitas_humas(p_logo_url text, p_warna text)
returns text
language plpgsql
security definer
set search_path = public
as $identitas$
declare
    v_lama  text;
    v_warna text := nullif(btrim(coalesce(p_warna, '')), '');
begin
    -- Yang boleh mengubah tampilan dashboard itu adalah yang
    -- memakainya sehari-hari, bukan Admin dashboard sebelah.
    if not boleh_akses('humas') then
        raise exception 'Hanya Humas dan Digital Marketing yang boleh mengubah tampilan dashboard ini';
    end if;

    if v_warna is not null and v_warna !~ '^#[0-9a-fA-F]{6}$' then
        raise exception 'Warna harus berupa kode seperti #1b6156';
    end if;

    select logo_humas_url into v_lama from pengaturan_sistem where id = 1;

    update pengaturan_sistem
       set logo_humas_url = nullif(btrim(coalesce(p_logo_url, '')), ''),
           warna_humas    = v_warna
     where id = 1;

    return v_lama;
end
$identitas$;

grant execute on function simpan_identitas_humas(text, text) to authenticated;


-- ============================================================
-- CEK — pembagian modul dan siapa melihat apa.
-- ============================================================
select judul, kategori,
       case when kategori = 'Layanan Pelanggan'
            then 'Dashboard Manajemen Bisnis'
            else 'Dashboard Humas & Digital Marketing' end as tinggal_di
  from modul_ai order by urutan;

select p.nama, p.jabatan,
       case when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'humas')
                 then 'semua modul, kedua dashboard'
            when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'humas_pelanggan')
                 then 'hanya Layanan Pelanggan, di dashboard manbis'
            else 'tidak berhak' end as akses
  from pengguna p order by p.id;
