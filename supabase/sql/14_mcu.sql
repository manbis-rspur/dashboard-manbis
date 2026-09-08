-- ============================================================
-- 14. KALKULATOR MCU DAN PENAWARAN
--
-- Pindahan dari Kalkulator MCU PRO yang sebelumnya berjalan di
-- Google Apps Script. Empat hal sengaja diubah, bukan disalin:
--
--   1. PPN tidak lagi dihitung sebagai pendapatan. Di versi lama,
--      margin dan pendapatan dihitung dari harga yang SUDAH
--      termasuk PPN — padahal PPN titipan untuk negara, bukan
--      penerimaan rumah sakit. Akibatnya laba terlihat lebih besar
--      dari yang sebenarnya, persis sebesar PPN-nya.
--
--   2. Tarif PPN jadi pengaturan, bukan angka mati di dalam kode.
--      Tarif pajak berubah dari waktu ke waktu.
--
--   3. Tiap penawaran menyimpan SALINAN harga saat itu. Di versi
--      lama tarif ditimpa begitu diubah, sehingga penawaran yang
--      sudah terlanjur dikirim ikut berubah angkanya — padahal
--      dokumen yang sudah keluar tidak boleh berubah.
--
--   4. Nomor surat penawaran diambil dari buku nomor manbis, bukan
--      diketik sendiri. Dengan begitu penawaran tercatat di buku
--      yang sama dengan surat keluar lainnya, dan tidak mungkin
--      kembar.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Tarif PPN sebagai pengaturan.
-- ------------------------------------------------------------
alter table pengaturan_sistem
    add column if not exists ppn_persen numeric(5,2) not null default 11;


-- ------------------------------------------------------------
-- (2) Daftar pemeriksaan beserta tarif dan biayanya.
--
-- 'cost' adalah biaya yang benar-benar keluar untuk satu
-- pemeriksaan — bahan, jasa, sewa alat. Selisihnya dengan tarif
-- itulah yang jadi laba.
-- ------------------------------------------------------------
create table if not exists mcu_item (
    id          bigserial primary key,
    nama        text    not null,
    tarif       integer not null default 0,
    cost        integer not null default 0,
    aktif       boolean not null default true,
    urutan      integer not null default 100,
    diubah_pada timestamptz,
    diubah_oleh bigint references pengguna(id),
    constraint mcu_item_tarif_wajar check (tarif >= 0 and cost >= 0)
);

create index if not exists idx_mcu_item on mcu_item(aktif, urutan, id);
alter table mcu_item enable row level security;


-- ------------------------------------------------------------
-- (3) Paket siap pakai — kumpulan pemeriksaan yang sering dipakai
--     bersama, misalnya MCU Standar atau MCU Eksekutif.
-- ------------------------------------------------------------
create table if not exists mcu_paket (
    id          bigserial primary key,
    nama        text not null unique,
    item_id     jsonb not null default '[]'::jsonb,
    dibuat_oleh bigint references pengguna(id),
    dibuat_pada timestamptz not null default now()
);

alter table mcu_paket enable row level security;


-- ------------------------------------------------------------
-- (4) Penawaran.
--
-- Kolom 'rincian' menyimpan salinan pemeriksaan beserta tarif dan
-- biayanya PADA SAAT penawaran dibuat. Inilah yang membuat dokumen
-- lama tetap utuh walaupun daftar tarif berubah kemudian.
--
-- 'harga_paket' adalah harga yang ditawarkan untuk satu peserta,
-- SEBELUM PPN. Semua perhitungan lain diturunkan darinya.
-- ------------------------------------------------------------
create table if not exists mcu_penawaran (
    id               bigserial primary key,
    rekanan          text    not null,
    jenis_pemeriksaan text,
    jumlah_peserta   integer not null default 1,
    harga_paket      integer not null default 0,
    kena_ppn         boolean not null default true,
    ppn_persen       numeric(5,2) not null default 11,
    rincian          jsonb   not null default '[]'::jsonb,
    catatan          text,
    status           text    not null default 'Draf',
    -- Nomor surat diambil dari buku nomor manbis saat diterbitkan.
    nomor_id         bigint references nomor(id),
    tanggal_surat    date    not null default current_date,
    dibuat_oleh      bigint  not null references pengguna(id),
    dibuat_pada      timestamptz not null default now(),
    diubah_pada      timestamptz,
    constraint mcu_penawaran_status_check check (status in ('Draf','Terbit','Disetujui','Batal')),
    constraint mcu_penawaran_peserta_check check (jumlah_peserta >= 1)
);

