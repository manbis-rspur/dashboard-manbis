-- ============================================================
-- 27. LAPORAN YANG SUDAH DISETUJUI TERBUKA UNTUK HUMAS
--
-- Sampai sekarang laporan media sosial tertutup rapat untuk
-- Digital Marketing saja. Itu benar selama laporannya masih
-- disusun — angka setengah jadi dan catatan mentah tidak perlu
-- dibaca siapa-siapa.
--
-- Tapi begitu Koordinator menyetujuinya, sifatnya berubah: ia
-- bukan lagi berkas kerja seseorang, melainkan dokumen unit. Dan
-- justru di situlah gunanya buat Humas — bagian evaluasi dan
-- rencana kerja bulan depan adalah bahan mentah paling jujur untuk
-- menyusun kalender konten bulan berikutnya. Selama ini bahan itu
-- menganggur.
--
-- Jadi batasnya digeser, bukan dibuka lebar: yang masih disusun
-- tetap milik Digital Marketing, yang sudah disetujui boleh dibaca
-- Humas. Menulis dan mengubah tetap hanya Digital Marketing.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (1) Sambungan antara laporan dan barisnya di arsip.
--
-- Tanpa sambungan ini, persetujuan Koordinator berhenti di arsip
-- dan tidak pernah sampai kembali ke laporannya — dokumen yang
-- diunggah manual tidak membawa keterangan asal-usulnya.
-- ------------------------------------------------------------
alter table publikasi
    add column if not exists laporan_id bigint references laporan_sosmed(id) on delete set null;

create unique index if not exists idx_publikasi_laporan
    on publikasi(laporan_id) where laporan_id is not null;

alter table laporan_sosmed
    add column if not exists disetujui_pada timestamptz,
    add column if not exists disetujui_oleh bigint references pengguna(id);


-- ------------------------------------------------------------
-- (2) Persetujuan mengalir balik ke laporannya.
--
-- Lewat pemicu, bukan lewat aplikasi: Koordinator tidak punya hak
-- menulis ke tabel laporan, dan memang tidak seharusnya diberi.
-- Yang boleh berubah cuma penanda persetujuannya.
--
-- Ditarik lagi kalau putusannya dicabut — persetujuan yang sudah
-- terlanjur membuka pintu harus bisa ditutup kembali.
-- ------------------------------------------------------------
create or replace function tandai_laporan_disetujui()
returns trigger
language plpgsql
security definer
set search_path = public
as $tandai$
begin
    if new.laporan_id is null then
        return new;
    end if;

    if new.status_tinjauan = 'Disetujui'
       and old.status_tinjauan is distinct from 'Disetujui' then
        update laporan_sosmed
           set disetujui_pada = now(),
               disetujui_oleh = new.ditinjau_oleh
         where id = new.laporan_id;

    elsif new.status_tinjauan <> 'Disetujui'
       and old.status_tinjauan = 'Disetujui' then
        update laporan_sosmed
           set disetujui_pada = null,
               disetujui_oleh = null
         where id = new.laporan_id;
    end if;

    return new;
end
$tandai$;

drop trigger if exists trg_laporan_disetujui on publikasi;

create trigger trg_laporan_disetujui
    after update on publikasi
    for each row execute function tandai_laporan_disetujui();


-- ------------------------------------------------------------
-- (3) Humas boleh membaca yang sudah disetujui.
--
-- Menulis tidak ikut dibuka: kebijakan tulis di berkas 23 tetap
-- berlaku apa adanya, hanya kebijakan bacanya yang diganti.
-- ------------------------------------------------------------
drop policy if exists laporan_baca on laporan_sosmed;
create policy laporan_baca on laporan_sosmed
    for select to authenticated
    using (
        boleh_akses('sosmed')
        or (disetujui_pada is not null and boleh_akses('humas'))
    );

drop policy if exists konten_baca on laporan_konten;
create policy konten_baca on laporan_konten
    for select to authenticated
    using (
        boleh_akses('sosmed')
        or (
            boleh_akses('humas')
            and exists (
                select 1 from laporan_sosmed l
                 where l.id = laporan_konten.laporan_id
                   and l.disetujui_pada is not null
            )
        )
    );


