-- ============================================================
-- 03. KEAMANAN BARIS (RLS)
--
-- Aturan pokoknya:
--   - Semua anggota manbis boleh MELIHAT seluruh buku nomor.
--     Ini disengaja: semua perlu tahu urutan yang sedang berjalan.
--   - Mengambil nomor: siapa pun yang aktif, atas namanya sendiri.
--   - Mengoreksi: pemiliknya sendiri, atau Admin.
--   - Menghapus: tidak ada, untuk siapa pun. Yang ada hanya batal.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table pengaturan_sistem enable row level security;
alter table pengguna          enable row level security;
alter table jenis_dokumen     enable row level security;
alter table nomor             enable row level security;
alter table riwayat_nomor     enable row level security;


-- ------------------------------------------------------------
-- Pengaturan sistem — semua boleh baca, hanya Admin boleh ubah.
-- ------------------------------------------------------------
drop policy if exists pengaturan_baca on pengaturan_sistem;
create policy pengaturan_baca on pengaturan_sistem
    for select to authenticated using (true);

drop policy if exists pengaturan_ubah on pengaturan_sistem;
create policy pengaturan_ubah on pengaturan_sistem
    for update to authenticated
    using (peran_saya() = 'Admin')
    with check (peran_saya() = 'Admin');


-- ------------------------------------------------------------
-- Pengguna — semua boleh baca (untuk menampilkan nama pengambil),
-- hanya Admin boleh menambah, mengubah, atau menonaktifkan.
-- ------------------------------------------------------------
drop policy if exists pengguna_baca on pengguna;
create policy pengguna_baca on pengguna
    for select to authenticated using (true);

drop policy if exists pengguna_tambah on pengguna;
create policy pengguna_tambah on pengguna
    for insert to authenticated
    with check (peran_saya() = 'Admin');

drop policy if exists pengguna_ubah on pengguna;
create policy pengguna_ubah on pengguna
    for update to authenticated
    using (peran_saya() = 'Admin')
    with check (peran_saya() = 'Admin');

-- Tidak ada kebijakan hapus: pengguna yang sudah tidak di manbis
-- dinonaktifkan (aktif = false), bukan dihapus, supaya nomor yang
-- pernah diambilnya tetap punya nama.


-- ------------------------------------------------------------
-- Jenis dokumen — semua boleh baca, hanya Admin boleh mengatur.
-- ------------------------------------------------------------
drop policy if exists jenis_baca on jenis_dokumen;
create policy jenis_baca on jenis_dokumen
    for select to authenticated using (true);

drop policy if exists jenis_tambah on jenis_dokumen;
create policy jenis_tambah on jenis_dokumen
    for insert to authenticated
    with check (peran_saya() = 'Admin');

drop policy if exists jenis_ubah on jenis_dokumen;
create policy jenis_ubah on jenis_dokumen
    for update to authenticated
    using (peran_saya() = 'Admin')
    with check (peran_saya() = 'Admin');


-- ------------------------------------------------------------
-- Buku nomor.
-- ------------------------------------------------------------
drop policy if exists nomor_baca on nomor;
create policy nomor_baca on nomor
    for select to authenticated using (true);

-- Mengambil nomor hanya atas nama sendiri. Kolom diambil_oleh
-- tidak bisa diisi nama orang lain, walau permintaannya dibuat
-- langsung ke database.
drop policy if exists nomor_ambil on nomor;
create policy nomor_ambil on nomor
    for insert to authenticated
    with check (
        id_saya() is not null
        and diambil_oleh = id_saya()
    );

-- Mengoreksi perihal, tujuan, tanggal, atau berkas.
-- Pemiliknya sendiri, atau Admin untuk nomor siapa pun.
drop policy if exists nomor_koreksi on nomor;
create policy nomor_koreksi on nomor
    for update to authenticated
    using (peran_saya() = 'Admin' or diambil_oleh = id_saya())
    with check (peran_saya() = 'Admin' or diambil_oleh = id_saya());

-- Tidak ada kebijakan hapus sama sekali. Dengan RLS menyala,
-- tidak adanya kebijakan berarti tertutup untuk semua orang —
-- termasuk Admin. Pembatalan lewat fungsi batalkan_nomor().


-- ------------------------------------------------------------
-- Riwayat — boleh dibaca semua, ditulis hanya oleh fungsi.
-- ------------------------------------------------------------
drop policy if exists riwayat_baca on riwayat_nomor;
create policy riwayat_baca on riwayat_nomor
    for select to authenticated using (true);

-- Tidak ada kebijakan tulis: riwayat hanya diisi oleh fungsi
-- batalkan_nomor() yang berjalan dengan hak pemilik.


-- ============================================================
-- CEK — memperlihatkan kebijakan yang terpasang di tiap tabel.
-- ============================================================
select tablename as tabel, policyname as kebijakan, cmd as untuk
  from pg_policies
 where schemaname = 'public'
 order by tablename, policyname;
