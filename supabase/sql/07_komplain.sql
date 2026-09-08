-- ============================================================
-- 07. KOMPLAIN PASIEN
--
-- Pindahan dari E-Komplain yang sebelumnya berjalan di Google
-- Apps Script. Tiga hal sengaja diubah, bukan disalin apa adanya:
--
--   1. Dulu semua petugas memakai SATU kata sandi bersama yang
--      tertulis di dalam kode. Di sini tidak ada kata sandi modul:
--      yang berhak masuk adalah akun orangnya sendiri, dan setiap
--      tindakan tercatat atas nama orang itu — bukan "Petugas".
--
--   2. Nomor komplain dulu diambil dari jumlah baris spreadsheet,
--      sehingga urutannya tidak benar-benar per hari. Di sini
--      urutannya per tanggal dan dikunci saat diambil, sama seperti
--      penomoran surat.
--
--   3. Isinya data kesehatan — nama pasien, nomor rekam medis,
--      alamat, keluhan. Karena itu tabelnya tertutup rapat di
--      tingkat database: anggota manbis yang tidak diberi izin
--      tidak bisa membacanya sama sekali, bukan sekadar menunya
--      disembunyikan.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Izin per modul.
--
-- Dibuat sebagai tabel, bukan kolom "boleh_komplain" di tabel
-- pengguna, karena modul berikutnya sudah pasti menyusul. Dengan
-- begini menambah modul tidak perlu mengubah bentuk tabel.
--
-- Admin tidak perlu didaftarkan: ia selalu berhak.
-- ------------------------------------------------------------
create table if not exists akses_modul (
    pengguna_id bigint not null references pengguna(id) on delete cascade,
    modul       text   not null,
    diberi_pada timestamptz not null default now(),
    primary key (pengguna_id, modul)
);

alter table akses_modul enable row level security;

drop policy if exists akses_baca on akses_modul;
create policy akses_baca on akses_modul
    for select to authenticated using (id_saya() is not null);

drop policy if exists akses_atur on akses_modul;
create policy akses_atur on akses_modul
    for all to authenticated
    using (peran_saya() = 'Admin')
    with check (peran_saya() = 'Admin');


create or replace function boleh_akses(p_modul text)
returns boolean
language sql
stable
security definer
set search_path = public
as $boleh$
    select exists (
        select 1
          from pengguna p
         where p.auth_user_id = auth.uid()
           and p.aktif
           and (
                p.peran = 'Admin'
             or exists (select 1 from akses_modul a
                         where a.pengguna_id = p.id and a.modul = p_modul)
           )
    );
$boleh$;

grant execute on function boleh_akses(text) to authenticated;

-- Humas diberi izin sejak awal; sisanya diatur Koordinator lewat
-- menu Pengguna.
insert into akses_modul (pengguna_id, modul)
select p.id, 'komplain' from pengguna p where p.jabatan = 'Humas'
on conflict do nothing;


-- ------------------------------------------------------------
-- (2) Hitungan nomor komplain, per tanggal.
-- ------------------------------------------------------------
create table if not exists nomor_urut_komplain (
    tanggal         date    not null primary key,
    urutan_terakhir integer not null default 0
);

alter table nomor_urut_komplain enable row level security;
-- Tanpa kebijakan apa pun: hanya fungsi di bawah yang menyentuhnya.


-- ------------------------------------------------------------
-- (3) Tabel komplain.
--
-- Bagian atas diisi saat komplain dicatat; bagian bawah menyusul
-- saat ditindaklanjuti, jadi hampir semuanya boleh kosong.
-- ------------------------------------------------------------
create table if not exists komplain (
    id                  bigserial primary key,
    kode                text not null unique,
    waktu_pelaporan     timestamptz not null default now(),

    pelapor_nama        text not null,
    pelapor_hp          text not null,
    pelapor_alamat      text,

    pasien_nama         text not null,
    pasien_tgl_lahir    date,
    pasien_no_rm        text,
    pasien_hp           text,
    pasien_alamat       text,

    jalur_pelaporan     text not null,
    media_pelaporan     text not null,
    kategori_masalah    text not null,
    sumber_pelaporan    text not null,
    detail_masalah      text not null,
    kepuasan_awal       text,

    penerima_nama       text,
    penerima_unit       text,
    penerima_jabatan    text,
    waktu_ditanggapi    timestamptz,
    jawaban             text,
    hasil_penyelesaian  text,
    status              text not null default 'Baru',
    grading             text,
    kepuasan_penanganan text,
    evaluasi            text,

    perlu_eskalasi      boolean not null default false,
    jenis_komite        text,
    tgl_lapor_komite    date,

    sla_jam             numeric(6,1),
    sla_status          text,

    dicatat_oleh        bigint not null references pengguna(id),
    dibuat_pada         timestamptz not null default now(),
    diubah_pada         timestamptz,

    constraint komplain_status_check  check (status in ('Baru','Diproses','Selesai')),
    constraint komplain_grading_check check (grading is null or grading in ('Hijau','Kuning','Merah')),
    constraint komplain_sla_check     check (sla_status is null or sla_status in ('Met','Breach'))
);

