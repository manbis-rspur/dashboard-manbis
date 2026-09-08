-- ============================================================
-- 02. PENOMORAN
--
-- Bentuk nomor:
--   001/PUR-B0004/2026-S3   surat keluar
--   001/PUR-B0017/2026-S3   PKRS
--
--   001    urut  -> satu deret untuk seluruh manbis, per jenis
--                   dokumen, direset tiap Januari
--   PUR    kode RS         -> pengaturan_sistem.kode_rs
--   B0004  kode unit       -> jenis_dokumen.kode_unit
--   2026   tahun surat
--   S3     kode bidang     -> jenis_dokumen.sufiks
--
-- Surat keluar dan PKRS punya deret sendiri-sendiri, jadi
-- hitungannya disimpan per pasangan (jenis dokumen, tahun).
-- ============================================================


-- ------------------------------------------------------------
-- (1) Tempat menyimpan hitungan terakhir tiap jenis per tahun.
--
-- Dipisah dari tabel nomor supaya penambahan tetap benar walau
-- dua orang menekan "Ambil Nomor" pada detik yang sama.
-- ------------------------------------------------------------
create table if not exists nomor_urut (
    jenis_id        bigint  not null references jenis_dokumen(id) on delete cascade,
    tahun           integer not null,
    urutan_terakhir integer not null default 0,
    primary key (jenis_id, tahun)
);

alter table nomor_urut enable row level security;

-- Tabel ini tidak untuk dibaca atau diubah langsung oleh siapa pun.
-- Hanya fungsi di bawah (yang berjalan dengan hak pemilik) yang
-- menyentuhnya. Tanpa kebijakan apa pun, RLS menutup semuanya.


-- ------------------------------------------------------------
-- (2) Buku nomor.
--
-- Tidak ada penghapusan: nomor yang batal ditandai 'Batal' dan
-- tetap menempati urutannya, sehingga deret tidak pernah bolong.
-- ------------------------------------------------------------
create table if not exists nomor (
    id                bigserial primary key,
    jenis_id          bigint  not null references jenis_dokumen(id),
    tahun             integer not null,
    urutan            integer not null,
    nomor_lengkap     text    not null unique,
    tanggal_surat     date    not null default current_date,
    perihal           text    not null,
    ditujukan_kepada  text,
    catatan           text,
    berkas_path       text,
    status            text    not null default 'Terpakai',
    alasan_batal      text,
    diambil_oleh      bigint  not null references pengguna(id),
    diambil_pada      timestamptz not null default now(),
    diubah_pada       timestamptz,
    constraint nomor_status_check check (status in ('Terpakai','Batal')),
    constraint nomor_deret_unik unique (jenis_id, tahun, urutan)
);

create index if not exists idx_nomor_jenis_tahun on nomor(jenis_id, tahun, urutan);
create index if not exists idx_nomor_pengambil   on nomor(diambil_oleh);
create index if not exists idx_nomor_tanggal     on nomor(tanggal_surat);


-- ------------------------------------------------------------
-- (3) Riwayat perubahan. Setiap koreksi dan pembatalan tercatat.
-- ------------------------------------------------------------
create table if not exists riwayat_nomor (
    id           bigserial primary key,
    nomor_id     bigint not null references nomor(id) on delete cascade,
    pengguna_id  bigint references pengguna(id),
    aksi         text   not null,
    sebelum      jsonb,
    sesudah      jsonb,
    pada         timestamptz not null default now()
);

create index if not exists idx_riwayat_nomor on riwayat_nomor(nomor_id, pada desc);


-- ------------------------------------------------------------
-- (4) Mengambil urutan berikutnya untuk satu jenis di satu tahun.
--
-- Baris dikunci selama transaksi, jadi tidak mungkin dua orang
-- mendapat angka yang sama.
-- ------------------------------------------------------------
create or replace function ambil_urutan(p_jenis_id bigint, p_tahun integer)
returns integer
language plpgsql
security definer
set search_path = public
as $urut$
declare
    hasil integer;
begin
    insert into nomor_urut (jenis_id, tahun, urutan_terakhir)
    values (p_jenis_id, p_tahun, 1)
    on conflict (jenis_id, tahun)
    do update set urutan_terakhir = nomor_urut.urutan_terakhir + 1
    returning urutan_terakhir into hasil;

    return hasil;
end
$urut$;


-- ------------------------------------------------------------
-- (5) Menyusun nomor lengkap dari potongan-potongannya.
-- ------------------------------------------------------------
create or replace function susun_nomor(p_jenis_id bigint, p_tahun integer, p_urutan integer)
returns text
language plpgsql
stable
security definer
set search_path = public
as $susun$
declare
    v_kode_unit text;
    v_sufiks    text;
    v_kode_rs   text;
    v_panjang   integer;
begin
    select j.kode_unit, j.sufiks into v_kode_unit, v_sufiks
      from jenis_dokumen j where j.id = p_jenis_id;

    if v_kode_unit is null then
        raise exception 'Jenis dokumen dengan id % tidak ada', p_jenis_id;
    end if;

    select p.kode_rs, p.panjang_urutan into v_kode_rs, v_panjang
      from pengaturan_sistem p where p.id = 1;

    -- 001/PUR-B0004/2026-S3  atau  001/PUR-B0017/2026-S3
    return lpad(p_urutan::text, v_panjang, '0')
           || '/' || v_kode_rs || '-' || v_kode_unit
           || '/' || p_tahun::text
           || coalesce('-' || v_sufiks, '');
end
$susun$;


