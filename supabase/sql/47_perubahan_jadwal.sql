-- ============================================================
-- 47. PERUBAHAN JADWAL DOKTER YANG BELUM DITERAPKAN
--
-- Perubahan jadwal dadakan sering datang malam hari atau di hari
-- libur, saat yang memegang admin situs sedang di rumah. Tiga hal
-- yang gagal di situ, dan hanya satu di antaranya soal menekan
-- tombol:
--
--   1. Lupa persisnya apa yang harus diubah — dokter siapa, hari
--      apa, dari jam berapa jadi jam berapa.
--   2. Lupa sama sekali bahwa ada yang harus diubah, karena niatnya
--      lewat semalam.
--   3. Tidak tahu apakah yang kemarin diubah benar-benar tersimpan.
--
-- Tabel ini mencatat niat perubahannya. Ia BUKAN jadwal yang
-- berlaku — jadwal yang berlaku tetap yang ada di rspur.co.id, dan
-- daftar dokter di sini tetap ditarik dari sana tiap pagi. Kalau
-- catatan ini dianggap jadwal, akan ada dua sumber kebenaran yang
-- diam-diam berbeda isinya, dan itu justru lebih berbahaya
-- daripada lupa.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

create table if not exists perubahan_jadwal (
    id            bigserial primary key,

    -- Nama disimpan apa adanya, bukan cuma nomor dokternya. Dokter
    -- yang namanya tidak ketemu di daftar tetap boleh dicatat —
    -- yang penting niatnya tidak hilang — dan nomornya menyusul
    -- bila nanti cocok.
    dokter_id     bigint references dokter(id) on delete set null,
    dokter_nama   text    not null,
    poliklinik    text,

    aksi          text    not null,
    hari          smallint,
    jam_lama      text,
    jam_baru      text,

    -- Kalimat aslinya disimpan utuh. Bila pembacaannya keliru,
    -- yang memeriksa masih bisa tahu apa yang sebenarnya diminta.
    instruksi     text    not null,

    status        text    not null default 'Menunggu',
    dicatat_oleh  bigint  not null references pengguna(id),
    dicatat_pada  timestamptz not null default now(),
    diperiksa_pada timestamptz,
    selesai_pada  timestamptz,

    constraint perubahan_nama_ada check (btrim(dokter_nama) <> ''),
    constraint perubahan_aksi_check check (aksi in ('tambah', 'ubah', 'hapus', 'catatan')),
    constraint perubahan_hari_wajar check (hari is null or hari between 1 and 7),
    constraint perubahan_status_check check (status in ('Menunggu', 'Selesai', 'Batal'))
);

create index if not exists idx_perubahan_jadwal
    on perubahan_jadwal(status, dicatat_pada desc);


alter table perubahan_jadwal enable row level security;

-- Yang mengurus jadwal dokter adalah Humas dan Digital Marketing,
-- sama seperti yang mengurus daftar dokternya.
drop policy if exists perubahan_jadwal_kelola on perubahan_jadwal;
create policy perubahan_jadwal_kelola on perubahan_jadwal
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));


-- ============================================================
-- CEK
-- ============================================================
select status, count(*) from perubahan_jadwal group by status;
