-- ============================================================
-- 50. KOP SURAT UNTUK BERKAS PDF
--
-- Konsep konten dan kalender sering dicetak atau dikirim ke luar
-- unit — ke Koordinator, ke manajemen, ke rekanan. Tanpa kop, ia
-- terlihat seperti catatan pribadi, bukan dokumen rumah sakit.
--
-- Boleh lebih dari satu, dan itu disengaja: modul yang sama juga
-- dipakai menyusun konten untuk rumah sakit atau klinik lain, dan
-- dokumen untuk mereka jelas tidak boleh berkop RSPUR. Jadi
-- kopnya dipilih saat mengunduh, bukan dipasang mati di kode.
--
-- Gambarnya diunggah sendiri. Menggambar kop dari nama, logo, dan
-- alamat berarti menebak susunan yang sudah ada aturannya di tiap
-- instansi — dan tebakan itu akan selalu meleset sedikit.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

create table if not exists kop_surat (
    id           bigserial primary key,
    nama         text    not null,
    berkas_jalur text    not null,
    berkas_nama  text    not null,

    -- Yang dipakai bila tidak memilih — termasuk oleh bot Telegram,
    -- yang tidak punya layar untuk menanyakannya.
    bawaan       boolean not null default false,
    aktif        boolean not null default true,

    dibuat_oleh  bigint  not null references pengguna(id),
    dibuat_pada  timestamptz not null default now(),

    constraint kop_nama_ada check (btrim(nama) <> ''),
    constraint kop_nama_unik unique (nama)
);

alter table kop_surat enable row level security;

drop policy if exists kop_surat_baca on kop_surat;
create policy kop_surat_baca on kop_surat
    for select to authenticated using (true);

drop policy if exists kop_surat_ubah on kop_surat;
create policy kop_surat_ubah on kop_surat
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));


-- ------------------------------------------------------------
-- Hanya satu yang boleh jadi bawaan.
--
-- Dijaga database, bukan aplikasi: dua kop bawaan membuat pilihan
-- berkas PDF bergantung pada baris mana yang kebetulan terbaca
-- lebih dulu, dan itu berubah-ubah tanpa sebab yang kelihatan.
-- ------------------------------------------------------------
create unique index if not exists idx_kop_bawaan
    on kop_surat (bawaan) where bawaan;


-- ============================================================
-- CEK
-- ============================================================
select id, nama, bawaan, aktif from kop_surat order by id;
