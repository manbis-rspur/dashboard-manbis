-- ============================================================
-- 41. MENYUNTING HASIL DI TEMPAT, DAN DRAF BERUPA TEKS
--
-- Tiga hal yang saling bersambung.
--
-- (A) Dokumen hasil susunan AI selama ini hanya bisa dibaca. Yang
--     ingin membetulkan satu kotak pada tabel kalender harus
--     menyalinnya ke tempat lain dulu — dan sejak saat itu yang di
--     sistem bukan lagi yang sebenarnya dipakai.
--
-- (B) Tautan Google Docs-nya tidak punya tempat tinggal. Sudah
--     dibuat, lalu hilang di percakapan WhatsApp.
--
-- (C) Hasil yang ingin dikoordinasikan berdua harus diunduh dulu,
--     lalu diunggah lagi ke Draf Bersama. Dua langkah yang tidak
--     menghasilkan apa-apa, dan tiap langkah adalah kesempatan
--     memakai berkas versi lama.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Dokumen hasil boleh disunting, dan punya tempat untuk
--     tautan Google Docs-nya.
-- ------------------------------------------------------------
alter table riwayat_ai
    add column if not exists tautan_docs text,
    add column if not exists diubah_pada timestamptz;

alter table riwayat_ai drop constraint if exists riwayat_tautan_aman;
alter table riwayat_ai add constraint riwayat_tautan_aman
    check (tautan_docs is null or tautan_docs ~* '^https://');

-- Selama ini tidak ada aturan ubah sama sekali, jadi menyunting
-- selalu ditolak diam-diam oleh RLS.
drop policy if exists riwayat_ai_ubah on riwayat_ai;
create policy riwayat_ai_ubah on riwayat_ai
    for update to authenticated
    using (boleh_akses('humas')) with check (boleh_akses('humas'));


-- ------------------------------------------------------------
-- (2) Draf boleh berupa teks, bukan cuma berkas.
--
-- Naskah yang baru saja disusun AI memang belum berbentuk berkas.
-- Memaksanya jadi berkas lebih dulu berarti mengunduh lalu
-- mengunggah lagi — dan yang diunggah belum tentu yang terakhir.
-- ------------------------------------------------------------
alter table draf
    add column if not exists isi text;

alter table draf drop constraint if exists draf_ada_isinya;
alter table draf add constraint draf_ada_isinya
    check (berkas_jalur is not null or tautan is not null or isi is not null);


-- ------------------------------------------------------------
-- (3) Pengiriman ke arsip ikut membawa teksnya.
--
-- Arsip Publikasi sudah lama menerima dokumen berupa teks — itulah
-- yang membuat Koordinator bisa menyuntingnya langsung di sana.
-- Yang belum, jalur dari Draf Bersama ke sana.
-- ------------------------------------------------------------
create or replace function kirim_draf_ke_arsip(p_draf_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $kirim$
declare
    v_saya bigint := id_saya();
    v_d    draf%rowtype;
    v_id   bigint;
begin
    if not punya_izin('humas') then
        raise exception 'Anda tidak berhak mengirim draf ke arsip';
    end if;

    select * into v_d from draf where id = p_draf_id;
    if not found then raise exception 'Draf tidak ditemukan'; end if;
    if v_d.publikasi_id is not null then
        raise exception 'Draf ini sudah pernah dikirim ke arsip';
    end if;

    -- Arsip menerima teks atau berkas. Yang tidak diterima adalah
    -- draf yang isinya cuma tautan Drive — dan kalau dibiarkan,
    -- yang muncul galat database yang tidak terbaca orang.
    if v_d.berkas_jalur is null and v_d.isi is null then
        raise exception 'Draf ini belum ada naskahnya — unggah berkas atau tulis naskahnya dulu sebelum dikirim ke arsip';
    end if;

    insert into publikasi (judul, jenis, keterangan, isi, berkas_jalur, berkas_nama,
                           berkas_ukuran, tautan_docs, diunggah_oleh)
    values (v_d.judul, v_d.jenis, v_d.keterangan, v_d.isi, v_d.berkas_jalur, v_d.berkas_nama,
            v_d.berkas_ukuran, v_d.tautan, v_saya)
    returning id into v_id;

    -- Naskah teks dicatat sebagai revisi pertama di sisi arsip,
    -- supaya riwayat suntingan Koordinator punya titik awal.
    if v_d.isi is not null then
        insert into publikasi_revisi (publikasi_id, isi, oleh)
        values (v_id, v_d.isi, v_saya);
    end if;

    update draf
       set publikasi_id = v_id,
           status       = 'Terkirim',
           dikirim_pada = now(),
           diubah_pada  = now()
     where id = p_draf_id;

    return v_id;
end
$kirim$;

grant execute on function kirim_draf_ke_arsip(bigint) to authenticated;


-- ============================================================
-- CEK
-- ============================================================
select 'riwayat_ai bisa disunting' as perkara,
       exists (select 1 from pg_policies
                where tablename = 'riwayat_ai' and policyname = 'riwayat_ai_ubah') as sudah
union all
select 'draf bisa berupa teks',
       exists (select 1 from information_schema.columns
                where table_name = 'draf' and column_name = 'isi');
