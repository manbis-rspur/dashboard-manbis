-- ============================================================
-- 28. TUGAS HARIAN — TAHAP 1
--
-- Menjawab tiga hal yang selama ini tercecer: pekerjaan yang tidak
-- pernah tertulis di mana pun, pekerjaan titipan yang tenggelam di
-- pesan WhatsApp, dan tidak adanya satu tempat yang menjawab
-- "pagi ini saya harus apa".
--
-- Tahap ini hanya tugas yang ditulis satu per satu. Tugas rutin
-- yang muncul sendiri tiap minggu atau tiap bulan menyusul di
-- berkas berikutnya — dan itulah sebabnya kolom rutin_id belum ada
-- di sini: ditambahkan nanti bersama tabel cetakannya, bukan
-- disiapkan sekarang sebagai kolom kosong yang belum jelas
-- bentuknya.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Tabel tugas.
--
-- 'untuk' dan 'dibuat_oleh' dipisah sejak awal walaupun tahap ini
-- keduanya selalu sama. Koordinator akan menitipkan tugas kepada
-- anggota pada tahap berikutnya, dan memisahkannya belakangan
-- berarti membongkar baris yang sudah terlanjur ada.
--
-- Status sengaja sedikit. Tiga yang dipakai sehari-hari, dua untuk
-- keadaan yang jarang: Ditunda bagi yang tertahan sesuatu, Batal
-- bagi yang batal dikerjakan — supaya tidak ada yang menandai
-- "Selesai" padahal tidak dikerjakan, hanya karena tidak ada
-- pilihan lain.
-- ------------------------------------------------------------
create table if not exists tugas (
    id            bigserial primary key,
    untuk         bigint not null references pengguna(id) on delete cascade,
    judul         text   not null,
    keterangan    text,
    tanggal_mulai date   not null default current_date,
    tenggat       date,
    prioritas     text   not null default 'Sedang',
    status        text   not null default 'Belum',
    catatan_hasil text,
    selesai_pada  timestamptz,
    dibuat_oleh   bigint not null references pengguna(id),
    dibuat_pada   timestamptz not null default now(),
    diubah_pada   timestamptz,

    constraint tugas_judul_tidak_kosong check (btrim(judul) <> ''),
    constraint tugas_prioritas_check check (prioritas in ('Rendah','Sedang','Tinggi')),
    constraint tugas_status_check
        check (status in ('Belum','Dikerjakan','Selesai','Ditunda','Batal')),
    -- Tenggat sebelum tanggal mulai hampir selalu salah ketik.
    constraint tugas_tenggat_wajar check (tenggat is null or tenggat >= tanggal_mulai)
);

create index if not exists idx_tugas_untuk   on tugas(untuk, status);
create index if not exists idx_tugas_tenggat on tugas(tenggat)
    where status not in ('Selesai','Batal');

alter table tugas enable row level security;


-- ------------------------------------------------------------
-- (2) Penanda waktu selesai.
--
-- Diisi database, bukan aplikasi: kapan sebuah pekerjaan dinyatakan
-- selesai adalah catatan yang akan dibaca Koordinator, dan tidak
-- seharusnya bergantung pada jam komputer siapa yang menekan
-- tombolnya. Dinolkan lagi kalau statusnya dibuka kembali.
-- ------------------------------------------------------------
create or replace function tandai_waktu_tugas()
returns trigger
language plpgsql
as $tandai$
begin
    new.diubah_pada := now();

    if new.status = 'Selesai' and coalesce(old.status, '') <> 'Selesai' then
        new.selesai_pada := now();
    elsif new.status <> 'Selesai' then
        new.selesai_pada := null;
    end if;

    return new;
end
$tandai$;

drop trigger if exists trg_waktu_tugas on tugas;
create trigger trg_waktu_tugas
    before update on tugas
    for each row execute function tandai_waktu_tugas();


-- ------------------------------------------------------------
-- (3) Izin melihat papan tugas seluruh unit.
--
-- Izin tersendiri, bukan menumpang peran Admin: yang perlu melihat
-- pekerjaan seluruh anggota adalah Koordinator, dan Koordinator
-- bukan Admin sistem. Halamannya sendiri menyusul di tahap tiga —
-- izinnya dipasang sekarang supaya aturan tabelnya sudah benar
-- sejak baris pertama masuk.
-- ------------------------------------------------------------
insert into akses_modul (pengguna_id, modul)
select id, 'tugas_unit' from pengguna where jabatan ilike '%koordinator%'
on conflict do nothing;


-- ------------------------------------------------------------
-- (4) Siapa boleh apa.
--
-- Daftar tugas seseorang hanya dilihat dirinya sendiri dan
-- Koordinator. Di unit sebesar ini, daftar yang bisa dibaca semua
-- orang membuat orang sungkan — dan yang sungkan menulis tugasnya
-- seadanya, sehingga alatnya kehilangan gunanya.
-- ------------------------------------------------------------
drop policy if exists tugas_baca on tugas;
create policy tugas_baca on tugas
    for select to authenticated
    using (untuk = id_saya() or boleh_akses('tugas_unit'));

drop policy if exists tugas_tambah on tugas;
create policy tugas_tambah on tugas
    for insert to authenticated
    with check (
        dibuat_oleh = id_saya()
        and (untuk = id_saya() or boleh_akses('tugas_unit'))
    );

drop policy if exists tugas_ubah on tugas;
create policy tugas_ubah on tugas
    for update to authenticated
    using (untuk = id_saya() or boleh_akses('tugas_unit'))
    with check (untuk = id_saya() or boleh_akses('tugas_unit'));

-- Menghapus hanya untuk yang salah tulis. Yang sudah dikerjakan lalu
-- dibatalkan sebaiknya ditandai 'Batal', bukan dilenyapkan — jejaknya
-- masih berguna saat menyusun laporan bulanan.
drop policy if exists tugas_hapus on tugas;
create policy tugas_hapus on tugas
    for delete to authenticated
    using (untuk = id_saya() or boleh_akses('tugas_unit'));


-- ============================================================
-- CEK
-- ============================================================
select p.nama, p.jabatan,
       case when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'tugas_unit')
            then 'bisa melihat papan tugas seluruh unit'
            else 'hanya tugasnya sendiri' end as papan_tugas
  from pengguna p order by p.id;
