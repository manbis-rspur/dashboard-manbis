-- ============================================================
-- 35. HARI LIBUR
--
-- Supaya pengingat tugas tidak datang pada hari orang tidak bekerja.
--
-- Diisi sendiri, bukan diambil dari layanan kalender di luar.
-- Layanan gratis semacam itu bisa mati diam-diam, dan kalau mati,
-- pengingatnya ikut salah tanpa ada yang menyadari — persis jenis
-- kegagalan yang paling mahal: yang tidak bersuara.
--
-- Lagi pula tabel sendiri memuat hal yang tidak ada di kalender mana
-- pun: cuti bersama yang baru diumumkan, dan hari khusus rumah sakit.
--
-- Sabtu dan Minggu tidak perlu didaftarkan; keduanya sudah dianggap
-- libur oleh aplikasinya.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

create table if not exists hari_libur (
    tanggal     date primary key,
    keterangan  text not null,
    jenis       text not null default 'Nasional',
    dibuat_oleh bigint references pengguna(id),
    dibuat_pada timestamptz not null default now(),

    constraint hari_libur_keterangan_ada check (btrim(keterangan) <> ''),
    constraint hari_libur_jenis_check
        check (jenis in ('Nasional', 'Cuti Bersama', 'Khusus RSPUR'))
);

alter table hari_libur enable row level security;


-- ------------------------------------------------------------
-- Siapa boleh apa.
--
-- Dibaca semua anggota — tanggal libur bukan rahasia, dan halaman
-- lain nanti perlu tahu hari mana yang tidak dihitung. Diubah hanya
-- oleh Koordinator: kalender unit satu, dan kalau siapa saja boleh
-- menambah, akan ada hari libur yang cuma diketahui satu orang.
-- ------------------------------------------------------------
drop policy if exists libur_baca on hari_libur;
create policy libur_baca on hari_libur
    for select to authenticated using (id_saya() is not null);

drop policy if exists libur_atur on hari_libur;
create policy libur_atur on hari_libur
    for all to authenticated
    using (punya_izin('tugas_unit') or peran_saya() = 'Admin')
    with check (punya_izin('tugas_unit') or peran_saya() = 'Admin');


-- ============================================================
-- CEK
-- ============================================================
select coalesce(to_char(tanggal, 'DD Mon YYYY'), '-') as tanggal,
       jenis, keterangan
  from hari_libur
 order by tanggal;
