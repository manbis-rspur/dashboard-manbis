-- ============================================================
-- 38. DRAF BERSAMA HUMAS DAN DIGITAL MARKETING
--
-- Tempat menggarap dokumen berdua sebelum layak dikirim ke
-- Koordinator. Selama ini koordinasinya lewat WhatsApp dan berkas
-- saling kirim — yang berarti tidak ada satu pun tempat yang tahu
-- versi mana yang terbaru, dan apa yang sudah disepakati.
--
-- Hanya pemegang izin 'humas' yang bisa melihatnya: Humas dan
-- Digital Marketing. Koordinator sengaja tidak, walaupun beliau
-- Koordinator — draf yang bisa dilihat atasan berhenti jadi draf,
-- dan orang mulai menahan diri menaruh yang setengah jadi. Beliau
-- melihatnya nanti di Arsip Publikasi, saat memang sudah dikirim.
--
-- Diperiksa dengan punya_izin(), bukan boleh_akses(): yang kedua
-- bisa ditembus Admin sistem, dan peran Admin suatu saat bisa
-- berpindah ke orang yang tidak seharusnya membaca draf.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Draf.
-- ------------------------------------------------------------
create table if not exists draf (
    id            bigserial primary key,
    judul         text   not null,
    keterangan    text,
    jenis         text   not null default 'Lainnya',
    status        text   not null default 'Digarap',

    berkas_jalur  text,
    berkas_nama   text,
    berkas_ukuran integer,
    tautan        text,

    -- Terisi begitu draf ini dikirim ke Arsip Publikasi. Dari situ
    -- ketahuan mana yang sudah naik dan mana yang masih di meja.
    publikasi_id  bigint references publikasi(id) on delete set null,
    dikirim_pada  timestamptz,

    dibuat_oleh   bigint not null references pengguna(id),
    dibuat_pada   timestamptz not null default now(),
    diubah_pada   timestamptz,

    constraint draf_judul_ada check (btrim(judul) <> ''),
    constraint draf_status_check
        check (status in ('Digarap', 'Minta ditinjau', 'Siap kirim', 'Terkirim')),
    constraint draf_tautan_aman check (tautan is null or tautan ~* '^https://'),
    constraint draf_ada_isinya check (berkas_jalur is not null or tautan is not null),
    constraint draf_berkas_lengkap check ((berkas_jalur is null) = (berkas_nama is null))
);

create index if not exists idx_draf_status on draf(status, dibuat_pada desc);

alter table draf enable row level security;


-- ------------------------------------------------------------
-- (2) Revisi berkas.
--
-- Yang lama tidak ditimpa. Dua orang menggarap satu dokumen, dan
-- tanpa riwayat tidak ada cara mengetahui apa yang berubah di
-- langkah mana — atau mengambil kembali versi yang ternyata lebih
-- baik.
-- ------------------------------------------------------------
create table if not exists draf_revisi (
    id            bigserial primary key,
    draf_id       bigint not null references draf(id) on delete cascade,
    versi         integer not null,
    berkas_jalur  text   not null,
    berkas_nama   text   not null,
    berkas_ukuran integer,
    catatan       text,
    oleh          bigint not null references pengguna(id),
    pada          timestamptz not null default now(),

    constraint draf_revisi_unik unique (draf_id, versi)
);

create index if not exists idx_draf_revisi on draf_revisi(draf_id, versi desc);

alter table draf_revisi enable row level security;


-- ------------------------------------------------------------
-- (3) Percakapan.
--
-- Bertumpuk, bukan satu kotak yang ditimpa. Koordinasi yang
-- ditimpa kehilangan alasan di balik keputusannya, dan sebulan
-- kemudian tidak ada yang ingat kenapa bagian itu diubah.
-- ------------------------------------------------------------
create table if not exists draf_komentar (
    id      bigserial primary key,
    draf_id bigint not null references draf(id) on delete cascade,
    isi     text   not null,
    oleh    bigint not null references pengguna(id),
    pada    timestamptz not null default now(),

    constraint draf_komentar_ada check (btrim(isi) <> '')
);