-- ------------------------------------------------------------
-- (4) Mengirim laporan ke arsip berikut sambungannya.
--
-- Dibedakan dari kirim_ke_arsip biasa karena yang ini harus
-- mencatat laporan asalnya — itulah yang membuat persetujuan bisa
-- pulang. Dikirim ulang tidak menggandakan barisnya: isinya
-- diperbarui, putusan lama dinolkan, dan naskah sebelumnya tetap
-- tersimpan sebagai revisi.
-- ------------------------------------------------------------
create or replace function kirim_laporan_ke_arsip(
    p_laporan_id bigint,
    p_keterangan text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $kirim$
declare
    v_saya  bigint := id_saya();
    v_l     laporan_sosmed%rowtype;
    v_id    bigint;
    v_judul text;
    v_bulan text[] := array['Januari','Februari','Maret','April','Mei','Juni',
                            'Juli','Agustus','September','Oktober','November','Desember'];
begin
    if not boleh_akses('sosmed') then
        raise exception 'Hanya Digital Marketing yang bisa mengirim laporan ini';
    end if;

    select * into v_l from laporan_sosmed where id = p_laporan_id;

    if not found then
        raise exception 'Laporannya tidak ditemukan';
    end if;

    if v_l.hasil is null or btrim(v_l.hasil) = '' then
        raise exception 'Naskah laporannya belum disusun';
    end if;

    v_judul := 'Laporan Media Sosial ' || v_bulan[v_l.bulan] || ' ' || v_l.tahun;

    select id into v_id from publikasi where laporan_id = p_laporan_id;

    if v_id is null then
        insert into publikasi (judul, jenis, keterangan, isi, tenggat,
                               laporan_id, diunggah_oleh)
        values (v_judul, 'Laporan Media Sosial',
                nullif(btrim(coalesce(p_keterangan, '')), ''),
                v_l.hasil, v_l.tenggat, p_laporan_id, v_saya)
        returning id into v_id;

        insert into publikasi_revisi (publikasi_id, isi, catatan, oleh)
        values (v_id, v_l.hasil, 'Naskah pertama', v_saya);
    else
        update publikasi
           set isi              = v_l.hasil,
               tenggat          = coalesce(v_l.tenggat, tenggat),
               status_tinjauan  = 'Menunggu',
               catatan_tinjauan = null,
               ditinjau_oleh    = null,
               ditinjau_pada    = null,
               diubah_oleh      = v_saya,
               diubah_pada      = now()
         where id = v_id;

        insert into publikasi_revisi (publikasi_id, isi, catatan, oleh)
        values (v_id, v_l.hasil, 'Dikirim ulang dari dashboard Humas', v_saya);
    end if;

    return v_id;
end
$kirim$;

grant execute on function kirim_laporan_ke_arsip(bigint, text) to authenticated;


-- ------------------------------------------------------------
-- (5) Kalender konten bisa berpijak pada evaluasi bulan lalu.
--
-- Satu isian baru pada modul Kalender Konten. Ditambahkan hanya
-- bila belum ada, dan pola perintahnya hanya disambung bila belum
-- menyebut {{evaluasi}} — supaya perubahan yang dilakukan sendiri
-- lewat menu Sunting Modul tidak tertimpa.
-- ------------------------------------------------------------
update modul_ai
   set kolom = kolom || jsonb_build_array(jsonb_build_object(
           'kunci',    'evaluasi',
           'label',    'Evaluasi Bulan Lalu',
           'jenis',    'textarea',
           'petunjuk', 'Kesimpulan laporan media sosial bulan sebelumnya. Terisi sendiri bila kalender ini dibuka dari laporan yang sudah disetujui Koordinator.'
       ))
 where judul ilike '%kalender konten%'
   and not (kolom @> '[{"kunci":"evaluasi"}]'::jsonb);

update modul_ai
   set pola_perintah = pola_perintah || E'\n\nEvaluasi bulan sebelumnya:\n{{evaluasi}}\n\n'
        || 'Bila evaluasi di atas berisi keterangan, jadikan ia pijakan: pertahankan yang terbukti berhasil, '
        || 'perbaiki yang lemah, dan sebutkan secara terang kaitan tiap usulan dengan temuan itu. '
        || 'Bila evaluasinya kosong atau bertanda hubung, susun kalender seperti biasa tanpa menyinggung evaluasi.'
 where judul ilike '%kalender konten%'
   and pola_perintah not like '%{{evaluasi}}%';


-- ============================================================
-- CEK
-- ============================================================
select l.id, l.bulan, l.tahun,
       case when l.disetujui_pada is null then 'belum disetujui'
            else 'disetujui — terbuka untuk Humas' end as keadaan,
       coalesce(p.judul, '(belum dikirim ke arsip)') as di_arsip
  from laporan_sosmed l
  left join publikasi p on p.laporan_id = l.id
 order by l.tahun desc, l.bulan desc;
