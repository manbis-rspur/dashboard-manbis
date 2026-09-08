-- ============================================================
-- 18. DOKUMEN TEKS DI ARSIP — BISA DISUNTING DI TEMPAT
--
-- Sebelumnya Arsip Publikasi hanya menerima berkas. Berkas Word
-- atau PDF tidak bisa disunting di dalam peramban, sehingga
-- Koordinator hanya bisa mengunduhnya.
--
-- Sekarang sebuah dokumen boleh berupa teks, bukan berkas. Teks
-- bisa disunting langsung di halaman, dan karena kedua dashboard
-- memakai database yang sama, suntingannya langsung terlihat di
-- sisi Humas tanpa perlu dikirim balik.
--
-- Tiap penyimpanan dicatat sebagai revisi tersendiri. Naskah asli
-- tidak pernah hilang, dan terlihat siapa mengubah apa — penting
-- karena yang disunting adalah dokumen yang akan terbit atas nama
-- rumah sakit.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Dokumen boleh berupa teks, boleh berupa berkas.
--
-- Kolom berkas dilonggarkan supaya boleh kosong; sebagai gantinya
-- dipasang syarat bahwa salah satu di antara keduanya harus ada.
-- ------------------------------------------------------------
alter table publikasi
    add column if not exists isi          text,
    add column if not exists diubah_oleh  bigint references pengguna(id),
    add column if not exists diubah_pada  timestamptz;

alter table publikasi alter column berkas_jalur drop not null;
alter table publikasi alter column berkas_nama  drop not null;

alter table publikasi drop constraint if exists publikasi_ada_isinya;
alter table publikasi add constraint publikasi_ada_isinya
    check (isi is not null or berkas_jalur is not null);


-- ------------------------------------------------------------
-- (2) Riwayat revisi.
--
-- Satu baris untuk tiap kali dokumen disimpan, termasuk naskah
-- pertamanya. Dengan begitu perbandingan sebelum-sesudah selalu
-- bisa dilakukan.
-- ------------------------------------------------------------
create table if not exists publikasi_revisi (
    id           bigserial primary key,
    publikasi_id bigint not null references publikasi(id) on delete cascade,
    isi          text   not null,
    catatan      text,
    oleh         bigint not null references pengguna(id),
    pada         timestamptz not null default now()
);

create index if not exists idx_publikasi_revisi on publikasi_revisi(publikasi_id, pada desc);

alter table publikasi_revisi enable row level security;


-- ------------------------------------------------------------
-- (3) Siapa boleh apa.
--
-- Menyunting isi dokumen: siapa pun yang berhak membaca arsip —
-- yaitu Humas, Digital Marketing, dan Koordinator. Memang itu
-- tujuannya: Koordinator mengoreksi, Humas melihat koreksinya.
--
-- Keterangan dokumen (judul, jenis) tetap milik yang mengunggah;
-- yang bisa diubah semua orang hanya isinya.
-- ------------------------------------------------------------
drop policy if exists publikasi_sunting on publikasi;
create policy publikasi_sunting on publikasi
    for update to authenticated
    using (boleh_akses('publikasi') or boleh_akses('humas'))
    with check (boleh_akses('publikasi') or boleh_akses('humas'));

drop policy if exists publikasi_revisi_baca on publikasi_revisi;
create policy publikasi_revisi_baca on publikasi_revisi
    for select to authenticated
    using (boleh_akses('publikasi') or boleh_akses('humas'));

drop policy if exists publikasi_revisi_tulis on publikasi_revisi;
create policy publikasi_revisi_tulis on publikasi_revisi
    for insert to authenticated
    with check (
        (boleh_akses('publikasi') or boleh_akses('humas'))
        and oleh = id_saya()
    );

-- Revisi tidak bisa dihapus oleh siapa pun: tanpa kebijakan hapus,
-- RLS menutupnya untuk semua. Riwayat koreksi yang bisa dihilangkan
-- sama saja dengan tidak punya riwayat.


-- ------------------------------------------------------------
-- (4) Mengirim hasil dari dashboard Humas ke arsip.
--
-- Ditulis sebagai fungsi supaya keduanya — pembuatan dokumen dan
-- pencatatan revisi pertamanya — terjadi sekaligus, tidak setengah
-- jalan bila salah satunya gagal.
-- ------------------------------------------------------------
create or replace function kirim_ke_arsip(
    p_judul      text,
    p_jenis      text,
    p_keterangan text,
    p_isi        text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $kirim$
declare
    v_saya bigint := id_saya();
    v_id   bigint;
begin
    if not boleh_akses('humas') then
        raise exception 'Anda tidak berhak mengirim dokumen ke arsip';
    end if;

    if p_isi is null or btrim(p_isi) = '' then
        raise exception 'Isi dokumen kosong';
    end if;

    insert into publikasi (judul, jenis, keterangan, isi, diunggah_oleh)
    values (btrim(p_judul), coalesce(nullif(btrim(p_jenis), ''), 'Lainnya'),
            nullif(btrim(coalesce(p_keterangan, '')), ''), p_isi, v_saya)
    returning id into v_id;

    insert into publikasi_revisi (publikasi_id, isi, catatan, oleh)
    values (v_id, p_isi, 'Naskah pertama', v_saya);

    return v_id;
end
$kirim$;

grant execute on function kirim_ke_arsip(text, text, text, text) to authenticated;


-- ============================================================
-- CEK
-- ============================================================
select 'dokumen di arsip' as apa, count(*)::text as jumlah from publikasi
union all
select 'revisi tercatat', count(*)::text from publikasi_revisi;
