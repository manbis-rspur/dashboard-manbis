-- ============================================================
-- 31. HARI KERJA PERAN BERJALAN, DAN IZIN PAPAN YANG KETAT
--
-- Dua perbaikan.
--
-- (A) Selama ini Admin sistem menembus semua izin modul, termasuk
--     'tugas_unit'. Untuk modul lain itu memang disengaja. Untuk
--     tugas ia salah: yang berhak menitipkan pekerjaan dan melihat
--     daftar pekerjaan seluruh anggota adalah Koordinator, dan
--     Admin sistem kebetulan orang lain. Daftar tugas seseorang
--     bukan data yang pantas terbuka hanya karena seseorang
--     memegang kunci teknis.
--
-- (B) Peran yang berjalan terus sering punya iramanya sendiri:
--     update jadwal dokter tiap Senin sampai Jumat sore dan Minggu
--     sore. Tanpa tempat menuliskan harinya, irama itu cuma ada di
--     kepala — dan yang cuma ada di kepala itulah yang terlupa.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================


-- ------------------------------------------------------------
-- (A) Izin yang benar-benar diberikan, bukan yang ditembus.
--
-- boleh_akses() tetap apa adanya untuk modul lain — mencabutnya di
-- sana akan mengunci Admin dari pemulihan saat ada yang keliru.
-- Yang dibuat di sini pemeriksaan kedua yang lebih ketat, khusus
-- untuk hal yang memang tidak boleh ditembus siapa pun.
-- ------------------------------------------------------------
create or replace function punya_izin(p_modul text)
returns boolean
language sql
stable
security definer
set search_path = public
as $punya$
    select exists (
        select 1
          from pengguna p
          join akses_modul a on a.pengguna_id = p.id
         where p.auth_user_id = auth.uid()
           and p.aktif
           and a.modul = p_modul
    );
$punya$;

grant execute on function punya_izin(text) to authenticated;

drop policy if exists tugas_baca on tugas;
create policy tugas_baca on tugas
    for select to authenticated
    using (untuk = id_saya() or punya_izin('tugas_unit'));

drop policy if exists tugas_tambah on tugas;
create policy tugas_tambah on tugas
    for insert to authenticated
    with check (
        dibuat_oleh = id_saya()
        and (untuk = id_saya() or punya_izin('tugas_unit'))
    );

drop policy if exists tugas_ubah on tugas;
create policy tugas_ubah on tugas
    for update to authenticated
    using (untuk = id_saya() or punya_izin('tugas_unit'))
    with check (untuk = id_saya() or punya_izin('tugas_unit'));

drop policy if exists tugas_hapus on tugas;
create policy tugas_hapus on tugas
    for delete to authenticated
    using (untuk = id_saya() or punya_izin('tugas_unit'));

-- Lampiran mengikuti tugas induknya, jadi cukup satu tempat diubah.
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
           and (t.untuk = id_saya() or punya_izin('tugas_unit'))
    );
$boleh$;


-- ------------------------------------------------------------
-- (B) Hari kerja peran berjalan.
--
-- Disimpan sebagai larik angka hari menurut ISO: 1 Senin sampai
-- 7 Minggu. Bukan tujuh kolom boolean, dan bukan tulisan dipisah
-- koma — larik angka bisa ditanyai langsung oleh database nanti,
-- saat pengingat pagi lewat Telegram perlu tahu siapa mengerjakan
-- apa hari ini.
--
-- 'terakhir_dikerjakan' menyimpan tanggal terakhir peran itu
-- ditandai sudah dikerjakan. Dari situ ia tahu harus muncul hari
-- ini atau tidak — tanpa perlu membuat baris tugas baru tiap hari
-- yang akhirnya menumpuk ribuan.
-- ------------------------------------------------------------
alter table tugas
    add column if not exists hari smallint[],
    add column if not exists terakhir_dikerjakan date;

alter table tugas drop constraint if exists tugas_hari_wajar;
alter table tugas add constraint tugas_hari_wajar
    check (
        hari is null
        or (array_length(hari, 1) between 1 and 7
            and hari <@ array[1,2,3,4,5,6,7]::smallint[])
    );

-- Hari hanya bermakna bagi peran yang berjalan terus. Tugas yang
-- punya garis selesai sudah punya tenggat, dan memberinya hari
-- kerja berulang cuma membingungkan.
alter table tugas drop constraint if exists tugas_hari_hanya_berjalan;
alter table tugas add constraint tugas_hari_hanya_berjalan
    check (hari is null or jenis = 'Berjalan');


-- ============================================================
-- CEK
-- ============================================================
select p.nama, p.jabatan, p.peran,
       case when exists (select 1 from akses_modul a
                          where a.pengguna_id = p.id and a.modul = 'tugas_unit')
            then 'boleh menitipkan tugas dan melihat papan unit'
            else 'hanya tugasnya sendiri' end as wewenang_tugas
  from pengguna p order by p.id;
