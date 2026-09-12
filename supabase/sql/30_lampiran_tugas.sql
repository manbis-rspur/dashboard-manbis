-- ============================================================
-- 30. LAMPIRAN HASIL PEKERJAAN
--
-- Supaya Koordinator bisa melihat hasilnya, bukan cuma membaca kata
-- "selesai".
--
-- Dua bentuk, sengaja dibedakan:
--
--   Berkas  — desain leaflet, spanduk, roll banner, PDF brosur,
--             tangkapan layar. Ringan, dan memang perlu disimpan
--             rumah sakit.
--
--   Tautan  — video reels dan hasil yang sudah tayang di tempat
--             lain. Video satu menit berukuran puluhan megabita;
--             sepuluh saja sudah memakan separuh jatah penyimpanan
--             gratis, dan yang ikut macet saat penuh bukan cuma
--             tugas melainkan arsip publikasi dan template komplain
--             yang menumpang penyimpanan yang sama.
--
-- Keduanya tidak wajib. Wadahnya ada, kosong pun tidak apa-apa.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

create table if not exists tugas_lampiran (
    id            bigserial primary key,
    tugas_id      bigint not null references tugas(id) on delete cascade,
    jenis         text   not null,
    judul         text,
    berkas_jalur  text,
    berkas_nama   text,
    berkas_ukuran integer,
    tautan        text,
    oleh          bigint not null references pengguna(id),
    pada          timestamptz not null default now(),

    constraint lampiran_jenis_check check (jenis in ('Berkas','Tautan')),

    -- Tiap bentuk harus lengkap menurut bentuknya sendiri. Tanpa
    -- syarat ini, sebuah baris bisa tersimpan tanpa isi apa pun dan
    -- yang membukanya tidak menemukan apa-apa.
    constraint lampiran_berkas_lengkap check (
        jenis <> 'Berkas'
        or (berkas_jalur is not null and berkas_nama is not null and tautan is null)
    ),
    constraint lampiran_tautan_lengkap check (
        jenis <> 'Tautan'
        or (tautan ~* '^https://' and berkas_jalur is null)
    )
);

create index if not exists idx_lampiran_tugas on tugas_lampiran(tugas_id, pada desc);

alter table tugas_lampiran enable row level security;


-- ------------------------------------------------------------
-- Siapa boleh apa.
--
-- Persis mengikuti tugas induknya: yang boleh membaca tugasnya boleh
-- membaca lampirannya. Aturannya tidak ditulis ulang di sini —
-- ditanyakan kembali ke tabel tugas — supaya keduanya tidak mungkin
-- berbeda pendapat suatu hari nanti.
-- ------------------------------------------------------------
create or replace function boleh_lihat_tugas(p_tugas_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $boleh$
    select exists (
        select 1 from tugas t
         where t.id = p_tugas_id
           and (t.untuk = id_saya() or boleh_akses('tugas_unit'))
    );
$boleh$;

grant execute on function boleh_lihat_tugas(bigint) to authenticated;

drop policy if exists lampiran_baca on tugas_lampiran;
create policy lampiran_baca on tugas_lampiran
    for select to authenticated using (boleh_lihat_tugas(tugas_id));

drop policy if exists lampiran_tambah on tugas_lampiran;
create policy lampiran_tambah on tugas_lampiran
    for insert to authenticated
    with check (boleh_lihat_tugas(tugas_id) and oleh = id_saya());

drop policy if exists lampiran_hapus on tugas_lampiran;
create policy lampiran_hapus on tugas_lampiran
    for delete to authenticated using (boleh_lihat_tugas(tugas_id));


-- ============================================================
-- CEK
-- ============================================================
select t.judul,
       count(*) filter (where l.jenis = 'Berkas') as berkas,
       count(*) filter (where l.jenis = 'Tautan') as tautan
  from tugas t
  left join tugas_lampiran l on l.tugas_id = t.id
 group by t.id, t.judul
 order by t.id;
