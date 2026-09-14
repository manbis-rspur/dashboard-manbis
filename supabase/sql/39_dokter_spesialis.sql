-- ============================================================
-- 39. DAFTAR DOKTER SPESIALIS
--
-- Supaya kalender konten yang disusun AI bisa menyebut nama dokter
-- yang benar-benar ada, dan yang sesuai dengan tema kampanyenya.
--
-- Selama ini nama dokter hanya ada di berkas Excel di komputer.
-- Akibatnya AI tidak punya cara mengetahuinya, dan kalau dipaksa
-- menyebut nama, ia akan mengarang — yang untuk sebuah rumah sakit
-- jauh lebih buruk daripada tidak menyebut nama sama sekali.
--
-- Jadwalnya ditaruh di tabel terpisah, bukan tujuh kolom di baris
-- dokter. Seorang dokter bisa praktik dua sesi dalam satu hari
-- (contohnya dr. Nora, pagi dan sore), dan bentuk tujuh kolom tidak
-- punya tempat untuk sesi kedua.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Dokter.
-- ------------------------------------------------------------
create table if not exists dokter (
    id          bigserial primary key,
    poliklinik  text    not null,
    nama        text    not null,

    -- Dokter yang sedang tutup, cuti, atau izin praktiknya belum
    -- terbit tetap disimpan, hanya dipadamkan. Menghapusnya berarti
    -- mengetik ulang seluruh jadwalnya saat ia kembali.
    aktif       boolean not null default true,
    catatan     text,

    urutan      integer not null default 0,
    diubah_pada timestamptz not null default now(),

    constraint dokter_nama_ada check (btrim(nama) <> ''),
    constraint dokter_poli_ada check (btrim(poliklinik) <> ''),
    constraint dokter_unik unique (poliklinik, nama)
);

create index if not exists idx_dokter on dokter(poliklinik, urutan, nama);

alter table dokter enable row level security;


-- ------------------------------------------------------------
-- (2) Jadwal praktik. Satu baris satu sesi.
--
-- hari: 1 = Senin ... 7 = Minggu.
-- ------------------------------------------------------------
create table if not exists dokter_jadwal (
    id        bigserial primary key,
    dokter_id bigint   not null references dokter(id) on delete cascade,
    hari      smallint not null,
    jam       text     not null,

    constraint dokter_jadwal_hari check (hari between 1 and 7),
    constraint dokter_jadwal_jam_ada check (btrim(jam) <> '')
);

create index if not exists idx_dokter_jadwal on dokter_jadwal(dokter_id, hari);

alter table dokter_jadwal enable row level security;


-- ------------------------------------------------------------
-- (3) Siapa boleh apa.
--
-- Dibaca siapa saja yang sudah masuk — daftar dokter memang bahan
-- terbuka, sama seperti yang tertempel di lobi. Yang mengubah hanya
-- pemegang izin 'humas': merekalah yang menerima jadwal terbaru
-- dari bagian pelayanan.
-- ------------------------------------------------------------
drop policy if exists dokter_baca on dokter;
create policy dokter_baca on dokter
    for select to authenticated using (true);

drop policy if exists dokter_ubah on dokter;
create policy dokter_ubah on dokter
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));

drop policy if exists dokter_jadwal_baca on dokter_jadwal;
create policy dokter_jadwal_baca on dokter_jadwal
    for select to authenticated using (true);

drop policy if exists dokter_jadwal_ubah on dokter_jadwal;
create policy dokter_jadwal_ubah on dokter_jadwal
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));


-- ------------------------------------------------------------
-- (4) Modul mana yang perlu tahu daftar dokter.
--
-- Bukan semuanya. Modul balasan komplain tidak ada urusannya
-- dengan jadwal praktik, dan menyisipkan seratus nama ke dalam
-- perintahnya hanya membuat AI salah fokus.
-- ------------------------------------------------------------
alter table modul_ai
    add column if not exists pakai_dokter boolean not null default false;

update modul_ai set pakai_dokter = true
 where judul ilike '%kalender konten%';


-- ============================================================
-- CEK
-- ============================================================
select judul, pakai_dokter from modul_ai order by urutan, id;
