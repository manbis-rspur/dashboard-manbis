-- ============================================================
-- 20. REVISI BERUPA BERKAS
--
-- Alurnya: Humas mengunggah naskah Word, Koordinator mengunduhnya,
-- memperbaiki di Word, lalu mengunggah kembali sebagai revisi.
--
-- Aturan pokoknya: unggahan revisi TIDAK menimpa yang lama. Tiap
-- unggahan menjadi versi tersendiri, sehingga naskah asli tetap
-- ada dan terlihat siapa mengubah apa. Menimpa berarti kehilangan
-- kemampuan memeriksa apa yang berubah — dan ini dokumen yang akan
-- terbit atas nama rumah sakit.
--
-- Tabel revisi yang sudah ada diperluas supaya bisa menampung
-- berkas, bukan hanya teks. Dengan begitu dua jalur kerja —
-- dokumen teks yang disunting di tempat, dan berkas Word yang
-- diunggah ulang — memakai riwayat yang sama.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Revisi boleh berupa berkas.
-- ------------------------------------------------------------
alter table publikasi_revisi
    add column if not exists berkas_jalur  text,
    add column if not exists berkas_nama   text,
    add column if not exists berkas_ukuran integer;

alter table publikasi_revisi alter column isi drop not null;

alter table publikasi_revisi drop constraint if exists revisi_ada_isinya;
alter table publikasi_revisi add constraint revisi_ada_isinya
    check (isi is not null or berkas_jalur is not null);


-- ------------------------------------------------------------
-- (2) Nomor versi.
--
-- Dihitung dan disimpan, bukan dihitung ulang tiap kali dibaca:
-- nomor versi ikut disebut dalam percakapan sehari-hari, dan tidak
-- boleh berubah gara-gara ada baris yang tersisip belakangan.
-- ------------------------------------------------------------
alter table publikasi_revisi
    add column if not exists versi integer;

-- Mengisi nomor untuk revisi yang sudah terlanjur ada.
with urut as (
    select id, row_number() over (partition by publikasi_id order by pada) as n
      from publikasi_revisi
)
update publikasi_revisi r
   set versi = urut.n
  from urut
 where urut.id = r.id and r.versi is null;


create or replace function isi_versi_revisi()
returns trigger
language plpgsql
as $versi$
begin
    if new.versi is null then
        select coalesce(max(versi), 0) + 1 into new.versi
          from publikasi_revisi
         where publikasi_id = new.publikasi_id;
    end if;
    return new;
end
$versi$;

drop trigger if exists trg_versi_revisi on publikasi_revisi;
create trigger trg_versi_revisi
    before insert on publikasi_revisi
    for each row execute function isi_versi_revisi();


-- ------------------------------------------------------------
-- (3) Menandai versi pertama untuk berkas yang sudah diunggah
--     sebelum riwayat versi ini ada, supaya daftarnya tidak
--     terlihat kosong.
-- ------------------------------------------------------------
insert into publikasi_revisi (publikasi_id, berkas_jalur, berkas_nama, berkas_ukuran, catatan, oleh, pada, versi)
select p.id, p.berkas_jalur, p.berkas_nama, p.berkas_ukuran,
       'Naskah pertama', p.diunggah_oleh, p.diunggah_pada, 1
  from publikasi p
 where p.berkas_jalur is not null
   and not exists (select 1 from publikasi_revisi r where r.publikasi_id = p.id);


-- ============================================================
-- CEK — dokumen beserta jumlah versinya.
-- ============================================================
select p.id, p.judul,
       case when p.isi is not null then 'teks' else 'berkas' end as bentuk,
       count(r.id) as jumlah_versi
  from publikasi p
  left join publikasi_revisi r on r.publikasi_id = p.id
 group by p.id, p.judul, p.isi
 order by p.id;
