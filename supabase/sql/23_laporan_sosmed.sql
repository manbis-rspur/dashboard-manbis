-- ============================================================
-- 23. LAPORAN BULANAN MEDIA SOSIAL
--
-- Dipakai di dashboard Humas & Digital Marketing, khusus akun
-- Digital Marketing. Hasilnya diunduh, lalu diunggah manual ke
-- Arsip Publikasi di Dashboard Manajemen Bisnis.
--
-- Dua tabel, bukan satu: angka tingkat akun disimpan di baris
-- laporannya, sedangkan tiap konten punya barisnya sendiri. Kalau
-- konten dijejalkan ke dalam satu kolom, tidak ada cara menghitung
-- apa pun darinya — padahal justru per-konten itulah yang menjawab
-- pertanyaan mana yang berbayar dan mana yang tidak.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Laporan bulanan.
--
-- 'angka' menyimpan capaian tingkat akun per platform — pengikut,
-- jangkauan, tayangan, dan seterusnya. Disimpan sebagai jsonb
-- karena daftar ukurannya berubah mengikuti apa yang disediakan
-- Instagram dan TikTok dari waktu ke waktu.
-- ------------------------------------------------------------
create table if not exists laporan_sosmed (
    id           bigserial primary key,
    bulan        integer not null,
    tahun        integer not null,
    akun         text    not null default '@rspurosnati',
    angka        jsonb   not null default '{}'::jsonb,
    catatan      text,
    hasil        text,
    disusun_pada timestamptz,
    dibuat_oleh  bigint  not null references pengguna(id),
    dibuat_pada  timestamptz not null default now(),
    diubah_pada  timestamptz,
    constraint laporan_bulan_wajar check (bulan between 1 and 12),
    constraint laporan_sekali_sebulan unique (bulan, tahun)
);

alter table laporan_sosmed enable row level security;


-- ------------------------------------------------------------
-- (2) Konten yang terbit pada bulan itu.
--
-- 'ada_ads' dan 'biaya_ads' dipisah dari angka capaian karena
-- itulah yang membedakan konten yang naik sendiri dari yang naik
-- karena dibayar. Tanpa pemisahan itu, kesimpulan apa pun tentang
-- konten mana yang berhasil akan menyesatkan.
--
-- 'funnel' menandai tahap perjalanan penonton: TOFU mengenalkan,
-- MOFU mempertimbangkan, BOFU mengajak bertindak.
-- ------------------------------------------------------------
create table if not exists laporan_konten (
    id           bigserial primary key,
    laporan_id   bigint  not null references laporan_sosmed(id) on delete cascade,
    tanggal      date,
    platform     text    not null default 'Instagram',
    judul        text    not null,
    format       text,
    funnel       text,
    tayangan     integer not null default 0,
    jangkauan    integer not null default 0,
    suka         integer not null default 0,
    komentar     integer not null default 0,
    dibagikan    integer not null default 0,
    disimpan     integer not null default 0,
    ada_ads      boolean not null default false,
    biaya_ads    integer not null default 0,
    catatan      text,
    urutan       integer not null default 0,
    constraint konten_platform_check check (platform in ('Instagram','TikTok')),
    constraint konten_funnel_check check (funnel is null or funnel in ('TOFU','MOFU','BOFU'))
);

create index if not exists idx_laporan_konten on laporan_konten(laporan_id, urutan, id);

alter table laporan_konten enable row level security;


-- ------------------------------------------------------------
-- (3) Siapa boleh apa.
--
-- Hanya pemegang izin 'sosmed'. Sengaja izin tersendiri, bukan
-- menumpang izin 'humas': laporan ini khusus Digital Marketing,
-- sedangkan izin humas juga dipegang Humas.
-- ------------------------------------------------------------
drop policy if exists laporan_baca on laporan_sosmed;
create policy laporan_baca on laporan_sosmed
    for select to authenticated using (boleh_akses('sosmed'));

drop policy if exists laporan_tulis on laporan_sosmed;
create policy laporan_tulis on laporan_sosmed
    for all to authenticated
    using (boleh_akses('sosmed')) with check (boleh_akses('sosmed'));

drop policy if exists konten_baca on laporan_konten;
create policy konten_baca on laporan_konten
    for select to authenticated using (boleh_akses('sosmed'));

drop policy if exists konten_tulis on laporan_konten;
create policy konten_tulis on laporan_konten
    for all to authenticated
    using (boleh_akses('sosmed')) with check (boleh_akses('sosmed'));


-- ------------------------------------------------------------
-- (4) Izin awal: Digital Marketing.
-- ------------------------------------------------------------
insert into akses_modul (pengguna_id, modul)
select id, 'sosmed' from pengguna where jabatan = 'Digital Marketing'
on conflict do nothing;


-- ============================================================
-- CEK
-- ============================================================
select p.nama, p.jabatan,
       case when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'sosmed')
            then 'berhak menyusun laporan media sosial'
            else '-' end as laporan_sosmed
  from pengguna p order by p.id;