-- ------------------------------------------------------------
-- (6) Mengisi nomor otomatis saat baris disimpan.
--
-- Kalau urutan sudah ditentukan sendiri (dipakai saat memasukkan
-- data nomor lama dari Excel), urutan itu dihormati dan hitungan
-- tidak ikut bertambah. Setelah data lama masuk, jalankan
-- sesuaikan_hitungan() supaya nomor berikutnya melanjutkan.
-- ------------------------------------------------------------
create or replace function isi_nomor()
returns trigger
language plpgsql
security definer
set search_path = public
as $isi$
begin
    new.tahun := coalesce(new.tahun, extract(year from coalesce(new.tanggal_surat, current_date))::integer);

    if new.urutan is null then
        new.urutan := ambil_urutan(new.jenis_id, new.tahun);
    end if;

    if new.nomor_lengkap is null or btrim(new.nomor_lengkap) = '' then
        new.nomor_lengkap := susun_nomor(new.jenis_id, new.tahun, new.urutan);
    end if;

    return new;
end
$isi$;

drop trigger if exists trg_isi_nomor on nomor;

create trigger trg_isi_nomor
    before insert on nomor
    for each row
    execute function isi_nomor();


-- ------------------------------------------------------------
-- (7) Menyesuaikan hitungan dengan isi buku nomor.
--
-- Dipakai setelah memasukkan nomor lama: hitungan diangkat ke
-- urutan tertinggi yang sudah ada, supaya nomor berikutnya
-- melanjutkan deret, bukan mengulang dari 001.
-- ------------------------------------------------------------
create or replace function sesuaikan_hitungan()
returns text
language plpgsql
security definer
set search_path = public
as $sesuai$
declare
    v_baris integer := 0;
begin
    if peran_saya() <> 'Admin' then
        raise exception 'Hanya Admin yang boleh menyesuaikan hitungan nomor';
    end if;

    insert into nomor_urut (jenis_id, tahun, urutan_terakhir)
    select n.jenis_id, n.tahun, max(n.urutan)
      from nomor n
     group by n.jenis_id, n.tahun
    on conflict (jenis_id, tahun)
    do update set urutan_terakhir = greatest(nomor_urut.urutan_terakhir, excluded.urutan_terakhir);

    get diagnostics v_baris = row_count;

    return format('Hitungan disesuaikan untuk %s deret.', v_baris);
end
$sesuai$;


-- ------------------------------------------------------------
-- (8) Membatalkan nomor. Bukan menghapus.
-- ------------------------------------------------------------
create or replace function batalkan_nomor(p_nomor_id bigint, p_alasan text)
returns text
language plpgsql
security definer
set search_path = public
as $batal$
declare
    v_baris  nomor%rowtype;
    v_saya   bigint := id_saya();
    v_peran  text   := peran_saya();
begin
    select * into v_baris from nomor where id = p_nomor_id;

    if not found then
        raise exception 'Nomor tidak ditemukan';
    end if;

    if v_peran <> 'Admin' and v_baris.diambil_oleh is distinct from v_saya then
        raise exception 'Nomor ini diambil orang lain. Hanya Admin yang bisa membatalkannya.';
    end if;

    if v_baris.status = 'Batal' then
        return format('Nomor %s memang sudah berstatus Batal.', v_baris.nomor_lengkap);
    end if;

    if p_alasan is null or btrim(p_alasan) = '' then
        raise exception 'Alasan pembatalan harus diisi';
    end if;

    update nomor
       set status       = 'Batal',
           alasan_batal = btrim(p_alasan),
           diubah_pada  = now()
     where id = p_nomor_id;

    insert into riwayat_nomor (nomor_id, pengguna_id, aksi, sebelum, sesudah)
    values (p_nomor_id, v_saya, 'Batal',
            jsonb_build_object('status', v_baris.status),
            jsonb_build_object('status', 'Batal', 'alasan', btrim(p_alasan)));

    return format('Nomor %s ditandai Batal. Nomornya tetap tercatat dan tidak diberikan ke orang lain.',
                  v_baris.nomor_lengkap);
end
$batal$;


-- ------------------------------------------------------------
-- (9) Melihat nomor berikutnya tanpa mengambilnya.
--
-- Hanya membaca — hitungan tidak ikut bertambah, jadi aman
-- ditampilkan di layar Ambil Nomor sebagai ancar-ancar.
-- ------------------------------------------------------------
create or replace function pratinjau_nomor(p_jenis_id bigint, p_tahun integer default null)
returns text
language plpgsql
stable
security definer
set search_path = public
as $pratinjau$
declare
    v_tahun integer := coalesce(p_tahun, extract(year from current_date)::integer);
    v_urut  integer;
begin
    select coalesce(u.urutan_terakhir, 0) + 1 into v_urut
      from (select 1) x
      left join nomor_urut u
             on u.jenis_id = p_jenis_id and u.tahun = v_tahun;

    return susun_nomor(p_jenis_id, v_tahun, coalesce(v_urut, 1));
end
$pratinjau$;


grant execute on function susun_nomor(bigint, integer, integer) to authenticated;
grant execute on function pratinjau_nomor(bigint, integer)      to authenticated;
grant execute on function batalkan_nomor(bigint, text)          to authenticated;
grant execute on function sesuaikan_hitungan()                  to authenticated;


-- ============================================================
-- CEK — memperlihatkan nomor yang AKAN keluar untuk tiap jenis.
-- Hanya membaca: nomor asli pertama tetap mulai dari 001.
-- ============================================================
select j.nama, pratinjau_nomor(j.id) as nomor_berikutnya
  from jenis_dokumen j
 where j.aktif
 order by j.urutan_tampil;