create index if not exists idx_draf_komentar on draf_komentar(draf_id, pada);

alter table draf_komentar enable row level security;


-- ------------------------------------------------------------
-- (4) Siapa boleh apa.
-- ------------------------------------------------------------
drop policy if exists draf_lihat on draf;
create policy draf_lihat on draf
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));

drop policy if exists draf_revisi_lihat on draf_revisi;
create policy draf_revisi_lihat on draf_revisi
    for all to authenticated
    using (punya_izin('humas')) with check (punya_izin('humas'));

drop policy if exists draf_komentar_lihat on draf_komentar;
create policy draf_komentar_lihat on draf_komentar
    for select to authenticated using (punya_izin('humas'));

drop policy if exists draf_komentar_tulis on draf_komentar;
create policy draf_komentar_tulis on draf_komentar
    for insert to authenticated
    with check (punya_izin('humas') and oleh = id_saya());

-- Komentar tidak bisa disunting maupun dihapus. Percakapan kerja
-- yang bisa diubah belakangan berhenti bisa dijadikan pegangan.


-- ------------------------------------------------------------
-- (5) Nomor versi diberikan database.
--
-- Dihitung aplikasi, dua unggahan berbarengan bisa mendapat nomor
-- yang sama — dan dua orang menggarap satu dokumen memang keadaan
-- yang membuat itu mungkin terjadi.
-- ------------------------------------------------------------
create or replace function isi_versi_draf()
returns trigger
language plpgsql
as $versi$
begin
    if new.versi is null or new.versi = 0 then
        select coalesce(max(versi), 0) + 1 into new.versi
          from draf_revisi where draf_id = new.draf_id;
    end if;
    return new;
end
$versi$;

drop trigger if exists trg_versi_draf on draf_revisi;
create trigger trg_versi_draf
    before insert on draf_revisi
    for each row execute function isi_versi_draf();


-- ------------------------------------------------------------
-- (6) Mengirim draf ke Arsip Publikasi.
--
-- Berkasnya tidak disalin, hanya ditunjuk: satu berkas, dua
-- catatan. Menyalinnya berarti dua salinan yang bisa berbeda, dan
-- yang membuka dari arsip belum tentu mendapat yang terbaru.
-- ------------------------------------------------------------
create or replace function kirim_draf_ke_arsip(p_draf_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $kirim$
declare
    v_saya bigint := id_saya();
    v_d    draf%rowtype;
    v_id   bigint;
begin
    if not punya_izin('humas') then
        raise exception 'Anda tidak berhak mengirim draf ke arsip';
    end if;

    select * into v_d from draf where id = p_draf_id;
    if not found then raise exception 'Draf tidak ditemukan'; end if;
    if v_d.publikasi_id is not null then
        raise exception 'Draf ini sudah pernah dikirim ke arsip';
    end if;

    -- Arsip Publikasi mensyaratkan berkas. Draf yang isinya cuma
    -- tautan Drive tidak bisa naik ke sana, dan kalau dibiarkan,
    -- yang muncul adalah galat database yang tidak terbaca orang.
    if v_d.berkas_jalur is null then
        raise exception 'Draf ini belum ada berkasnya — unggah dulu berkas revisinya sebelum dikirim ke arsip';
    end if;

    insert into publikasi (judul, jenis, keterangan, berkas_jalur, berkas_nama,
                           berkas_ukuran, tautan_docs, diunggah_oleh)
    values (v_d.judul, v_d.jenis, v_d.keterangan, v_d.berkas_jalur, v_d.berkas_nama,
            v_d.berkas_ukuran, v_d.tautan, v_saya)
    returning id into v_id;

    update draf
       set publikasi_id = v_id,
           status       = 'Terkirim',
           dikirim_pada = now(),
           diubah_pada  = now()
     where id = p_draf_id;

    return v_id;
end
$kirim$;

grant execute on function kirim_draf_ke_arsip(bigint) to authenticated;


-- ============================================================
-- CEK
-- ============================================================
select p.nama, p.jabatan,
       case when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'humas')
            then 'bisa membuka Draf Bersama'
            else '-' end as draf
  from pengguna p order by p.id;