create index if not exists idx_mcu_penawaran on mcu_penawaran(dibuat_pada desc);
alter table mcu_penawaran enable row level security;


-- ------------------------------------------------------------
-- (5) Siapa boleh apa. Semuanya bergantung pada izin 'mcu'.
--
-- Tidak ada kebijakan hapus untuk penawaran: yang keliru ditandai
-- Batal, tidak dilenyapkan. Dokumen yang menyangkut uang harus
-- bisa ditelusuri.
-- ------------------------------------------------------------
drop policy if exists mcu_item_baca on mcu_item;
create policy mcu_item_baca on mcu_item
    for select to authenticated using (boleh_akses('mcu'));

drop policy if exists mcu_item_atur on mcu_item;
create policy mcu_item_atur on mcu_item
    for all to authenticated
    using (boleh_akses('mcu')) with check (boleh_akses('mcu'));

drop policy if exists mcu_paket_baca on mcu_paket;
create policy mcu_paket_baca on mcu_paket
    for select to authenticated using (boleh_akses('mcu'));

drop policy if exists mcu_paket_atur on mcu_paket;
create policy mcu_paket_atur on mcu_paket
    for all to authenticated
    using (boleh_akses('mcu')) with check (boleh_akses('mcu'));

drop policy if exists mcu_penawaran_baca on mcu_penawaran;
create policy mcu_penawaran_baca on mcu_penawaran
    for select to authenticated using (boleh_akses('mcu'));

drop policy if exists mcu_penawaran_buat on mcu_penawaran;
create policy mcu_penawaran_buat on mcu_penawaran
    for insert to authenticated
    with check (boleh_akses('mcu') and dibuat_oleh = id_saya());

drop policy if exists mcu_penawaran_ubah on mcu_penawaran;
create policy mcu_penawaran_ubah on mcu_penawaran
    for update to authenticated
    using (boleh_akses('mcu')) with check (boleh_akses('mcu'));


-- ------------------------------------------------------------
-- (6) Izin awal: Marketing.
-- ------------------------------------------------------------
insert into akses_modul (pengguna_id, modul)
select id, 'mcu' from pengguna where jabatan = 'Marketing'
on conflict do nothing;


-- ------------------------------------------------------------
-- (7) Daftar pemeriksaan awal — diambil apa adanya dari sistem
--     lama, termasuk tarif dan biayanya.
-- ------------------------------------------------------------
insert into mcu_item (nama, tarif, cost, urutan)
select * from (values
    ('Pendaftaran',                          25000,   5000,  10),
    ('Pemeriksaan Fisik oleh Dokter Umum',   55000,  11000,  20),
    ('Darah lengkap',                        85000,  26500,  30),
    ('Urine lengkap',                        47000,   7000,  40),
    ('Gula darah',                           30000,   4200,  50),
    ('Ureum',                                40000,   4200,  60),
    ('Kreatinin',                            40000,   4200,  70),
    ('Asam Urat',                            45000,   4200,  80),
    ('SGOT',                                 38000,   4200,  90),
    ('SGPT',                                 38000,   4200, 100),
    ('Trigliserida',                         45000,   4200, 110),
    ('Total Cholesterol',                    45000,   6000, 120),
    ('HDL',                                  45000,   4200, 130),
    ('LDL',                                  55000,   4200, 140),
    ('Thoraks',                             180000, 108000, 150),
    ('EKG',                                 100000,  30000, 160),
    ('Treadmill',                           575000, 165000, 170),
    ('Test Narkoba 4 Parameter',            220000,  59000, 180),
    ('Jasa Medis Dokter Sp.KK',                  0,  25000, 190)
) as x(nama, tarif, cost, urutan)
where not exists (select 1 from mcu_item where mcu_item.nama = x.nama);


-- ============================================================
-- CEK — daftar pemeriksaan dan siapa yang berhak membukanya.
-- ============================================================
select count(*) as jumlah_pemeriksaan,
       sum(tarif) as total_tarif,
       sum(cost)  as total_biaya,
       sum(tarif) - sum(cost) as laba_bila_semua_diambil
  from mcu_item where aktif;

select p.nama, p.jabatan, p.peran,
       case when p.peran = 'Admin' then 'berhak (Admin)'
            when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'mcu')
                 then 'berhak'
            else 'tidak berhak' end as akses_mcu
  from pengguna p order by p.id;