create index if not exists idx_komplain_waktu  on komplain(waktu_pelaporan desc);
create index if not exists idx_komplain_status on komplain(status);
create index if not exists idx_komplain_rm     on komplain(pasien_no_rm);

alter table komplain enable row level security;


-- ------------------------------------------------------------
-- (4) Riwayat aktivitas — pengganti AuditTrail.
-- ------------------------------------------------------------
create table if not exists komplain_riwayat (
    id          bigserial primary key,
    komplain_id bigint not null references komplain(id) on delete cascade,
    aktivitas   text   not null,
    detail      text,
    oleh        bigint references pengguna(id),
    pada        timestamptz not null default now()
);

create index if not exists idx_komplain_riwayat on komplain_riwayat(komplain_id, pada desc);

alter table komplain_riwayat enable row level security;


-- ------------------------------------------------------------
-- (5) Siapa boleh apa.
--
-- Semuanya bergantung pada satu syarat: boleh_akses('komplain').
-- Anggota lain tidak akan melihat satu baris pun, sekalipun
-- bertanya langsung ke database.
--
-- Tidak ada kebijakan hapus untuk siapa pun, termasuk Admin.
-- Komplain yang keliru ditandai lewat statusnya, bukan dilenyapkan.
-- ------------------------------------------------------------
drop policy if exists komplain_baca on komplain;
create policy komplain_baca on komplain
    for select to authenticated using (boleh_akses('komplain'));

drop policy if exists komplain_catat on komplain;
create policy komplain_catat on komplain
    for insert to authenticated
    with check (boleh_akses('komplain') and dicatat_oleh = id_saya());

drop policy if exists komplain_ubah on komplain;
create policy komplain_ubah on komplain
    for update to authenticated
    using (boleh_akses('komplain'))
    with check (boleh_akses('komplain'));

drop policy if exists komplain_riwayat_baca on komplain_riwayat;
create policy komplain_riwayat_baca on komplain_riwayat
    for select to authenticated using (boleh_akses('komplain'));

drop policy if exists komplain_riwayat_tulis on komplain_riwayat;
create policy komplain_riwayat_tulis on komplain_riwayat
    for insert to authenticated
    with check (boleh_akses('komplain') and oleh = id_saya());


-- ------------------------------------------------------------
-- (6) Nomor komplain: KMP-20260908-0001
--
-- Urutannya per tanggal dan dikunci saat diambil, jadi dua orang
-- yang mencatat bersamaan tidak mungkin dapat nomor yang sama.
-- ------------------------------------------------------------
create or replace function isi_kode_komplain()
returns trigger
language plpgsql
security definer
set search_path = public
as $kode$
declare
    v_tanggal date := (coalesce(new.waktu_pelaporan, now()) at time zone 'Asia/Jakarta')::date;
    v_urut    integer;
begin
    if new.kode is not null and btrim(new.kode) <> '' then
        return new;
    end if;

    insert into nomor_urut_komplain (tanggal, urutan_terakhir)
    values (v_tanggal, 1)
    on conflict (tanggal)
    do update set urutan_terakhir = nomor_urut_komplain.urutan_terakhir + 1
    returning urutan_terakhir into v_urut;

    new.kode := 'KMP-' || to_char(v_tanggal, 'YYYYMMDD') || '-' || lpad(v_urut::text, 4, '0');
    return new;
end
$kode$;

drop trigger if exists trg_kode_komplain on komplain;
create trigger trg_kode_komplain
    before insert on komplain
    for each row execute function isi_kode_komplain();


-- ------------------------------------------------------------
-- (7) Perhitungan SLA.
--
-- Dihitung di database, bukan di aplikasi, supaya angkanya tidak
-- bisa berbeda-beda tergantung jam komputer siapa yang dipakai.
-- Ambangnya 24 jam, sama seperti sistem lama.
-- ------------------------------------------------------------
create or replace function hitung_sla_komplain()
returns trigger
language plpgsql
as $sla$
begin
    new.diubah_pada := now();

    if new.waktu_ditanggapi is not null then
        new.sla_jam := round(
            extract(epoch from (new.waktu_ditanggapi - new.waktu_pelaporan)) / 3600.0, 1);
        new.sla_status := case when new.sla_jam <= 24 then 'Met' else 'Breach' end;
    end if;

    return new;
end
$sla$;

drop trigger if exists trg_sla_komplain on komplain;
create trigger trg_sla_komplain
    before update on komplain
    for each row execute function hitung_sla_komplain();


-- ============================================================
-- CEK — siapa yang berhak membuka modul komplain.
-- ============================================================
select p.nama,
       p.jabatan,
       p.peran,
       case when p.peran = 'Admin' then 'berhak (Admin)'
            when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'komplain')
                 then 'berhak (diberi izin)'
            else 'tidak berhak'
       end as akses_komplain
  from pengguna p
 order by p.id;
